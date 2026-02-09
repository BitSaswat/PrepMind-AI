# PrepMind AI - Zero-Cost Deployment Guide

This guide will help you deploy PrepMind AI with **$0 hosting costs forever** using the "Render + Pinger" strategy.

## Architecture Overview

- **Backend**: Render Free Tier (with WebSocket support)
- **Frontend**: Vercel Free Tier  
- **Keep-Alive**: Cron-job.org (pings backend every 10 minutes to prevent sleep)
- **Total Cost**: $0.00 forever

---

## Prerequisites

> [!IMPORTANT]
> **Google Vertex AI Billing Requirement**
> 
> Your backend uses `@google-cloud/vertexai` which **requires a Google Cloud billing account with a credit card** attached, even to use the $300 free credits.
> 
> **If you don't have a credit card**, you must switch to Google AI Studio API (`@google/generative-ai`) which only requires an API key.

### Required Accounts

1. **GitHub Account** (for code hosting)
2. **Render Account** (sign up at [render.com](https://render.com))
3. **Vercel Account** (sign up at [vercel.com](https://vercel.com))
4. **Cron-job.org Account** (sign up at [cron-job.org](https://cron-job.org))
5. **Google Cloud Project** with billing enabled (for Vertex AI)

---

## Step 1: Deploy Backend to Render

### 1.1 Push Code to GitHub

```bash
cd /Users/om/prep_mind_ai/PrepMind-AI
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 1.2 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `prepmind-backend` (or your choice) |
   | **Region** | Oregon (US West) |
   | **Branch** | `main` |
   | **Root Directory** | Leave empty |
   | **Runtime** | Node |
   | **Build Command** | `cd backend && npm install` |
   | **Start Command** | `cd backend && npm start` (or `cd backend && node server.js`) |
   | **Instance Type** | **Free** ⚠️ Important! |

   > **Note**: `npm start` and `node server.js` are equivalent - `npm start` just runs `node server.js` as defined in package.json.

5. Click **"Advanced"** and add environment variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `GOOGLE_CLOUD_PROJECT` | Your Google Cloud project ID |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (update after Vercel deployment) |

6. Click **"Create Web Service"**

### 1.3 Wait for Deployment

- Render will build and deploy your backend
- This takes 3-5 minutes
- Once deployed, copy your backend URL: `https://prepmind-backend.onrender.com`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Update Frontend Configuration

Before deploying, update the backend URL in `frontend/src/js/config.js`:

```javascript
getBackendURL() {
  if (this.isLocal()) {
    return 'http://localhost:5000';
  }
  // Replace with your actual Render URL
  return 'https://prepmind-backend.onrender.com';
}
```

Commit and push this change:

```bash
git add frontend/src/js/config.js
git commit -m "Update backend URL for production"
git push origin main
```

### 2.2 Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Other |
   | **Root Directory** | `frontend` |
   | **Build Command** | Leave empty (static site) |
   | **Output Directory** | Leave empty |

5. Click **"Deploy"**

### 2.3 Get Your Frontend URL

- After deployment, Vercel will give you a URL like: `https://prepmind-ai.vercel.app`
- Copy this URL

### 2.4 Update Backend CORS

Go back to Render and update the `FRONTEND_URL` environment variable:

1. Go to your Render service → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL
3. Click **"Save Changes"**
4. Render will automatically redeploy

---

## Step 3: Setup Keep-Alive Pinger (Critical!)

This is the **magic step** that keeps your Render backend awake 24/7.

### 3.1 Create Cron Job

1. Go to [cron-job.org](https://cron-job.org) and sign up
2. Click **"Create Cronjob"**
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Title** | `Keep PrepMind Awake` |
   | **URL** | `https://prepmind-backend.onrender.com/ping` |
   | **Schedule** | Every **10 minutes** |
   | **Enabled** | ✅ Yes |

4. Click **"Create"**

### 3.2 Verify It's Working

- Wait 10 minutes
- Check the cron-job.org dashboard
- You should see successful pings (HTTP 200 responses)
- Check your Render logs to see ping requests coming in

---

## Step 4: Test Your Deployment

### 4.1 Test Health Endpoints

```bash
# Test ping endpoint
curl https://prepmind-backend.onrender.com/ping
# Expected: "Pong! I am awake."

# Test health endpoint
curl https://prepmind-backend.onrender.com/health
# Expected: JSON with status, uptime, environment
```

### 4.2 Test Frontend

1. Open your Vercel URL in a browser
2. Log in to the application
3. Navigate to Mock Test page
4. Try starting an interview (tests WebSocket connection)

### 4.3 Test WebSocket Connection

Open browser console and check for:
```
🔌 Connecting to WebSocket: wss://prepmind-backend.onrender.com/interview
✅ WebSocket connected
```

---

## Environment Variables Reference

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-set by Render) | `10000` |
| `GOOGLE_CLOUD_PROJECT` | Your GCP project ID | `my-project-123` |
| `FRONTEND_URL` | Your Vercel frontend URL | `https://prepmind-ai.vercel.app` |

### Frontend (Vercel)

No environment variables needed! The frontend automatically detects production mode.

---

## Troubleshooting

### Backend Issues

**Problem**: "Application failed to respond"
- **Solution**: Check Render logs for errors
- Verify `npm install` completed successfully
- Ensure `GOOGLE_CLOUD_PROJECT` is set correctly

**Problem**: CORS errors in browser console
- **Solution**: Verify `FRONTEND_URL` matches your Vercel URL exactly
- Check Render logs for CORS rejection messages

**Problem**: Backend sleeps despite pinger
- **Solution**: Verify cron-job.org shows successful pings
- Check that ping interval is 10 minutes (not 15+)
- Ensure ping URL is correct: `/ping` not `/health`

### Frontend Issues

**Problem**: "Failed to connect to WebSocket"
- **Solution**: Check `config.js` has correct Render URL
- Verify WebSocket URL uses `wss://` (not `ws://`)
- Check Render backend is running

**Problem**: API requests fail with 404
- **Solution**: Ensure API endpoints use `/api/` prefix
- Check `Config.getAPIURL()` returns correct URL
- Verify backend routes are properly registered

### Cold Start Issues

**Problem**: First request takes 30-60 seconds
- **Expected Behavior**: This is normal for Render free tier
- **Solution**: The pinger minimizes this, but can't eliminate it entirely
- Users may experience slight delay if accessing right after deployment

---

## Performance Notes

### Expected Behavior

- **With Pinger**: Server responds in 1-2 seconds
- **Without Pinger**: First request after 15 min idle takes 30-60 seconds
- **WebSocket**: Connects instantly when server is warm

### Limitations of Free Tier

- **Render**: 512MB RAM, shared CPU, sleeps after 15 min idle
- **Vercel**: Unlimited bandwidth for hobby projects
- **Cron-job.org**: 50 monitors free, 5-minute minimum interval (we use 10 min)

---

## Monitoring Your Deployment

### Check Backend Health

Visit: `https://prepmind-backend.onrender.com/health`

Response:
```json
{
  "status": "healthy",
  "uptime": "45m 23s",
  "uptimeSeconds": 2723,
  "environment": "production",
  "timestamp": "2026-02-09T11:10:00.000Z",
  "version": "1.0.0"
}
```

### Check Pinger Status

1. Log in to cron-job.org
2. View your "Keep PrepMind Awake" job
3. Check execution history
4. Verify all pings return HTTP 200

### Check Render Logs

1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for ping requests every 10 minutes:
   ```
   GET /ping 200 - 2ms
   ```

---

## Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Render | Free Tier | $0.00 |
| Vercel | Hobby | $0.00 |
| Cron-job.org | Free | $0.00 |
| **Total** | | **$0.00** |

> [!NOTE]
> **Google Vertex AI costs** are separate. You get $300 free credits, but need a credit card on file. Monitor your usage in Google Cloud Console.

---

## Next Steps

1. ✅ Backend deployed to Render
2. ✅ Frontend deployed to Vercel
3. ✅ Pinger configured on cron-job.org
4. ✅ Test all features
5. 🎉 Share your app with users!

## Need Help?

- **Render Issues**: [Render Docs](https://render.com/docs)
- **Vercel Issues**: [Vercel Docs](https://vercel.com/docs)
- **WebSocket Issues**: Check browser console for detailed error messages
