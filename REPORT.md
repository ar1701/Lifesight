# SaleSight - Marketing Intelligence Dashboard

**Live Demo:** https://lifesight-five.vercel.app/

## Overview

SaleSight is a comprehensive marketing intelligence platform that transforms raw marketing data into actionable insights through AI-powered analytics and interactive visualizations.

## Core Features

### 1. Data Management & Upload

- **Multi-format Support**: Upload CSV and Excel files (up to 4MB each)
- **Drag & Drop Interface**: Intuitive file upload with visual feedback
- **Data Preview**: Paginated preview of uploaded data with 10 records per page
- **Template Downloads**: Pre-built templates for campaign and business data
- **Batch Processing**: Efficient handling of large datasets with progress tracking

**How to Use:**

1. Navigate to Marketing Dashboard
2. Drag & drop files or click to browse
3. Preview data before processing
4. Click "Upload Data" to process files

### 2. Analytics & Insights Generation

- **Key Metrics**: ROI, ROAS, CAC, CTR, CPC, Conversion Rate analysis
- **Platform Performance**: Compare Facebook, Google, TikTok campaigns
- **Interactive Charts**: Dynamic visualizations using Chart.js
- **Real-time Calculations**: Automatic metric computation from uploaded data
- **Customizable Analysis**: Select specific metrics for focused insights

**How to Use:**

1. After uploading data, select desired metrics
2. Click "Generate Selected Insights"
3. View interactive charts and key performance indicators
4. Analyze platform-specific performance

### 3. AI-Powered Chat Assistant

- **Gemini Integration**: Google's AI for intelligent data analysis
- **Contextual Responses**: AI understands your specific marketing data
- **Natural Language Queries**: Ask questions in plain English
- **Real-time Insights**: Get instant answers about your campaigns
- **Integrated Experience**: Chat appears after insights generation

**How to Use:**

1. Generate insights first to provide context
2. Ask questions like "What's my best performing platform?"
3. Get AI-powered recommendations and analysis
4. Explore trends and optimization opportunities

## Technical Architecture

### Backend

- **Node.js/Express**: RESTful API architecture
- **MongoDB**: Document-based data storage
- **JWT Authentication**: Secure user sessions
- **Multer**: File upload handling with memory storage
- **Google Gemini API**: AI-powered insights

### Frontend

- **EJS Templating**: Server-side rendering
- **Bootstrap 5**: Responsive UI framework
- **Chart.js**: Interactive data visualizations
- **Black/White Theme**: Clean, professional design
- **Progressive Enhancement**: Works across all devices

### Deployment

- **Vercel**: Serverless deployment platform
- **Environment Variables**: Secure configuration management
- **Memory Storage**: Optimized for serverless architecture
- **Auto-scaling**: Handles traffic spikes automatically

## Getting Started

### Demo Credentials

- **Username:** ayushraj
- **Password:** demo@123

### Quick Start

1. Visit the live demo URL
2. Login with demo credentials
3. Upload sample marketing data
4. Generate insights and explore AI chat
5. Create custom dashboards with widgets

## Data Requirements

### Campaign Data Format

```csv
campaign_name,platform,date,spend,impressions,clicks,attributed_revenue
Summer Sale,Facebook,2024-01-01,1000,50000,2500,5000
```

### Business Data Format

```csv
date,total_revenue,total_orders,new_customers,cogs
2024-01-01,10000,50,25,6000
```

## Key Benefits

- **Time-saving**: Automated data processing and analysis
- **AI-powered**: Intelligent insights without manual analysis
- **User-friendly**: Intuitive interface for non-technical users
- **Scalable**: Handles multiple data sources and large datasets
- **Professional**: Clean, modern design suitable for presentations

---

_Built with modern web technologies for optimal performance and user experience._
