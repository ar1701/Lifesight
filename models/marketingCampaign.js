const mongoose = require("mongoose");

const marketingCampaignSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  platform: {
    type: String,
    required: true,
    enum: ["Facebook", "Google", "TikTok"],
  },
  tactic: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  campaign: {
    type: String,
    required: true,
  },
  impressions: {
    type: Number,
    required: true,
    default: 0,
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
  spend: {
    type: Number,
    required: true,
    default: 0,
  },
  attributedRevenue: {
    type: Number,
    required: true,
    default: 0,
  },
  // Calculated metrics
  ctr: {
    type: Number,
    default: 0, // clicks / impressions
  },
  cpc: {
    type: Number,
    default: 0, // spend / clicks
  },
  roas: {
    type: Number,
    default: 0, // attributed revenue / spend
  },
  roi: {
    type: Number,
    default: 0, // (attributed revenue - spend) / spend
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
marketingCampaignSchema.index({ user: 1, date: 1, platform: 1 });
marketingCampaignSchema.index({ user: 1, platform: 1, campaign: 1 });

// Pre-save middleware to calculate metrics
marketingCampaignSchema.pre("save", function (next) {
  // Calculate CTR
  if (this.impressions > 0) {
    this.ctr = (this.clicks / this.impressions) * 100;
  }

  // Calculate CPC
  if (this.clicks > 0) {
    this.cpc = this.spend / this.clicks;
  }

  // Calculate ROAS
  if (this.spend > 0) {
    this.roas = this.attributedRevenue / this.spend;
  }

  // Calculate ROI
  if (this.spend > 0) {
    this.roi = ((this.attributedRevenue - this.spend) / this.spend) * 100;
  }

  next();
});

module.exports = mongoose.model("MarketingCampaign", marketingCampaignSchema);
