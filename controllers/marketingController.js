const MarketingCampaign = require("../models/marketingCampaign");
const BusinessMetrics = require("../models/businessMetrics");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Import marketing data from CSV files
const importMarketingData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear existing data for this user
    await MarketingCampaign.deleteMany({ user: userId });
    await BusinessMetrics.deleteMany({ user: userId });

    const datasourcePath = path.join(__dirname, "..", "Datasource");

    // Import Business Metrics
    await importBusinessMetrics(datasourcePath, userId);

    // Import Marketing Campaigns
    await importMarketingCampaigns(datasourcePath, userId);

    res.json({
      message: "Marketing data imported successfully",
      imported: {
        businessMetrics: await BusinessMetrics.countDocuments({ user: userId }),
        marketingCampaigns: await MarketingCampaign.countDocuments({
          user: userId,
        }),
      },
    });
  } catch (err) {
    console.error("Error importing marketing data:", err);
    res.status(500).json({ error: "Failed to import marketing data." });
  }
};

// Import business metrics from business.csv
async function importBusinessMetrics(datasourcePath, userId) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(path.join(datasourcePath, "business.csv"))
      .pipe(csv())
      .on("data", (data) => {
        results.push({
          date: new Date(data.date),
          totalOrders: parseInt(data["# of orders"]) || 0,
          newOrders: parseInt(data["# of new orders"]) || 0,
          newCustomers: parseInt(data["new customers"]) || 0,
          totalRevenue: parseFloat(data["total revenue"]) || 0,
          grossProfit: parseFloat(data["gross profit"]) || 0,
          cogs: parseFloat(data["COGS"]) || 0,
          user: userId,
        });
      })
      .on("end", async () => {
        try {
          await BusinessMetrics.insertMany(results);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}

// Import marketing campaigns from platform CSV files
async function importMarketingCampaigns(datasourcePath, userId) {
  const platforms = ["Facebook", "Google", "TikTok"];

  for (const platform of platforms) {
    await importPlatformData(datasourcePath, platform, userId);
  }
}

// Import data for a specific platform
async function importPlatformData(datasourcePath, platform, userId) {
  return new Promise((resolve, reject) => {
    const results = [];
    const filePath = path.join(datasourcePath, `${platform}.csv`);

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        results.push({
          date: new Date(data.date),
          platform: platform,
          tactic: data.tactic,
          state: data.state,
          campaign: data.campaign,
          impressions: parseInt(data.impression) || 0,
          clicks: parseInt(data.clicks) || 0,
          spend: parseFloat(data.spend) || 0,
          attributedRevenue: parseFloat(data["attributed revenue"]) || 0,
          user: userId,
        });
      })
      .on("end", async () => {
        try {
          await MarketingCampaign.insertMany(results);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}

// Get marketing analytics summary
const getMarketingAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, platform, groupBy } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Build query
    const query = { user: userId };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }
    if (platform) {
      query.platform = platform;
    }

    // Get marketing campaigns
    const campaigns = await MarketingCampaign.find(query).sort({ date: 1 });

    // Get business metrics
    const businessQuery = { user: userId };
    if (Object.keys(dateFilter).length > 0) {
      businessQuery.date = dateFilter;
    }
    const businessMetrics = await BusinessMetrics.find(businessQuery).sort({
      date: 1,
    });

    // Calculate aggregated metrics
    const analytics = calculateMarketingAnalytics(
      campaigns,
      businessMetrics,
      groupBy
    );

    res.json(analytics);
  } catch (err) {
    console.error("Error getting marketing analytics:", err);
    res.status(500).json({ error: "Failed to get marketing analytics." });
  }
};

// Calculate marketing analytics
function calculateMarketingAnalytics(
  campaigns,
  businessMetrics,
  groupBy = "overall"
) {
  const analytics = {
    summary: {},
    byPlatform: {},
    byTactic: {},
    byState: {},
    byCampaign: {},
    timeSeries: [],
    businessMetrics: {},
  };

  // Overall summary
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce(
    (sum, c) => sum + c.attributedRevenue,
    0
  );
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalNewCustomers = businessMetrics.reduce(
    (sum, b) => sum + b.newCustomers,
    0
  );

  analytics.summary = {
    totalSpend,
    totalRevenue,
    totalImpressions,
    totalClicks,
    totalNewCustomers,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    roi: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cac: totalNewCustomers > 0 ? totalSpend / totalNewCustomers : 0,
  };

  // Group by platform
  const platformGroups = campaigns.reduce((groups, campaign) => {
    const platform = campaign.platform;
    if (!groups[platform]) {
      groups[platform] = [];
    }
    groups[platform].push(campaign);
    return groups;
  }, {});

  Object.keys(platformGroups).forEach((platform) => {
    const platformCampaigns = platformGroups[platform];
    const platformSpend = platformCampaigns.reduce(
      (sum, c) => sum + c.spend,
      0
    );
    const platformRevenue = platformCampaigns.reduce(
      (sum, c) => sum + c.attributedRevenue,
      0
    );
    const platformImpressions = platformCampaigns.reduce(
      (sum, c) => sum + c.impressions,
      0
    );
    const platformClicks = platformCampaigns.reduce(
      (sum, c) => sum + c.clicks,
      0
    );

    analytics.byPlatform[platform] = {
      spend: platformSpend,
      revenue: platformRevenue,
      impressions: platformImpressions,
      clicks: platformClicks,
      roas: platformSpend > 0 ? platformRevenue / platformSpend : 0,
      roi:
        platformSpend > 0
          ? ((platformRevenue - platformSpend) / platformSpend) * 100
          : 0,
      ctr:
        platformImpressions > 0
          ? (platformClicks / platformImpressions) * 100
          : 0,
      cpc: platformClicks > 0 ? platformSpend / platformClicks : 0,
    };
  });

  // Group by tactic
  const tacticGroups = campaigns.reduce((groups, campaign) => {
    const tactic = campaign.tactic;
    if (!groups[tactic]) {
      groups[tactic] = [];
    }
    groups[tactic].push(campaign);
    return groups;
  }, {});

  Object.keys(tacticGroups).forEach((tactic) => {
    const tacticCampaigns = tacticGroups[tactic];
    const tacticSpend = tacticCampaigns.reduce((sum, c) => sum + c.spend, 0);
    const tacticRevenue = tacticCampaigns.reduce(
      (sum, c) => sum + c.attributedRevenue,
      0
    );
    const tacticImpressions = tacticCampaigns.reduce(
      (sum, c) => sum + c.impressions,
      0
    );
    const tacticClicks = tacticCampaigns.reduce((sum, c) => sum + c.clicks, 0);

    analytics.byTactic[tactic] = {
      spend: tacticSpend,
      revenue: tacticRevenue,
      impressions: tacticImpressions,
      clicks: tacticClicks,
      roas: tacticSpend > 0 ? tacticRevenue / tacticSpend : 0,
      roi:
        tacticSpend > 0
          ? ((tacticRevenue - tacticSpend) / tacticSpend) * 100
          : 0,
      ctr: tacticImpressions > 0 ? (tacticClicks / tacticImpressions) * 100 : 0,
      cpc: tacticClicks > 0 ? tacticSpend / tacticClicks : 0,
    };
  });

  // Time series data
  const dateGroups = campaigns.reduce((groups, campaign) => {
    const date = campaign.date.toISOString().split("T")[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(campaign);
    return groups;
  }, {});

  analytics.timeSeries = Object.keys(dateGroups)
    .map((date) => {
      const dateCampaigns = dateGroups[date];
      const dateSpend = dateCampaigns.reduce((sum, c) => sum + c.spend, 0);
      const dateRevenue = dateCampaigns.reduce(
        (sum, c) => sum + c.attributedRevenue,
        0
      );
      const dateImpressions = dateCampaigns.reduce(
        (sum, c) => sum + c.impressions,
        0
      );
      const dateClicks = dateCampaigns.reduce((sum, c) => sum + c.clicks, 0);

      return {
        date,
        spend: dateSpend,
        revenue: dateRevenue,
        impressions: dateImpressions,
        clicks: dateClicks,
        roas: dateSpend > 0 ? dateRevenue / dateSpend : 0,
        roi: dateSpend > 0 ? ((dateRevenue - dateSpend) / dateSpend) * 100 : 0,
        ctr: dateImpressions > 0 ? (dateClicks / dateImpressions) * 100 : 0,
        cpc: dateClicks > 0 ? dateSpend / dateClicks : 0,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Business metrics summary
  const totalBusinessRevenue = businessMetrics.reduce(
    (sum, b) => sum + b.totalRevenue,
    0
  );
  const totalBusinessOrders = businessMetrics.reduce(
    (sum, b) => sum + b.totalOrders,
    0
  );
  const totalBusinessCustomers = businessMetrics.reduce(
    (sum, b) => sum + b.newCustomers,
    0
  );
  const totalBusinessProfit = businessMetrics.reduce(
    (sum, b) => sum + b.grossProfit,
    0
  );

  analytics.businessMetrics = {
    totalRevenue: totalBusinessRevenue,
    totalOrders: totalBusinessOrders,
    totalCustomers: totalBusinessCustomers,
    totalProfit: totalBusinessProfit,
    revenuePerCustomer:
      totalBusinessCustomers > 0
        ? totalBusinessRevenue / totalBusinessCustomers
        : 0,
    orderValue:
      totalBusinessOrders > 0 ? totalBusinessRevenue / totalBusinessOrders : 0,
    profitMargin:
      totalBusinessRevenue > 0
        ? (totalBusinessProfit / totalBusinessRevenue) * 100
        : 0,
  };

  return analytics;
}

// Get marketing insights using AI
const getMarketingInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const analytics = await calculateMarketingAnalytics(
      await MarketingCampaign.find({ user: userId }),
      await BusinessMetrics.find({ user: userId })
    );

    // Generate insights based on the analytics
    const insights = generateMarketingInsights(analytics);

    res.json({ insights, analytics });
  } catch (err) {
    console.error("Error getting marketing insights:", err);
    res.status(500).json({ error: "Failed to get marketing insights." });
  }
};

// Generate marketing insights
function generateMarketingInsights(analytics) {
  const insights = [];

  // ROAS insights
  const bestPlatform = Object.keys(analytics.byPlatform).reduce(
    (best, platform) => {
      return analytics.byPlatform[platform].roas >
        analytics.byPlatform[best]?.roas
        ? platform
        : best;
    },
    Object.keys(analytics.byPlatform)[0]
  );

  if (bestPlatform) {
    insights.push({
      type: "performance",
      title: "Best Performing Platform",
      message: `${bestPlatform} has the highest ROAS of ${analytics.byPlatform[
        bestPlatform
      ].roas.toFixed(2)}x`,
      recommendation: `Consider increasing budget allocation to ${bestPlatform} for better returns`,
    });
  }

  // ROI insights
  const overallROI = analytics.summary.roi;
  if (overallROI > 100) {
    insights.push({
      type: "success",
      title: "Strong ROI Performance",
      message: `Overall ROI is ${overallROI.toFixed(
        1
      )}%, indicating profitable marketing spend`,
      recommendation:
        "Continue current strategy while monitoring for optimization opportunities",
    });
  } else if (overallROI < 50) {
    insights.push({
      type: "warning",
      title: "Low ROI Alert",
      message: `Overall ROI is ${overallROI.toFixed(1)}%, below optimal levels`,
      recommendation:
        "Review underperforming campaigns and consider reallocating budget",
    });
  }

  // CTR insights
  const avgCTR = analytics.summary.ctr;
  if (avgCTR < 1) {
    insights.push({
      type: "warning",
      title: "Low Click-Through Rate",
      message: `Average CTR is ${avgCTR.toFixed(
        2
      )}%, which is below industry standards`,
      recommendation: "Review ad creative and targeting to improve engagement",
    });
  }

  // CAC insights
  const cac = analytics.summary.cac;
  const revenuePerCustomer = analytics.businessMetrics.revenuePerCustomer;
  if (cac > revenuePerCustomer * 0.3) {
    insights.push({
      type: "warning",
      title: "High Customer Acquisition Cost",
      message: `CAC of $${cac.toFixed(
        2
      )} is high relative to revenue per customer`,
      recommendation:
        "Focus on improving conversion rates and reducing acquisition costs",
    });
  }

  return insights;
}

// Export marketing data as CSV
const exportData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all marketing campaigns and business metrics for the user
    const campaigns = await MarketingCampaign.find({ user: userId }).sort({
      date: -1,
    });
    const metrics = await BusinessMetrics.find({ user: userId }).sort({
      date: -1,
    });

    // Combine data for export
    const exportData = [];

    // Add business metrics
    metrics.forEach((metric) => {
      exportData.push({
        type: "Business Metric",
        date: metric.date.toISOString().split("T")[0],
        totalOrders: metric.totalOrders,
        newOrders: metric.newOrders,
        totalRevenue: metric.totalRevenue,
        newRevenue: metric.newRevenue,
        totalCustomers: metric.totalCustomers,
        newCustomers: metric.newCustomers,
        avgOrderValue: metric.avgOrderValue,
        conversionRate: metric.conversionRate,
        campaign: "",
        channel: "",
        impressions: "",
        clicks: "",
        ctr: "",
        cpc: "",
        spend: "",
      });
    });

    // Add marketing campaigns
    campaigns.forEach((campaign) => {
      exportData.push({
        type: "Marketing Campaign",
        date: campaign.date.toISOString().split("T")[0],
        totalOrders: "",
        newOrders: "",
        totalRevenue: "",
        newRevenue: "",
        totalCustomers: "",
        newCustomers: "",
        avgOrderValue: "",
        conversionRate: "",
        campaign: campaign.campaign,
        channel: campaign.channel,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        ctr: campaign.ctr,
        cpc: campaign.cpc,
        spend: campaign.spend,
      });
    });

    // Create CSV content
    const headers = [
      "Type",
      "Date",
      "Total Orders",
      "New Orders",
      "Total Revenue",
      "New Revenue",
      "Total Customers",
      "New Customers",
      "Avg Order Value",
      "Conversion Rate",
      "Campaign",
      "Channel",
      "Impressions",
      "Clicks",
      "CTR",
      "CPC",
      "Spend",
    ];

    let csvContent = headers.join(",") + "\n";

    exportData.forEach((row) => {
      const csvRow = [
        row.type,
        row.date,
        row.totalOrders,
        row.newOrders,
        row.totalRevenue,
        row.newRevenue,
        row.totalCustomers,
        row.newCustomers,
        row.avgOrderValue,
        row.conversionRate,
        row.campaign,
        row.channel,
        row.impressions,
        row.clicks,
        row.ctr,
        row.cpc,
        row.spend,
      ]
        .map((value) => `"${value}"`)
        .join(",");

      csvContent += csvRow + "\n";
    });

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="marketing_data_export.csv"'
    );

    res.send(csvContent);
  } catch (err) {
    console.error("Error exporting marketing data:", err);
    res.status(500).json({ error: "Failed to export marketing data." });
  }
};

