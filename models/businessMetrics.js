const mongoose = require("mongoose");

const businessMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  totalOrders: {
    type: Number,
    required: true,
    default: 0,
  },
  newOrders: {
    type: Number,
    required: true,
    default: 0,
  },
  newCustomers: {
    type: Number,
    required: true,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    required: true,
    default: 0,
  },
  grossProfit: {
    type: Number,
    required: true,
    default: 0,
  },
  cogs: {
    type: Number,
    required: true,
    default: 0, // Cost of Goods Sold
  },
  // Calculated metrics
  revenuePerCustomer: {
    type: Number,
    default: 0, // total revenue / new customers
  },
  profitMargin: {
    type: Number,
    default: 0, // gross profit / total revenue
  },
  orderValue: {
    type: Number,
    default: 0, // total revenue / total orders
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
businessMetricsSchema.index({ user: 1, date: 1 });

// Pre-save middleware to calculate metrics
businessMetricsSchema.pre("save", function (next) {
  // Calculate Revenue per Customer
  if (this.newCustomers > 0) {
    this.revenuePerCustomer = this.totalRevenue / this.newCustomers;
  }

  // Calculate Profit Margin
  if (this.totalRevenue > 0) {
    this.profitMargin = (this.grossProfit / this.totalRevenue) * 100;
  }

  // Calculate Average Order Value
  if (this.totalOrders > 0) {
    this.orderValue = this.totalRevenue / this.totalOrders;
  }

  next();
});

module.exports = mongoose.model("BusinessMetrics", businessMetricsSchema);
