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
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const userId = req.user.id;
      const campaignFiles = req.files["campaignFiles"] || [];
      const businessFiles = req.files["businessFile"] || [];

      if (campaignFiles.length === 0 && businessFiles.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      let processedCampaigns = 0;
      let processedBusinessMetrics = 0;

      // Process campaign files
      for (const file of campaignFiles) {
        const data = await parseFileData(file);
        await processCampaignData(data, userId);
        processedCampaigns += data.length;
      }

      // Process business files
      for (const file of businessFiles) {
        const data = await parseFileData(file);
        await processBusinessData(data, userId);
        processedBusinessMetrics += data.length;
      }

      res.json({
        message: "Custom data uploaded successfully",
        processed: {
          campaigns: processedCampaigns,
          businessMetrics: processedBusinessMetrics,
        },
      });
    } catch (error) {
      console.error("Error uploading custom data:", error);
      res
        .status(500)
        .json({ error: "Failed to upload custom data: " + error.message });
    }
  });
};

// Helper function to parse file data
async function parseFileData(file) {
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (fileExt === ".csv") {
    return parseCSVFromBuffer(file.buffer);
  } else if (fileExt === ".xlsx" || fileExt === ".xls") {
    return parseExcelFromBuffer(file.buffer);
  } else {
    throw new Error("Unsupported file format");
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
  const requiredFields = [
    "campaign_name",
    "platform",
    "date",
    "spend",
    "impressions",
    "clicks",
    "attributed_revenue",
  ];

  for (const row of data) {
    // Validate required fields
    const missingFields = requiredFields.filter((field) => !row[field]);
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in campaign data: ${missingFields.join(", ")}`
      );
    }

    // Validate platform
    const validPlatforms = ["Facebook", "Google", "TikTok"];
    if (!validPlatforms.includes(row.platform)) {
      throw new Error(
        `Invalid platform: ${
          row.platform
        }. Must be one of: ${validPlatforms.join(", ")}`
      );
    }

    // Create campaign record
    const campaign = new MarketingCampaign({
      user: userId,
      campaign_name: row.campaign_name,
      platform: row.platform,
      date: new Date(row.date),
      spend: parseFloat(row.spend) || 0,
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      attributed_revenue: parseFloat(row.attributed_revenue) || 0,
    });

    await campaign.save();
  }
}

// Process business data
async function processBusinessData(data, userId) {
  const requiredFields = [
    "date",
    "total_revenue",
    "total_orders",
    "new_customers",
    "cogs",
  ];

  for (const row of data) {
    // Validate required fields
    const missingFields = requiredFields.filter((field) => !row[field]);
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in business data: ${missingFields.join(", ")}`
      );
    }

    // Create business metrics record
    const businessMetric = new BusinessMetrics({
      user: userId,
      date: new Date(row.date),
      total_revenue: parseFloat(row.total_revenue) || 0,
      total_orders: parseInt(row.total_orders) || 0,
      new_customers: parseInt(row.new_customers) || 0,
      cogs: parseFloat(row.cogs) || 0,
    });

    await businessMetric.save();
  }
}

module.exports = {
  importMarketingData,
  getMarketingAnalytics,
  getMarketingInsights,
  exportData,
  uploadCustomData,
};
