import React, { useState, useEffect } from 'react';
import { Download, BarChart3, Calendar, Users, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PowerBIPanel = () => {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [apiHealth, setApiHealth] = useState(null);

  // Check PowerBI API health on component mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await fetch('/api/powerbi/health');
      const data = await response.json();
      setApiHealth(data);
    } catch (error) {
      console.error('PowerBI API health check failed:', error);
      setApiHealth({ success: false, error: 'API unavailable' });
    }
  };

  const exportData = async (dataType) => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        dataType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/powerbi/export-csv?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `study-data-${dataType}-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${dataType} data exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const openPowerBIUrl = (endpoint) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/api/powerbi${endpoint}`;
    
    // Copy URL to clipboard for easy PowerBI setup
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success('PowerBI URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const dataEndpoints = [
    {
      name: 'Daily Study Sessions',
      endpoint: '/daily-study-data',
      description: 'Individual study session records with user and group details',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      name: 'Weekly Summary',
      endpoint: '/weekly-summary',
      description: 'Aggregated weekly study statistics per user',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      name: 'User Performance Metrics',
      endpoint: '/user-performance-metrics',
      description: 'Comprehensive user performance analytics',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      name: 'Analytics Dashboard',
      endpoint: '/analytics-dashboard',
      description: 'Complete dataset for comprehensive PowerBI dashboards',
      icon: BarChart3,
      color: 'text-orange-600'
    }
  ];

  const exportOptions = [
    { type: 'daily', label: 'Daily Sessions', icon: Calendar },
    { type: 'weekly', label: 'Weekly Summary', icon: TrendingUp },
    { type: 'user-metrics', label: 'User Metrics', icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* API Health Status */}
      <div className="card bg-base-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">PowerBI API Status</h3>
            <p className="text-sm opacity-70">Export study session data for advanced analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${apiHealth?.success ? 'bg-success' : 'bg-error'}`}></div>
            <span className="text-sm">
              {apiHealth?.success ? 'Connected' : 'Unavailable'}
            </span>
            <button
              onClick={checkApiHealth}
              className="btn btn-ghost btn-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-4">📅 Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text">Start Date</span>
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="input input-bordered w-full"
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">End Date</span>
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="input input-bordered w-full"
            />
          </div>
        </div>
      </div>

      {/* PowerBI Data Sources */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-4">📊 PowerBI Data Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataEndpoints.map((endpoint) => {
            const Icon = endpoint.icon;
            return (
              <div key={endpoint.name} className="card bg-base-100 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <Icon className={`w-6 h-6 ${endpoint.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <h4 className="font-medium">{endpoint.name}</h4>
                    <p className="text-sm opacity-70 mt-1">{endpoint.description}</p>
                    <button
                      onClick={() => openPowerBIUrl(endpoint.endpoint)}
                      className="btn btn-sm btn-primary mt-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Copy URL
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSV Export Section */}
      <div className="card bg-base-200 p-4">
        <h3 className="text-lg font-semibold mb-4">📥 Export Data</h3>
        <p className="text-sm opacity-70 mb-4">
          Download CSV files for offline analysis or PowerBI import
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                onClick={() => exportData(option.type)}
                disabled={exportLoading}
                className="btn btn-outline flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {option.label}
                <Download className="w-4 h-4 ml-auto" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="card bg-info bg-opacity-10 p-4">
        <h3 className="text-lg font-semibold mb-4">🚀 PowerBI Setup Guide</h3>
        <ol className="space-y-2 text-sm">
          <li>1. Open PowerBI Desktop and select "Get Data" → "Web"</li>
          <li>2. Paste the copied URL from the data sources above</li>
          <li>3. Set authentication method to "Bearer Token"</li>
          <li>4. Add your JWT token in the Authorization header</li>
          <li>5. Configure data refresh schedule in PowerBI Service</li>
          <li>6. Create visualizations using the imported data</li>
        </ol>
      </div>
    </div>
  );
};

export default PowerBIPanel;
