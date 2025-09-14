const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { ensureAuthenticated } = require("../config/auth");

// All routes in this file are protected
router.use(ensureAuthenticated);

// GET all dashboards for the user
router.get("/", dashboardController.getDashboards);

// GET a single dashboard with its widgets
router.get("/:dashboardId", dashboardController.getDashboard);

// POST create a new dashboard
router.post("/", dashboardController.createDashboard);

// PUT update a dashboard
router.put("/:dashboardId", dashboardController.updateDashboard);

// DELETE a dashboard and all its widgets
router.delete("/:dashboardId", dashboardController.deleteDashboard);

module.exports = router;