// Upload custom marketing data
const uploadCustomData = async (req, res) => {
  const multer = require("multer");
  const XLSX = require("xlsx");

  // Configure multer for file upload
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const allowedTypes = [".csv", ".xlsx", ".xls"];
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error("Only CSV and Excel files are allowed"), false);
      }
    },
  }).fields([
    { name: "campaignFiles", maxCount: 10 },
    { name: "businessFile", maxCount: 1 },
  ]);

  upload(req, res, async (err) => {
    console.log("Upload middleware called");

    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }

    try {
      console.log("Processing upload request");
      console.log("User:", req.user ? req.user.id : "No user");
      console.log("Files:", req.files);

      if (!req.user || !req.user.id) {
        console.error("No authenticated user found");
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.user.id;
      const campaignFiles = req.files["campaignFiles"] || [];
      const businessFiles = req.files["businessFile"] || [];

      console.log(
        `Campaign files: ${campaignFiles.length}, Business files: ${businessFiles.length}`
      );

      if (campaignFiles.length === 0 && businessFiles.length === 0) {
        console.log("No files uploaded");
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Validate file sizes (max 10MB per file)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const allFiles = [...campaignFiles, ...businessFiles];
      for (const file of allFiles) {
        if (file.size > maxFileSize) {
          return res.status(400).json({
            error: `File ${file.originalname} is too large. Maximum size is 10MB.`,
          });
        }
      }

      // Limit total number of campaign files
      if (campaignFiles.length > 5) {
        return res.status(400).json({
          error: "Too many campaign files. Maximum 5 files allowed at once.",
        });
      }

      let processedCampaigns = 0;
      let processedBusinessMetrics = 0;

      // Process campaign files sequentially for better memory management
      console.log("Processing campaign files...");
      for (const file of campaignFiles) {
        console.log(`Processing campaign file: ${file.originalname}`);
        const data = await parseFileData(file);
        console.log(`Parsed ${data.length} rows from ${file.originalname}`);

        // Process in smaller batches to prevent memory issues
        const batchSize = 100;
        const totalBatches = Math.ceil(data.length / batchSize);

        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          const currentBatch = Math.floor(i / batchSize) + 1;

          console.log(
            `Processing batch ${currentBatch}/${totalBatches} (${batch.length} records)`
          );

          await processCampaignData(batch, userId);

          // Store progress for frontend polling
          const progress = Math.round((currentBatch / totalBatches) * 100);
          const progressKey = `upload_progress_${userId}`;

          // Store progress in a simple in-memory cache (you could use Redis for production)
          global.uploadProgress = global.uploadProgress || {};
          global.uploadProgress[progressKey] = {
            progress,
            fileName: file.originalname,
            batch: currentBatch,
            totalBatches,
            message: `Processing ${file.originalname}...`,
            details: `Batch ${currentBatch}/${totalBatches} (${progress}%)`,
          };

          console.log(
            `Progress: ${progress}% complete for ${file.originalname}`
          );
        }

        processedCampaigns += data.length;
        console.log(
          `Successfully processed ${data.length} campaign records from ${file.originalname}`
        );
      }

      // Process business files
      console.log("Processing business files...");
      for (const file of businessFiles) {
        console.log(`Processing business file: ${file.originalname}`);
        const data = await parseFileData(file);
        console.log(`Parsed ${data.length} rows from ${file.originalname}`);
        await processBusinessData(data, userId);
        processedBusinessMetrics += data.length;
        console.log(`Successfully processed ${data.length} business records`);
      }

      console.log(
        `Upload completed: ${processedCampaigns} campaigns, ${processedBusinessMetrics} business metrics`
      );

      res.json({
        message: "Custom data uploaded successfully",
        processed: {
          campaigns: processedCampaigns,
          businessMetrics: processedBusinessMetrics,
        },
      });
    } catch (error) {
      console.error("Error uploading custom data:", error);
      console.error("Error stack:", error.stack);

      // Ensure we always send a JSON response
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to upload custom data: " + error.message,
          details: error.stack,
        });
      }
    }
  });
};

