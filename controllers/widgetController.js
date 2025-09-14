const Widget = require("../models/widget");

const createWidget = async (req, res) => {
  try {
    const { type, config, data, dashboardId } = req.body;

    if (!type) {
      return res.status(400).json({ error: "Widget type is required." });
    }

    if (!dashboardId) {
      return res.status(400).json({ error: "Dashboard ID is required." });
    }

    // For chart widgets, config is required
    if (type === "chart" && !config) {
      return res
        .status(400)
        .json({ error: "Config is required for chart widgets." });
    }

    // For table widgets, data is required
    if (type === "table" && !data) {
      return res
        .status(400)
        .json({ error: "Data is required for table widgets." });
    }

    const newWidget = new Widget({
      type,
      config: config || null,
      data: data || null,
      user: req.user.id,
      dashboard: dashboardId,
    });

    await newWidget.save();
    res.status(201).json(newWidget);
  } catch (err) {
    console.error("Error saving widget:", err);
    res.status(500).json({ error: "Failed to save widget." });
  }
};

const deleteWidget = async (req, res) => {
  try {
    const widget = await Widget.findOne({
      _id: req.params.widgetId,
      user: req.user.id,
    });
    if (!widget) {
      return res.status(404).json({
        error: "Widget not found or you do not have permission to delete it.",
      });
    }

    await Widget.findByIdAndDelete(req.params.widgetId);
    res.json({ message: "Widget deleted successfully." });
  } catch (err) {
    console.error("Error deleting widget:", err);
    res.status(500).json({ error: "Failed to delete widget." });
  }
};

module.exports = {
  createWidget,
  deleteWidget,
};
