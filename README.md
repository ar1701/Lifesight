# 📊 SaleSight - Marketing Intelligence Platform
**Live Demo:** https://lifesight-five.vercel.app/
**Video Demo:** https://youtu.be/Czl3z3ElqbM

A modern, AI-powered business intelligence platform that transforms your marketing data into actionable insights. Built for e-commerce businesses to understand how marketing activity connects with business outcomes.

## 🌟 Features

### 📈 **Marketing Intelligence Dashboard**

- **Custom Data Upload**: Support for CSV and Excel files
- **Multi-Platform Analytics**: Facebook, Google, TikTok campaign analysis
- **Selective Insights**: Choose specific metrics to analyze (ROI, ROAS, CAC, COGS, CTR, CPC)
- **Interactive Charts**: Dynamic visualizations with Chart.js
- **AI-Powered Insights**: Gemini AI generates contextual recommendations

### 🎯 **Key Metrics & KPIs**

- **Financial Metrics**: ROI, ROAS, COGS, CAC
- **Performance Metrics**: CTR, CPC, Conversion Rate, Platform Performance
- **Business Metrics**: Revenue, Orders, Customer Analytics
- **Interactive Tooltips**: Hover definitions for all metrics

### 📁 **Data Management**

- **File Upload**: Drag-and-drop CSV/Excel support
- **Data Validation**: Automatic format checking and error handling
- **Templates**: Download sample data templates
- **Export**: CSV data export functionality

### 🤖 **AI Features**

- **Smart Insights**: Context-aware recommendations
- **Fallback System**: Basic analytics when AI is unavailable
- **Rate Limiting**: Optimized API usage
- **Error Handling**: Graceful degradation

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google Gemini API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/salesight.git
   cd salesight
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/salesight
   SESSION_SECRET=your-session-secret-key
   GEMINI_API_KEY=your-gemini-api-key
   GOOGLE_CLIENT_ID=your-google-oauth-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-secret
   ```

4. **Start the application**

   ```bash
   npm start
   ```

5. **Access the platform**
   Open your browser and navigate to `http://localhost:8080`

## 📊 Data Format Guide

### Campaign Data Format

```csv
campaign_name,platform,date,spend,impressions,clicks,attributed_revenue
Summer Sale,Facebook,2024-01-01,1000,50000,2500,5000
Holiday Campaign,Google,2024-01-02,1500,75000,3000,7500
Brand Awareness,TikTok,2024-01-03,800,40000,1600,3200
```

### Business Metrics Format

```csv
date,total_revenue,total_orders,new_customers,cogs
2024-01-01,15000,150,45,9000
2024-01-02,18000,180,52,10800
2024-01-03,12000,120,38,7200
```

### Data Requirements

- **Date Format**: YYYY-MM-DD
- **Platform Names**: Exactly "Facebook", "Google", or "TikTok"
- **Numbers**: No currency symbols, use decimal points
- **Headers**: First row must contain column names
- **File Types**: CSV, XLSX, XLS supported

## 🏗️ Project Structure

```
salesight/
├── controllers/          # Route controllers
│   ├── authController.js
│   ├── indexController.js
│   ├── marketingController.js
│   └── widgetController.js
├── models/              # Database models
│   ├── user.js
│   ├── widget.js
│   ├── marketingCampaign.js
│   └── businessMetrics.js
├── routes/              # Express routes
│   ├── auth.js
│   ├── index.js
│   ├── widget.js
│   └── marketing.js
├── views/               # EJS templates
│   ├── partials/
│   ├── index-redesigned.ejs
│   ├── marketing-dashboard-restructured.ejs
│   └── dashboards-new.ejs
├── public/              # Static assets
│   ├── css/
│   │   └── modern.css
│   └── js/
│       └── main.js
├── config/              # Configuration files
│   ├── auth.js
│   ├── passport.js
│   └── gemini.js
└── uploads/             # File upload directory
```

## 🎨 User Interface

### Modern Design System

- **Minimalist UI**: Clean, professional interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Interactive Elements**: Hover effects, tooltips, animations
- **Color Scheme**: Professional blue-gray palette
- **Typography**: Clear, readable fonts with proper hierarchy

### User Experience Flow