// Helper function to parse file data
async function parseFileData(file) {
  try {
    console.log(
      `Parsing file: ${file.originalname}, size: ${file.buffer.length} bytes`
    );
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (fileExt === ".csv") {
      const result = await parseCSVFromBuffer(file.buffer);
      console.log(`CSV parsed successfully: ${result.length} rows`);
      return result;
    } else if (fileExt === ".xlsx" || fileExt === ".xls") {
      const result = await parseExcelFromBuffer(file.buffer);
      console.log(`Excel parsed successfully: ${result.length} rows`);
      return result;
    } else {
      throw new Error(`Unsupported file format: ${fileExt}`);
    }
  } catch (error) {
    console.error(`Error parsing file ${file.originalname}:`, error);
    throw new Error(
      `Failed to parse file ${file.originalname}: ${error.message}`
    );
  }
}

// Parse CSV from buffer
function parseCSVFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvString = buffer.toString();
    const lines = csvString.split("\n");

    if (lines.length < 2) {
      reject(
        new Error("CSV file must have at least a header and one data row")
      );
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        results.push(row);
      }
    }

    resolve(results);
  });
}

// Parse Excel from buffer
function parseExcelFromBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Process campaign data
async function processCampaignData(data, userId) {
  for (const row of data) {
    // Normalize column names to handle different formats
    const normalizedRow = normalizeColumnNames(row);

    const requiredFields = [
      "campaign_name",
      "platform",
      "date",
      "spend",
      "impressions",
      "clicks",
      "attributed_revenue",
    ];

    // Validate required fields
    const missingFields = requiredFields.filter(
      (field) => !normalizedRow[field]
    );
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in campaign data: ${missingFields.join(", ")}`
      );
    }

    // Validate platform
    const validPlatforms = ["Facebook", "Google", "TikTok"];
    if (!validPlatforms.includes(normalizedRow.platform)) {
      throw new Error(
        `Invalid platform: ${
          normalizedRow.platform
        }. Must be one of: ${validPlatforms.join(", ")}`
      );
    }

    // Create campaign record
    const campaignData = {
      user: userId,
      campaign: normalizedRow.campaign_name, // Schema expects 'campaign'
      platform: normalizedRow.platform,
      tactic: normalizedRow.tactic || "Unknown", // Preserve tactic from original data
      state: normalizedRow.state || "Unknown", // Preserve state from original data
      date: new Date(normalizedRow.date),
      spend: parseFloat(normalizedRow.spend) || 0,
      impressions: parseInt(normalizedRow.impressions) || 0,
      clicks: parseInt(normalizedRow.clicks) || 0,
      attributedRevenue: parseFloat(normalizedRow.attributed_revenue) || 0, // Schema expects 'attributedRevenue'
    };

    const campaign = new MarketingCampaign(campaignData);
    await campaign.save();
  }
}

// Helper function to normalize column names for different data formats
function normalizeColumnNames(row) {
  const normalized = {};

  // Create a mapping of possible column names to standard names
  const columnMappings = {
    // Campaign name variations
    campaign_name: "campaign_name",
    campaign: "campaign_name",
    "Campaign Name": "campaign_name",
    Campaign: "campaign_name",

    // Date variations
    date: "date",
    Date: "date",

    // Spend variations
    spend: "spend",
    Spend: "spend",
    cost: "spend",
    Cost: "spend",

    // Impressions variations
    impressions: "impressions",
    Impressions: "impressions",
    impression: "impressions", // Uses 'impression' (singular)
    Impression: "impressions",

    // Clicks variations
    clicks: "clicks",
    Clicks: "clicks",
    click: "clicks",
    Click: "clicks",

    // Revenue variations
    attributed_revenue: "attributed_revenue",
    "attributed revenue": "attributed_revenue", // Uses space
    "Attributed Revenue": "attributed_revenue",
    revenue: "attributed_revenue",
    Revenue: "attributed_revenue",

    // Platform variations (standard cases)
    platform: "platform",
    Platform: "platform",

    // Preserve original fields for schema compatibility
    tactic: "tactic",
    Tactic: "tactic",
    state: "state",
    State: "state",
  };

  // Map each field in the row to normalized names
  for (const [originalKey, value] of Object.entries(row)) {
    const normalizedKey =
      columnMappings[originalKey] || originalKey.toLowerCase();
    normalized[normalizedKey] = value;
  }

  // Extract platform from campaign name for the assessment data format
  if (normalized.campaign_name && !normalized.platform) {
    const campaignName = normalized.campaign_name.toLowerCase();

    if (campaignName.includes("facebook")) {
      normalized.platform = "Facebook";
    } else if (campaignName.includes("google")) {
      normalized.platform = "Google";
    } else if (campaignName.includes("tiktok")) {
      normalized.platform = "TikTok";
    }
  }

  return normalized;
}

// Process business data
async function processBusinessData(data, userId) {
  for (const row of data) {
    // Normalize column names for business data
    const normalizedRow = normalizeBusinessColumnNames(row);

    const requiredFields = [
      "date",
      "total_revenue",
      "total_orders",
      "new_customers",
      "cogs",
    ];

    // Validate required fields
    const missingFields = requiredFields.filter(
      (field) => !normalizedRow[field]
    );
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in business data: ${missingFields.join(", ")}`
      );
    }

    // Create business metrics record
    const businessMetric = new BusinessMetrics({
      user: userId,
      date: new Date(normalizedRow.date),
      total_revenue: parseFloat(normalizedRow.total_revenue) || 0,
      total_orders: parseInt(normalizedRow.total_orders) || 0,
      new_customers: parseInt(normalizedRow.new_customers) || 0,
      cogs: parseFloat(normalizedRow.cogs) || 0,
    });

    await businessMetric.save();
  }
}

