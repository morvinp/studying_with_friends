import express from 'express';
import { 
  getDailyStudyData, 
  getWeeklySummary, 
  getUserPerformanceMetrics, 
  getAnalyticsDashboard,
  exportToCsv,
  healthCheck
} from '../controllers/powerbi.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Add CORS middleware for PowerBI
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint (public for PowerBI testing)
router.get('/health', healthCheck);

// Simple test endpoint for PowerBI connection
router.get('/test-data', (req, res) => {
  res.json({
    success: true,
    message: "PowerBI connection test successful",
    timestamp: new Date().toISOString(),
    sampleData: [
      { date: "2025-01-01", studyTime: 120, user: "testuser1" },
      { date: "2025-01-02", studyTime: 90, user: "testuser2" },
      { date: "2025-01-03", studyTime: 150, user: "testuser3" }
    ]
  });
});

// All other routes require authentication
router.use(protectRoute);

router.get('/daily-study-data', getDailyStudyData);
router.get('/weekly-summary', getWeeklySummary);
router.get('/user-performance-metrics', getUserPerformanceMetrics);
router.get('/analytics-dashboard', getAnalyticsDashboard);
router.get('/export-csv', exportToCsv);

export default router;