1. **Upload Data**: Start with custom data upload
2. **Select Metrics**: Choose specific KPIs to analyze
3. **Generate Insights**: AI-powered analysis and recommendations
4. **Interactive Charts**: Explore data with dynamic visualizations
5. **Export Results**: Download insights and data

## 🔧 API Endpoints

### Marketing APIs

```
POST /api/marketing/upload-custom    # Upload custom data files
GET  /api/marketing/analytics        # Get marketing analytics
GET  /api/marketing/insights         # Get AI insights
GET  /api/marketing/export          # Export data as CSV
```

### Dashboard APIs

```
GET  /api/dashboards                # Get user dashboards
POST /api/dashboards                # Create new dashboard
PUT  /api/dashboards/:id            # Update dashboard
DELETE /api/dashboards/:id          # Delete dashboard
```

### Widget APIs

```
POST /api/widgets                   # Create widget
GET  /api/widgets/:dashboardId      # Get dashboard widgets
DELETE /api/widgets/:id             # Delete widget
```

## 🛠️ Technology Stack

### Backend

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database with Mongoose ODM
- **Passport.js**: Authentication (Google OAuth)
- **Multer**: File upload handling
- **CSV Parser**: Data processing
- **XLSX**: Excel file support

### Frontend

- **EJS**: Template engine
- **Bootstrap 5**: CSS framework
- **Chart.js**: Data visualization
- **Vanilla JavaScript**: Client-side interactivity

### AI & APIs

- **Google Gemini**: AI-powered insights
- **Rate Limiting**: API optimization
- **Fallback System**: Graceful degradation

## 📱 Usage Examples

### 1. Upload Marketing Data

```javascript
// Upload campaign files
const formData = new FormData();
formData.append("campaignFiles", file1);
formData.append("campaignFiles", file2);
formData.append("businessFile", businessFile);

fetch("/api/marketing/upload-custom", {
  method: "POST",
  body: formData,
});
```

### 2. Generate Specific Insights

```javascript
// Select metrics and generate insights
const selectedMetrics = ["roi", "roas", "cac"];
generateInsights(selectedMetrics);
```

### 3. Create Interactive Charts

```javascript
// Generate ROI chart
new Chart(ctx, {
  type: "bar",
  data: {
    labels: platforms,
    datasets: [
      {
        label: "ROI (%)",
        data: roiData,
        backgroundColor: "rgba(34, 197, 94, 0.8)",
      },
    ],
  },
});
```

## 🔐 Security Features

- **Authentication**: Google OAuth integration
- **Session Management**: Secure session handling
- **File Validation**: Type and size restrictions
- **Rate Limiting**: API abuse prevention
- **Input Sanitization**: XSS protection
- **Error Handling**: Secure error responses

## 🚀 Deployment

### Production Setup

1. Set up MongoDB cluster
2. Configure environment variables
3. Set up Google OAuth credentials
4. Deploy to your preferred platform (AWS, Heroku, etc.)

### Environment Variables

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=your-production-mongodb-uri
GEMINI_API_KEY=your-production-api-key
GOOGLE_CLIENT_ID=your-production-oauth-id
GOOGLE_CLIENT_SECRET=your-production-oauth-secret
SESSION_SECRET=your-production-session-secret
```

## 📈 Performance Optimization

- **Lazy Loading**: Charts load on demand
- **Caching**: Session-based data caching
- **Compression**: Gzip compression enabled
- **Minification**: CSS and JS optimization
- **CDN**: Bootstrap and Chart.js from CDN

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Q: AI insights not working?**
A: Check your Gemini API key and ensure you have sufficient quota.

**Q: File upload failing?**
A: Verify file format (CSV/Excel) and required columns.

**Q: Charts not displaying?**
A: Ensure data is uploaded and metrics are selected.

### Getting Help

- Create an issue on GitHub
- Check the documentation
- Review the data format requirements

## 🎯 Roadmap

- [ ] Real-time data sync
- [ ] Advanced AI models
- [ ] Mobile app
- [ ] White-label solutions
- [ ] API integrations (Facebook Ads, Google Ads)
- [ ] Advanced reporting features

---

**Built with ❤️ for modern marketing teams**

Transform your marketing data into actionable insights with SaleSight's AI-powered analytics platform.
