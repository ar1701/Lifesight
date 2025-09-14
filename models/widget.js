const mongoose = require("mongoose");

const widgetSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true, // 'chart' or 'table'
    enum: ["chart", "table"],
  },
  config: {
    type: Object,
    required: false, // Chart.js config for chart widgets
  },
  data: {
    type: Object,
    required: false, // Table data for table widgets
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  dashboard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dashboard",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Custom validation to ensure at least one of config or data is provided
widgetSchema.pre("validate", function (next) {
  if (!this.config && !this.data) {
    return next(new Error("Either config or data must be provided"));
  }
  next();
});

const Widget = mongoose.model("Widget", widgetSchema);

module.exports = Widget;
