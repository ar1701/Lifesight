const express = require("express");
const router = express.Router();
const marketingController = require("../controllers/marketingController");
const { ensureAuthenticated } = require("../config/auth");

// All routes in this file are protected
router.use(ensureAuthenticated);

// POST import marketing data from CSV files
router.post("/import", marketingController.importMarketingData);

// GET marketing analytics
router.get("/analytics", marketingController.getMarketingAnalytics);

// GET marketing insights
router.get("/insights", marketingController.getMarketingInsights);

// GET export data
router.get("/export", marketingController.exportData);

// POST upload custom data
router.post("/upload-custom", marketingController.uploadCustomData);

module.exports = router;