// Helper function to normalize business data column names
function normalizeBusinessColumnNames(row) {
  const normalized = {};

  // Create a mapping for business data columns
  const columnMappings = {
    // Date variations
    date: "date",
    Date: "date",

    // Revenue variations
    total_revenue: "total_revenue",
    "total revenue": "total_revenue",
    "Total Revenue": "total_revenue",
    revenue: "total_revenue",
    Revenue: "total_revenue",

    // Orders variations
    total_orders: "total_orders",
    "total orders": "total_orders",
    "Total Orders": "total_orders",
    "# of orders": "total_orders", // Assessment data format
    orders: "total_orders",
    Orders: "total_orders",

    // New customers variations
    new_customers: "new_customers",
    "new customers": "new_customers",
    "New Customers": "new_customers",
    "new customers": "new_customers",

    // COGS variations
    cogs: "cogs",
    COGS: "cogs",
    "cost of goods sold": "cogs",
    "Cost of Goods Sold": "cogs",
  };

  // Map each field in the row to normalized names
  for (const [originalKey, value] of Object.entries(row)) {
    const normalizedKey =
      columnMappings[originalKey] ||
      originalKey.toLowerCase().replace(/[^a-z0-9]/g, "_");
    normalized[normalizedKey] = value;
  }

  return normalized;
}

