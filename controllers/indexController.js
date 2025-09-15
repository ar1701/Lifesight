const File = require("../models/file");
const Widget = require("../models/widget");
const Dashboard = require("../models/dashboard");
const fs = require("fs");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const path = require("path");
const genAI = require("../config/gemini");
const {
  generateFallbackChart,
  generateFallbackTable,
} = require("../utils/chartGenerator");
require("dotenv").config();

const getHomepage = async (req, res) => {
  try {
    const files = await File.find({ user: req.user.id }).sort({
      uploadDate: -1,
    });

    // Get all dashboards for the user
    let dashboards = await Dashboard.find({ user: req.user.id }).sort({
      updatedAt: -1,
    });

    // If user has no dashboards, create a default one
    if (dashboards.length === 0) {
      const defaultDashboard = new Dashboard({
        name: "My Dashboard",
        description: "Default dashboard",
        user: req.user.id,
      });
      await defaultDashboard.save();
      dashboards = [defaultDashboard];
    }

    // Get widgets for the first dashboard (or all widgets if no specific dashboard)
    const widgets = await Widget.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.render("index-redesigned", {
      title: "SaleSight Dashboard",
      files: files,
      widgets: widgets,
      dashboards: dashboards,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data.");
  }
};

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Handle both disk storage (development) and memory storage (production)
  const fileData = {
    originalName: req.file.originalname,
    storageName: req.file.filename || `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    user: req.user.id,
    mimetype: req.file.mimetype,
  };

  // If file is stored in memory (production), save the buffer
  if (req.file.buffer) {
    fileData.fileData = req.file.buffer;
  } else {
    // If file is stored on disk (development), save the path
    fileData.filePath = req.file.path;
  }

  const newFile = new File(fileData);

  newFile
    .save()
    .then(() => res.redirect("/app"))
    .catch((err) => {
      console.error("Error saving file to database:", err);
      res.status(500).send("Error saving file metadata.");
    });
};

const previewFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      user: req.user.id,
    });
    if (!file) {
      return res.status(404).json({
        error: "File not found or you do not have permission to view it.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const fileExt = path.extname(file.originalName).toLowerCase();
    let allData = [];

    const processData = () => {
      const totalRows = allData.length;
      const totalPages = Math.ceil(totalRows / limit);

      const results = allData.slice(startIndex, endIndex);

      res.json({
        data: results,
        currentPage: page,
        totalPages: totalPages,
        totalRows: totalRows,
      });
    };

    if (fileExt === ".csv") {
      // Handle both disk storage and memory storage
      if (file.fileData) {
        // Memory storage (production)
        const csvString = file.fileData.toString('utf8');
        const lines = csvString.split('\n');
        const headers = lines[0].split(',');
        allData = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : '';
          });
          return obj;
        }).filter(row => Object.values(row).some(val => val !== ''));
        processData();
      } else {
        // Disk storage (development)
        const filePath = path.join(__dirname, "..", file.filePath);
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (data) => allData.push(data))
          .on("end", processData);
      }
    } else if (fileExt === ".xlsx" || fileExt === ".xls") {
      // Handle both disk storage and memory storage
      if (file.fileData) {
        // Memory storage (production)
        const workbook = xlsx.read(file.fileData);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        processData();
      } else {
        // Disk storage (development)
        const filePath = path.join(__dirname, "..", file.filePath);
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        processData();
      }
    } else {
      res.status(400).json({ error: "Unsupported file type for preview." });
    }
  } catch (err) {
    console.error("Error previewing file:", err);
    res.status(500).json({ error: "Error previewing file." });
  }
};

const generateInsight = async (req, res) => {
  const { prompt, fileId } = req.body;

  if (!prompt || !fileId) {
    return res.status(400).json({ error: "Prompt and fileId are required." });
  }

  try {
    const file = await File.findOne({ _id: fileId, user: req.user.id });
    if (!file) {
      return res.status(404).json({
        error: "File not found or you do not have permission to use it.",
      });
    }

    const fileExt = path.extname(file.originalName).toLowerCase();
    let fileContent = "";

    // Handle different file types
    if (fileExt === ".csv") {
      // Handle both disk storage and memory storage
      if (file.fileData) {
        // Memory storage (production)
        fileContent = file.fileData.toString('utf8');
      } else {
        // Disk storage (development)
        const filePath = path.join(__dirname, "..", file.filePath);
        fileContent = fs.readFileSync(filePath).toString();
      }
    } else if (fileExt === ".xlsx" || fileExt === ".xls") {
      // Handle both disk storage and memory storage
      let workbook;
      if (file.fileData) {
        // Memory storage (production)
        workbook = xlsx.read(file.fileData);
      } else {
        // Disk storage (development)
        const filePath = path.join(__dirname, "..", file.filePath);
        workbook = xlsx.readFile(filePath);
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // Convert to CSV-like format for AI processing
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        fileContent = headers.join(",") + "\n";
        fileContent += rows.map((row) => row.join(",")).join("\n");
      }
    } else {
      return res
        .status(400)
        .json({ error: "Unsupported file type for analysis." });
    }

    // Use gemini-1.5-flash which is more stable and less overloaded
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Limit file content to prevent overload - take only first 2000 characters
    const limitedFileContent =
      fileContent.length > 2000
        ? fileContent.substring(0, 2000) +
          "\n... (data truncated for performance)"
        : fileContent;

    const fullPrompt = `
            You are an expert data analyst. Generate a chart or table configuration based on the user's request and data.

            User Request: "${prompt}"

            Data (first 2000 chars):
            ---
            ${limitedFileContent}
            ---

            Rules:
            - For visualizations (chart, plot, graph, trends), respond with Chart.js JSON
            - For data requests (table, list, show data), respond with table JSON
            - Use ONLY the provided data sample
            - Respond with ONLY valid JSON, no explanations

            CHART format:
            {
              "type": "chart",
              "chartType": "bar|line|pie|doughnut",
              "config": {
                "type": "bar|line|pie|doughnut",
                "data": {
                  "labels": ["label1", "label2"],
                  "datasets": [{"label": "Data", "data": [1,2,3], "backgroundColor": ["#FF6384","#36A2EB"]}]
                },
                "options": {"responsive": true, "plugins": {"title": {"display": true, "text": "Chart Title"}}}
              }
            }

            TABLE format:
            {
              "type": "table",
              "data": {
                "headers": ["Header1", "Header2"],
                "rows": [["row1-col1", "row1-col2"], ["row2-col1", "row2-col2"]]
              }
            }

            If unable to process: {"type": "error", "message": "Could not generate response"}
        `;

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 15000, 30000]; // Longer delays for quota issues

    let result;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        result = await model.generateContent(fullPrompt);
        break;
      } catch (err) {
        console.warn(`Gemini API attempt ${i + 1} failed:`, err.message);

        // If it's a quota error, don't retry immediately
        if (
          err.status === 429 ||
          err.message.includes("quota") ||
          err.message.includes("RATE_LIMIT_EXCEEDED")
        ) {
          if (i < MAX_RETRIES - 1) {
            const delay = RETRY_DELAYS[i];
            console.warn(
              `Quota exceeded. Waiting ${delay / 1000}s before retry...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        } else if (i < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[i];
          console.warn(`Retrying in ${delay / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }

    if (!result) {
      throw new Error("Failed to generate content after all retries.");
    }

    const response = await result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\n/g, "").replace(/```/g, "");
    const aiResponse = JSON.parse(cleanedText);

    res.json(aiResponse);
  } catch (err) {
    console.error("Error generating insight:", err);

    // Provide specific error messages based on error type
    if (err.status === 503 || err.message.includes("overloaded")) {
      res.status(503).json({
        type: "error",
        message:
          "AI service is temporarily busy. Please try again in a few moments.",
      });
    } else if (
      err.status === 429 ||
      err.message.includes("quota") ||
      err.message.includes("RATE_LIMIT_EXCEEDED")
    ) {
      // Try fallback generation when quota is exceeded
      try {
        console.log(
          "Attempting fallback chart generation due to quota exceeded..."
        );
        const promptLower = prompt.toLowerCase();

        if (
          promptLower.includes("table") ||
          promptLower.includes("list") ||
          promptLower.includes("show data")
        ) {
          const fallbackResult = generateFallbackTable(limitedFileContent);
          return res.json(fallbackResult);
        } else {
          const fallbackResult = generateFallbackChart(
            limitedFileContent,
            prompt
          );
          return res.json(fallbackResult);
        }
      } catch (fallbackError) {
        console.error("Fallback generation failed:", fallbackError);
        res.status(429).json({
          type: "error",
          message:
            "API quota exceeded. Please wait a few minutes before trying again, or contact your administrator to increase the quota limit.",
        });
      }
    } else if (err.message.includes("JSON")) {
      res.status(500).json({
        type: "error",
        message:
          "Failed to parse AI response. Please try rephrasing your request.",
      });
    } else {
      res.status(500).json({
        type: "error",
        message:
          "Unable to process your request. Please check your data and try again.",
      });
    }
  }
};

const deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      user: req.user.id,
    });

    if (!file) {
      return res.status(404).json({
        error: "File not found or you do not have permission to delete it.",
      });
    }

    // Delete the physical file
    const filePath = path.join(__dirname, "..", file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await File.findByIdAndDelete(req.params.fileId);

    res.json({ message: "File deleted successfully." });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ error: "Failed to delete file." });
  }
};

