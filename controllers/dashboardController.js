const Dashboard = require("../models/dashboard");
const Widget = require("../models/widget");

// Get all dashboards for a user
const getDashboards = async (req, res) => {
  try {
    const dashboards = await Dashboard.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .populate("user", "name email");

    res.json(dashboards);
  } catch (err) {
    console.error("Error fetching dashboards:", err);
    res.status(500).json({ error: "Failed to fetch dashboards." });
  }
};

// Get a single dashboard with its widgets
const getDashboard = async (req, res) => {
  try {
    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      user: req.user.id,
    });

    if (!dashboard) {
      return res.status(404).json({ error: "Dashboard not found." });
    }

    const widgets = await Widget.find({
      dashboard: req.params.dashboardId,
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.json({ dashboard, widgets });
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).json({ error: "Failed to fetch dashboard." });
  }
};

// Create a new dashboard
const createDashboard = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Dashboard name is required." });
    }

    const dashboard = new Dashboard({
      name: name.trim(),
      description: description ? description.trim() : "",
      user: req.user.id,
    });

    await dashboard.save();
    res.status(201).json(dashboard);
  } catch (err) {
    console.error("Error creating dashboard:", err);
    res.status(500).json({ error: "Failed to create dashboard." });
  }
};

// Update a dashboard
const updateDashboard = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Dashboard name is required." });
    }

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: req.params.dashboardId, user: req.user.id },
      {
        name: name.trim(),
        description: description ? description.trim() : "",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!dashboard) {
      return res
        .status(404)
        .json({
          error:
            "Dashboard not found or you do not have permission to update it.",
        });
    }

    res.json(dashboard);
  } catch (err) {
    console.error("Error updating dashboard:", err);
    res.status(500).json({ error: "Failed to update dashboard." });
  }
};

// Delete a dashboard and all its widgets
const deleteDashboard = async (req, res) => {
  try {
    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      user: req.user.id,
    });

    if (!dashboard) {
      return res
        .status(404)
        .json({
          error:
            "Dashboard not found or you do not have permission to delete it.",
        });
    }

    // Delete all widgets in this dashboard
    await Widget.deleteMany({
      dashboard: req.params.dashboardId,
      user: req.user.id,
    });

    // Delete the dashboard
    await Dashboard.findByIdAndDelete(req.params.dashboardId);

    res.json({
      message: "Dashboard and all its widgets deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting dashboard:", err);
    res.status(500).json({ error: "Failed to delete dashboard." });
  }
};

module.exports = {
  getDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
};
