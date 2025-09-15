# 🚀 SaleSight - Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier available)
- MongoDB Atlas account (free tier available)

## Step 1: Prepare MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for free
   - Create a new cluster (free tier: M0)

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with your database name

3. **Create Database User**
   - Go to "Database Access"
   - Add new user with read/write permissions
   - Note the username and password

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add MONGODB_URI
   vercel env add GEMINI_API_KEY
   vercel env add SESSION_SECRET
   ```

### Option B: Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Node.js project

3. **Configure Environment Variables**
   - In Vercel dashboard, go to your project
   - Go to "Settings" → "Environment Variables"
   - Add these variables:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
     GEMINI_API_KEY=your_gemini_api_key
     SESSION_SECRET=your_random_session_secret
     NODE_ENV=production
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

## Step 3: Environment Variables

Create these environment variables in Vercel:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/salesight` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `SESSION_SECRET` | Random string for sessions | `your-super-secret-session-key` |
| `NODE_ENV` | Environment | `production` |

## Step 4: Test Deployment

1. **Visit your Vercel URL**
   - Your app will be available at `https://your-project.vercel.app`

2. **Test Features**
   - ✅ User registration/login
   - ✅ File upload (multiple files)
   - ✅ Marketing dashboard
   - ✅ AI insights generation
   - ✅ Chart generation

## Step 5: Custom Domain (Optional)

1. **Add Custom Domain**
   - In Vercel dashboard, go to "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for all IPs)
   - Verify connection string format
   - Check database user permissions

2. **Environment Variables Not Working**
   - Redeploy after adding environment variables
   - Check variable names match exactly
   - Ensure no extra spaces in values

3. **File Upload Issues**
   - Vercel has file size limits (4.5MB for serverless)
   - Consider using Vercel Blob for larger files

4. **Session Issues**
   - Ensure SESSION_SECRET is set
   - Check session configuration in app.js

## Performance Optimization

1. **Enable Vercel Analytics**
   - Go to Vercel dashboard → Analytics
   - Enable for performance monitoring

2. **Optimize Images**
   - Use Vercel Image Optimization
   - Compress images before upload

3. **Database Indexing**
   - Add indexes for frequently queried fields
   - Monitor MongoDB Atlas performance

## Security Checklist

- ✅ Environment variables secured
- ✅ MongoDB Atlas IP whitelist configured
- ✅ Session secret is random and secure
- ✅ API keys are not exposed in code
- ✅ HTTPS enabled (automatic with Vercel)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Review environment variables
4. Test locally with production environment variables

## Cost Estimation

**Vercel (Free Tier):**
- 100GB bandwidth/month
- 100 serverless function executions/day
- Perfect for development and small projects

**MongoDB Atlas (Free Tier):**
- 512MB storage
- Shared clusters
- Perfect for development and testing

**Total Cost: $0/month for small projects!**