const getDashboardsPage = async (req, res) => {
  try {
    const dashboards = await Dashboard.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .populate("user", "name email");

    res.render("dashboards-new", {
      title: "My Dashboards - SaleSight",
      dashboards,
    });
  } catch (err) {
    console.error("Error loading dashboards page:", err);
    res.status(500).render("error", {
      message: "Failed to load dashboards",
      error: err,
    });
  }
};

const getDashboardPage = async (req, res) => {
  try {
    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      user: req.user.id,
    });

    if (!dashboard) {
      return res.status(404).render("error", {
        message: "Dashboard not found",
        error: { status: 404 },
      });
    }

    const widgets = await Widget.find({
      dashboard: req.params.dashboardId,
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.render("dashboard-new", {
      title: `${dashboard.name} - SaleSight`,
      dashboard,
      widgets,
    });
  } catch (err) {
    console.error("Error loading dashboard page:", err);
    res.status(500).render("error", {
      message: "Failed to load dashboard",
      error: err,
    });
  }
};

const getMarketingDashboard = async (req, res) => {
  try {
    res.render("marketing-dashboard-restructured", {
      title: "Marketing Intelligence - SaleSight",
      user: req.user || null,
    });
  } catch (err) {
    console.error("Error loading marketing dashboard:", err);
    res.status(500).render("error", {
      message: "Failed to load marketing dashboard",
      error: err,
    });
  }
};

module.exports = {
  getHomepage,
  uploadFile,
  previewFile,
  generateInsight,
  deleteFile,
  getDashboardsPage,
  getDashboardPage,
  getMarketingDashboard,
};