// Get upload progress
const getUploadProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const progressKey = `upload_progress_${userId}`;

    const progress = global.uploadProgress?.[progressKey] || {
      progress: 0,
      message: "No upload in progress",
      details: "",
    };

    res.json(progress);
  } catch (err) {
    console.error("Error getting progress:", err);
    res.status(500).json({ error: "Failed to get progress" });
  }
};

// Debug: Get raw data counts by platform
const getDataDebug = async (req, res) => {
  try {
    const userId = req.user.id;

    const campaignCounts = await MarketingCampaign.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
    ]);

    const businessCount = await BusinessMetrics.countDocuments({
      user: userId,
    });

    res.json({
      userId,
      campaignsByPlatform: campaignCounts,
      businessMetrics: businessCount,
      totalCampaigns: await MarketingCampaign.countDocuments({ user: userId }),
    });
  } catch (err) {
    console.error("Error getting debug data:", err);
    res.status(500).json({ error: "Failed to get debug data" });
  }
};

// Clear user's marketing data (for testing)
const clearMarketingData = async (req, res) => {
  try {
    const userId = req.user.id;

    const campaignResult = await MarketingCampaign.deleteMany({ user: userId });
    const businessResult = await BusinessMetrics.deleteMany({ user: userId });

    res.json({
      message: "Data cleared successfully",
      deleted: {
        campaigns: campaignResult.deletedCount,
        businessMetrics: businessResult.deletedCount,
      },
    });
  } catch (err) {
    console.error("Error clearing data:", err);
    res.status(500).json({ error: "Failed to clear data" });
  }
};

module.exports = {
  importMarketingData,
  getMarketingAnalytics,
  getMarketingInsights,
  exportData,
  uploadCustomData,
  getUploadProgress,
  getDataDebug,
  clearMarketingData,
};
