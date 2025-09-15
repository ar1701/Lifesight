const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const indexController = require("../controllers/indexController");
const rateLimiter = require("../middleware/rateLimiter");

const { ensureAuthenticated } = require("../config/auth");

// Multer storage configuration - use memory storage for Vercel
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit for Vercel
  }
});

// All routes in this file are protected
router.use(ensureAuthenticated);

/* GET home page. */
router.get("/", indexController.getHomepage);

/* GET dashboards page. */
router.get("/dashboards", indexController.getDashboardsPage);

/* GET individual dashboard page. */
router.get("/dashboard/:dashboardId", indexController.getDashboardPage);

/* GET marketing intelligence dashboard. */
router.get("/marketing", indexController.getMarketingDashboard);

/* POST file upload */
router.post("/upload", upload.single("dataFile"), indexController.uploadFile);

/* GET file preview */
router.get("/preview/:fileId", indexController.previewFile);

/* POST generate insight */
router.post(
  "/generate-insight",
  rateLimiter(2, 60000),
  indexController.generateInsight
);

/* DELETE file */
router.delete("/file/:fileId", indexController.deleteFile);

module.exports = router;
