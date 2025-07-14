// PowerBI Configuration for your Study Session Analytics
export const powerBIConfig = {
  // API Base URL for PowerBI to connect to
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com/api/powerbi'
    : 'http://localhost:5001/api/powerbi',
  
  // PowerBI Dataset Configuration
  datasets: {
    dailyStudySessions: {
      name: 'Daily Study Sessions',
      endpoint: '/daily-study-data',
      description: 'Individual study session records with user and group details',
      refreshSchedule: 'Every 4 hours',
      columns: [
        { name: 'date', type: 'DateTime' },
        { name: 'userId', type: 'Text' },
        { name: 'username', type: 'Text' },
        { name: 'fullName', type: 'Text' },
        { name: 'email', type: 'Text' },
        { name: 'technologies', type: 'Text' },
        { name: 'groupId', type: 'Text' },
        { name: 'groupName', type: 'Text' },
        { name: 'duration', type: 'Number' },
        { name: 'dayOfWeek', type: 'Number' },
        { name: 'weekNumber', type: 'Number' },
        { name: 'month', type: 'Number' },
        { name: 'year', type: 'Number' },
        { name: 'hour', type: 'Number' },
        { name: 'studyEfficiency', type: 'Text' }
      ]
    },
    
    weeklySummary: {
      name: 'Weekly Study Summary',
      endpoint: '/weekly-summary',
      description: 'Aggregated weekly study statistics per user',
      refreshSchedule: 'Daily at 6 AM',
      columns: [
        { name: 'userId', type: 'Text' },
        { name: 'username', type: 'Text' },
        { name: 'fullName', type: 'Text' },
        { name: 'email', type: 'Text' },
        { name: 'technologies', type: 'Text' },
        { name: 'week', type: 'Number' },
        { name: 'year', type: 'Number' },
        { name: 'totalDurationHours', type: 'Number' },
        { name: 'sessionCount', type: 'Number' },
        { name: 'averageSessionDurationMinutes', type: 'Number' },
        { name: 'studyFrequency', type: 'Text' }
      ]
    },
    
    userPerformanceMetrics: {
      name: 'User Performance Metrics',
      endpoint: '/user-performance-metrics',
      description: 'Comprehensive user performance analytics',
      refreshSchedule: 'Daily at 12 AM',
      columns: [
        { name: 'userId', type: 'Text' },
        { name: 'username', type: 'Text' },
        { name: 'fullName', type: 'Text' },
        { name: 'email', type: 'Text' },
        { name: 'technologies', type: 'Text' },
        { name: 'totalStudyTimeHours', type: 'Number' },
        { name: 'totalSessions', type: 'Number' },
        { name: 'averageSessionDurationMinutes', type: 'Number' },
        { name: 'longestSessionMinutes', type: 'Number' },
        { name: 'shortestSessionMinutes', type: 'Number' },
        { name: 'firstStudyDate', type: 'DateTime' },
        { name: 'lastStudyDate', type: 'DateTime' },
        { name: 'uniqueStudyDays', type: 'Number' },
        { name: 'studyConsistency', type: 'Number' }
      ]
    }
  },
  
  // PowerBI Dashboard Suggestions
  dashboardVisualization: {
    charts: [
      {
        type: 'Line Chart',
        title: 'Daily Study Hours Trend',
        xAxis: 'date',
        yAxis: 'totalDurationHours',
        description: 'Shows study time trends over time'
      },
      {
        type: 'Bar Chart',
        title: 'Top Study Technologies',
        xAxis: 'technologies',
        yAxis: 'totalStudyTimeHours',
        description: 'Most popular technologies being studied'
      },
      {
        type: 'Pie Chart',
        title: 'Study Efficiency Distribution',
        field: 'studyEfficiency',
        description: 'Breakdown of study session efficiency levels'
      },
      {
        type: 'Scatter Plot',
        title: 'Study Consistency vs Total Hours',
        xAxis: 'studyConsistency',
        yAxis: 'totalStudyTimeHours',
        description: 'Relationship between consistency and total study time'
      },
      {
        type: 'Table',
        title: 'User Leaderboard',
        columns: ['username', 'totalStudyTimeHours', 'totalSessions', 'studyConsistency'],
        description: 'Top performers ranked by study metrics'
      }
    ],
    
    filters: [
      { field: 'date', type: 'Date Range' },
      { field: 'technologies', type: 'Multi-Select' },
      { field: 'groupName', type: 'Multi-Select' },
      { field: 'studyEfficiency', type: 'Multi-Select' }
    ]
  },
  
  // Authentication for PowerBI
  authentication: {
    method: 'Bearer Token',
    note: 'Use your application JWT token for authentication',
    headerName: 'Authorization',
    headerValue: 'Bearer YOUR_JWT_TOKEN'
  },
  
  // API Testing URLs (for development)
  testUrls: {
    health: '/health',
    dailyData: '/daily-study-data?startDate=2025-01-01&endDate=2025-01-31',
    weeklyData: '/weekly-summary?startDate=2025-01-01&endDate=2025-01-31',
    userMetrics: '/user-performance-metrics',
    dashboard: '/analytics-dashboard?startDate=2025-01-01&endDate=2025-01-31',
    csvExport: '/export-csv?dataType=daily&startDate=2025-01-01&endDate=2025-01-31'
  }
};

// Helper function to get full API URLs for testing
export const getApiUrls = () => {
  const baseUrl = powerBIConfig.apiBaseUrl;
  const urls = {};
  
  Object.entries(powerBIConfig.testUrls).forEach(([key, endpoint]) => {
    urls[key] = `${baseUrl}${endpoint}`;
  });
  
  return urls;
};

// PowerBI Connection Steps Guide
export const connectionGuide = {
  step1: "In PowerBI Desktop, go to 'Get Data' > 'Web'",
  step2: "Enter your API endpoint URL (e.g., http://localhost:5001/api/powerbi/daily-study-data)",
  step3: "Set up authentication using 'Bearer Token' method",
  step4: "Add your JWT token in the Authorization header",
  step5: "Configure data refresh schedule in PowerBI Service",
  step6: "Create visualizations using the suggested chart types above"
};

export default powerBIConfig;
