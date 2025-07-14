import PowerBIService from '../services/powerbi.service.js';

// Get daily study data for PowerBI
export const getDailyStudyData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    // Validate dates
    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date cannot be after end date' 
      });
    }
    
    const data = await PowerBIService.getDailyStudyData(start, end);
    const formattedData = PowerBIService.formatForPowerBI(data, 'daily-study-sessions');
    
    res.json({
      success: true,
      ...formattedData
    });
  } catch (error) {
    console.error('Error in getDailyStudyData:', error);
    res.status(500).json({ 
      error: 'Failed to fetch daily study data',
      details: error.message 
    });
  }
};

// Get weekly summary for PowerBI
export const getWeeklySummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 12 weeks if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 84); // 12 weeks
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    // Validate dates
    if (start > end) {
      return res.status(400).json({ 
        error: 'Start date cannot be after end date' 
      });
    }
    
    const data = await PowerBIService.getWeeklySummary(start, end);
    const formattedData = PowerBIService.formatForPowerBI(data, 'weekly-summary');
    
    res.json({
      success: true,
      ...formattedData
    });
  } catch (error) {
    console.error('Error in getWeeklySummary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weekly summary',
      details: error.message 
    });
  }
};

// Get user performance metrics for PowerBI
export const getUserPerformanceMetrics = async (req, res) => {
  try {
    const { userId } = req.query;
    
    const data = await PowerBIService.getUserPerformanceMetrics(userId);
    const formattedData = PowerBIService.formatForPowerBI(data, 'user-performance-metrics');
    
    res.json({
      success: true,
      ...formattedData
    });
  } catch (error) {
    console.error('Error in getUserPerformanceMetrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user performance metrics',
      details: error.message 
    });
  }
};

// Get comprehensive analytics data for PowerBI dashboard
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    // Fetch multiple data sets for comprehensive dashboard
    const [dailyData, weeklyData, userMetrics] = await Promise.all([
      PowerBIService.getDailyStudyData(start, end),
      PowerBIService.getWeeklySummary(start, end),
      PowerBIService.getUserPerformanceMetrics()
    ]);
    
    const dashboardData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dataType: 'analytics-dashboard',
        dateRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        recordCounts: {
          dailySessions: dailyData.length,
          weeklySummaries: weeklyData.length,
          userMetrics: userMetrics.length
        },
        version: '1.0'
      },
      dailyStudySessions: dailyData,
      weeklySummary: weeklyData,
      userPerformanceMetrics: userMetrics
    };
    
    res.json({
      success: true,
      ...dashboardData
    });
  } catch (error) {
    console.error('Error in getAnalyticsDashboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics dashboard data',
      details: error.message 
    });
  }
};

// Export data in CSV format for PowerBI
export const exportToCsv = async (req, res) => {
  try {
    const { dataType, startDate, endDate } = req.query;
    
    if (!dataType) {
      return res.status(400).json({ 
        error: 'Data type is required. Options: daily, weekly, user-metrics' 
      });
    }
    
    let data;
    let filename;
    
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    switch (dataType) {
      case 'daily':
        data = await PowerBIService.getDailyStudyData(start, end);
        filename = `daily-study-sessions-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`;
        break;
      case 'weekly':
        data = await PowerBIService.getWeeklySummary(start, end);
        filename = `weekly-summary-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`;
        break;
      case 'user-metrics':
        data = await PowerBIService.getUserPerformanceMetrics();
        filename = `user-performance-metrics-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid data type. Options: daily, weekly, user-metrics' 
        });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for the specified parameters' 
      });
    }
    
    // Convert to CSV format
    const csvData = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
    
  } catch (error) {
    console.error('Error in exportToCsv:', error);
    res.status(500).json({ 
      error: 'Failed to export CSV data',
      details: error.message 
    });
  }
};

// Helper function to convert JSON to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle arrays and objects
      if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      } else if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value)}"`;
      } else if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

// Health check endpoint for PowerBI connection
export const healthCheck = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'PowerBI API is healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        dailyData: '/api/powerbi/daily-study-data',
        weeklySummary: '/api/powerbi/weekly-summary',
        userMetrics: '/api/powerbi/user-performance-metrics',
        dashboard: '/api/powerbi/analytics-dashboard',
        csvExport: '/api/powerbi/export-csv'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Health check failed',
      details: error.message 
    });
  }
};
