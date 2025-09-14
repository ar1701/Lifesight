const express = require("express");
const router = express.Router();
const widgetController = require("../controllers/widgetController");
const { ensureAuthenticated } = require("../config/auth");

// All routes in this file are protected
router.use(ensureAuthenticated);

// POST a new widget to the dashboard
router.post("/", widgetController.createWidget);

// DELETE a widget from the dashboard
router.delete("/:widgetId", widgetController.deleteWidget);

module.exports = router;
