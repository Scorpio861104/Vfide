# Reporting & Analytics System Documentation

## Overview

The Reporting & Analytics System is a production-grade analytics platform providing real-time insights, comprehensive reporting, data visualization, and advanced query building. Built with React 19 and TypeScript, it offers enterprise-grade analytics capabilities for the VFIDE ecosystem.

**Key Capabilities:**
- 📊 8 pre-built report types (Revenue, Transactions, Users, Performance, Security, Governance, Merchant, Custom)
- 📈 Interactive dashboards with metrics, charts, and real-time updates
- 💾 Multi-format data export (CSV, JSON, Excel, PDF)
- 🔍 Visual query builder with filters and aggregations
- 📱 Fully responsive design with dark mode
- ⚡ Real-time metrics with auto-refresh
- 📊 6 chart types (Line, Bar, Area, Pie, Doughnut, Heatmap)
- 🎯 Time range filtering (Hour to Year)
- 📋 Dashboard management and customization
- 🔔 Real-time metric updates and notifications

---

## Architecture

### System Components

```
reporting-analytics.ts (Config)
├── Enums (ReportType, ChartType, TimeRange, etc.)
├── Interfaces (Report, Chart, Query, etc.)
├── Utilities (formatMetricValue, getStatusColor, etc.)
└── Default Templates

useReportingAnalytics.ts (Hook)
├── Report Management
├── Dashboard Management
├── Query Management
├── Data Export
├── Time Range Filtering
└── Real-time Updates

UI Components
├── ReportingDashboard (Main dashboard)
├── RealtimeMetrics (Live metrics)
├── DataExport (Export functionality)
└── QueryBuilder (Query interface)

Page
└── app/reporting/page.tsx (Main analytics page)
```

### Data Flow

```
Report Generation
  ↓
Real-time Metrics Update
  ↓
Dashboard Display
  ↓
User Interaction (Filter, Export, Query)
  ↓
Data Refresh / Export
```

---

## Configuration Reference

### Enums

#### ReportType (8 types)
```typescript
enum ReportType {
  REVENUE = 'revenue',           // Revenue and financial metrics
  TRANSACTIONS = 'transactions', // Transaction details and trends
  USERS = 'users',               // User metrics and analytics
  PERFORMANCE = 'performance',   // System performance metrics
  SECURITY = 'security',         // Security incidents and alerts
  GOVERNANCE = 'governance',     // Governance activity and voting
  MERCHANT = 'merchant',         // Merchant metrics and activity
  CUSTOM = 'custom',            // Custom user-defined reports
}
```

#### ChartType (6 types)
```typescript
enum ChartType {
  LINE = 'line',           // Line chart (trends)
  BAR = 'bar',             // Bar chart (comparisons)
  AREA = 'area',           // Area chart (cumulative)
  PIE = 'pie',             // Pie chart (distribution)
  DOUGHNUT = 'doughnut',   // Doughnut chart (distribution)
  SCATTER = 'scatter',     // Scatter plot
  HEATMAP = 'heatmap',     // Heatmap (correlations)
  TABLE = 'table',         // Data table
}
```

#### TimeRange (7 options)
```typescript
enum TimeRange {
  LAST_HOUR = 'last_hour',       // Last 60 minutes
  LAST_24H = 'last_24h',         // Last 24 hours
  LAST_7D = 'last_7d',           // Last 7 days
  LAST_30D = 'last_30d',         // Last 30 days
  LAST_90D = 'last_90d',         // Last 90 days
  LAST_YEAR = 'last_year',       // Last 365 days
  CUSTOM = 'custom',             // Custom date range
}
```

#### MetricType (5 formats)
```typescript
enum MetricType {
  CURRENCY = 'currency',     // Currency format ($)
  PERCENTAGE = 'percentage', // Percentage format (%)
  NUMBER = 'number',         // Plain number
  DURATION = 'duration',     // Time duration (s, m, h)
  RATE = 'rate',            // Rate per second (/s)
}
```

#### AggregationType (6 operations)
```typescript
enum AggregationType {
  SUM = 'sum',           // Sum values
  AVERAGE = 'average',   // Average values
  MIN = 'min',           // Minimum value
  MAX = 'max',           // Maximum value
  COUNT = 'count',       // Count records
  DISTINCT = 'distinct', // Count distinct values
}
```

### Key Interfaces

#### MetricPoint
```typescript
interface MetricPoint {
  id: string;                 // Unique identifier
  label: string;              // Display label
  value: number;              // Current value
  change: number;             // Percentage change from previous
  trend: 'up' | 'down' | 'neutral';
  format: MetricType;         // How to format the value
  unit?: string;              // Custom unit ($, %, ms, etc.)
  sparklineData?: number[];   // Historical data for sparkline
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: number;        // Timestamp of last update
}
```

#### Report
```typescript
interface Report {
  id: string;                // Unique identifier
  title: string;             // Report title
  description?: string;      // Optional description
  type: ReportType;          // Report category
  metrics: MetricPoint[];    // Key metrics
  charts: Chart[];           // Data visualizations
  lastUpdated: number;       // Last update timestamp
  updateInterval?: number;   // Auto-refresh interval (ms)
  createdAt: number;         // Creation timestamp
  updatedBy?: string;        // Last editor
}
```

#### Chart
```typescript
interface Chart {
  id: string;                // Unique identifier
  label: string;             // Chart title
  type: ChartType;           // Chart type
  data: ChartDataPoint[];    // Chart data points
  color?: string;            // Primary color
  compareColor?: string;     // Comparison color
  unit?: string;             // Axis unit
  stacked?: boolean;         // Stack bars/areas
  showLegend?: boolean;      // Show legend
  showTooltip?: boolean;     // Show tooltips
  animationDuration?: number;// Animation length (ms)
}
```

#### Query
```typescript
interface Query {
  id: string;                            // Query identifier
  name: string;                          // Query name
  table: string;                         // Data table
  fields: string[];                      // Selected fields
  filters: QueryFilter[];                // Where clauses
  aggregations: QueryAggregation[];      // Group by/aggregates
  groupBy?: string[];                    // Group by fields
  orderBy?: OrderBy[];                   // Sort order
  limit?: number;                        // Result limit
  offset?: number;                       // Result offset
}
```

#### DashboardConfig
```typescript
interface DashboardConfig {
  id: string;                // Dashboard identifier
  name: string;              // Dashboard name
  description?: string;      // Optional description
  reports: string[];         // Report IDs to include
  refreshInterval?: number;  // Auto-refresh interval
  isPublic?: boolean;        // Public sharing
  owner?: string;            // Owner wallet
  createdAt: number;         // Creation timestamp
}
```

### Utility Functions

#### formatMetricValue
```typescript
function formatMetricValue(
  value: number,
  format: MetricType,
  decimals?: number
): string
```
Formats values based on metric type (currency, percentage, duration, etc.)

#### formatTrendValue
```typescript
function formatTrendValue(change: number): string
// Returns: "+15.5%", "-3.2%", etc.
```

#### getTrendDirection
```typescript
function getTrendDirection(change: number): 'up' | 'down' | 'neutral'
```

#### getStatusColor
```typescript
function getStatusColor(status: string): string
// Returns hex color for status
```

#### getReportTypeColor
```typescript
function getReportTypeColor(type: ReportType): string
// Returns brand color for report type
```

#### formatDateRange
```typescript
function formatDateRange(range: TimeRange): string
// Returns: "Last 24 Hours", "Last 7 Days", etc.
```

---

## Hook API Reference

### useReportingAnalytics

```typescript
const {
  // State
  reports,
  dashboards,
  queries,
  selectedTimeRange,
  isLoading,
  error,
  autoRefresh,
  refreshInterval,

  // Report operations
  addOrUpdateReport,
  removeReport,
  getReportsByType,
  getReport,
  updateMetric,
  refreshReports,
  exportReport,
  getFilteredReportsByDateRange,
  getComparisonData,

  // Dashboard operations
  createDashboard,
  updateDashboard,
  removeDashboard,
  getDashboardWithReports,

  // Query operations
  saveQuery,
  removeQuery,
  executeQuery,

  // Settings
  setTimeRange,
  toggleAutoRefresh,
  setRefreshInterval,

  // Analytics
  getSummaryStats,
} = useReportingAnalytics();
```

### Report Operations

#### addOrUpdateReport(report: Report)
Create or update a report.

```typescript
addOrUpdateReport({
  id: 'revenue-2024',
  title: 'Revenue Report 2024',
  type: ReportType.REVENUE,
  metrics: [
    {
      id: 'total-revenue',
      label: 'Total Revenue',
      value: 125000,
      change: 15.5,
      trend: 'up',
      format: MetricType.CURRENCY,
      status: 'healthy',
      lastUpdated: Date.now(),
    },
  ],
  charts: [
    {
      id: 'revenue-trend',
      label: 'Revenue Trend',
      type: ChartType.LINE,
      data: [
        { x: 'Jan', y: 100000 },
        { x: 'Feb', y: 110000 },
        { x: 'Mar', y: 125000 },
      ],
      color: '#10b981',
    },
  ],
  lastUpdated: Date.now(),
  createdAt: Date.now(),
});
```

#### removeReport(reportId: string)
Delete a report.

```typescript
removeReport('revenue-2024');
```

#### getReportsByType(type: ReportType)
Get all reports of specific type.

```typescript
const revenueReports = getReportsByType(ReportType.REVENUE);
```

#### getReport(reportId: string)
Get single report by ID.

```typescript
const report = getReport('revenue-2024');
```

#### updateMetric(reportId: string, metricId: string, value: number)
Update specific metric value in a report.

```typescript
updateMetric('revenue-2024', 'total-revenue', 135000);
```

#### refreshReports()
Refresh all reports with latest data.

```typescript
await refreshReports();
```

#### exportReport(reportId: string, config: ExportConfig)
Export report in specified format.

```typescript
exportReport('revenue-2024', {
  format: ExportFormat.CSV,
  filename: 'revenue-report.csv',
  includeMetadata: true,
});
```

### Dashboard Operations

#### createDashboard(dashboard: DashboardConfig)
Create a new dashboard.

```typescript
createDashboard({
  id: 'executive-dashboard',
  name: 'Executive Dashboard',
  description: 'Key metrics for executives',
  reports: ['revenue-2024', 'transaction-summary'],
  refreshInterval: 30000,
});
```

#### updateDashboard(dashboardId: string, updates: Partial<DashboardConfig>)
Update dashboard settings.

```typescript
updateDashboard('executive-dashboard', {
  name: 'Updated Executive Dashboard',
  refreshInterval: 60000,
});
```

#### removeDashboard(dashboardId: string)
Delete a dashboard.

```typescript
removeDashboard('executive-dashboard');
```

#### getDashboardWithReports(dashboardId: string)
Get dashboard with all associated reports.

```typescript
const dashboardData = getDashboardWithReports('executive-dashboard');
```

### Query Operations

#### saveQuery(query: Query)
Save a custom query for later use.

```typescript
saveQuery({
  id: 'revenue-by-merchant',
  name: 'Revenue by Merchant',
  table: 'transactions',
  fields: ['merchant_id', 'amount'],
  filters: [
    {
      field: 'status',
      operator: 'equals',
      value: 'completed',
    },
  ],
  aggregations: [
    {
      field: 'amount',
      type: AggregationType.SUM,
      alias: 'total',
    },
  ],
  groupBy: ['merchant_id'],
});
```

#### executeQuery(query: Query)
Execute a query and get results.

```typescript
await executeQuery(savedQuery);
```

### Settings

#### setTimeRange(range: TimeRange)
Set the active time range for filtering.

```typescript
setTimeRange(TimeRange.LAST_7D);
```

#### toggleAutoRefresh()
Toggle automatic refresh on/off.

```typescript
toggleAutoRefresh();
```

#### setRefreshInterval(interval: number)
Set auto-refresh interval in milliseconds.

```typescript
setRefreshInterval(60000); // 60 seconds
```

### Analytics

#### getSummaryStats
Get aggregate statistics across all reports.

```typescript
const {
  totalReports,      // Number of reports
  totalDashboards,   // Number of dashboards
  reportsUpdatedToday, // Updated in last 24 hours
  totalMetrics,      // Total metrics across reports
  totalCharts,       // Total charts across reports
} = getSummaryStats;
```

---

## UI Components

### ReportingDashboard

Main dashboard component for displaying reports.

```typescript
import { ReportingDashboard } from '@/components/analytics/ReportingDashboard';

<ReportingDashboard
  reports={reports}
/>
```

**Features:**
- Metric cards with trends
- Interactive charts
- Responsive grid layout
- Real-time updates

### RealtimeMetrics

Live metrics display with status indicators.

```typescript
import { RealtimeMetrics } from '@/components/analytics/RealtimeMetrics';

<RealtimeMetrics reports={reports} />
```

**Features:**
- Status indicators (healthy/warning/critical)
- Sparkline charts
- Auto-updating values
- Trend indicators

### DataExport

Data export utility with multiple formats.

```typescript
import { DataExport } from '@/components/analytics/DataExport';

<DataExport
  reports={reports}
  onExport={(format) => handleExport(format)}
/>
```

**Features:**
- CSV export
- JSON export
- Excel export (with formatting)
- PDF export
- Custom field selection

### QueryBuilder

Visual query interface with filters and aggregations.

```typescript
import { QueryBuilder } from '@/components/analytics/QueryBuilder';

<QueryBuilder
  onSave={(query) => saveQuery(query)}
/>
```

**Features:**
- Visual filter builder
- Aggregation selection
- Field picker
- Query preview
- Save/load queries

---

## Main Page Structure

### Reporting & Analytics Page

Located at `/reporting`, provides unified analytics interface.

```
Header
├── Title & Description
├── Refresh Button
├── Time Range Selector
└── Auto-Refresh Toggle

Tab Navigation
├── Overview (Summary stats + dashboards)
├── Reports (Detailed reports by type)
├── Dashboards (Dashboard management)
└── Query Builder (Custom queries)

Content Area
├── Summary Statistics (5 cards)
├── Real-time Metrics
├── Report Charts
├── Data Tables
└── Export Controls
```

### Responsive Design
- **Mobile:** Single column, stacked cards
- **Tablet:** 2-column layout
- **Desktop:** 3-4 column grid with sidebar

---

## Usage Examples

### Create Revenue Report

```typescript
import { useReportingAnalytics } from '@/hooks/useReportingAnalytics';
import { ReportType, MetricType, ChartType } from '@/config/reporting-analytics';

function RevenueReportComponent() {
  const { addOrUpdateReport } = useReportingAnalytics();

  const createRevenueReport = () => {
    addOrUpdateReport({
      id: 'monthly-revenue',
      title: 'Monthly Revenue Report',
      type: ReportType.REVENUE,
      metrics: [
        {
          id: 'total',
          label: 'Total Revenue',
          value: 125000,
          change: 15.5,
          trend: 'up',
          format: MetricType.CURRENCY,
          status: 'healthy',
          lastUpdated: Date.now(),
        },
        {
          id: 'avg',
          label: 'Average Transaction',
          value: 245.5,
          change: 3.2,
          trend: 'up',
          format: MetricType.CURRENCY,
          status: 'healthy',
          lastUpdated: Date.now(),
        },
      ],
      charts: [
        {
          id: 'trend',
          label: 'Revenue Trend',
          type: ChartType.LINE,
          data: [
            { x: 'Week 1', y: 30000 },
            { x: 'Week 2', y: 32000 },
            { x: 'Week 3', y: 31000 },
            { x: 'Week 4', y: 32000 },
          ],
          color: '#10b981',
        },
      ],
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    });
  };

  return <button onClick={createRevenueReport}>Create Report</button>;
}
```

### Filter Reports by Time Range

```typescript
function FilteredReportsComponent() {
  const { selectedTimeRange, setTimeRange, getFilteredReportsByDateRange } =
    useReportingAnalytics();

  const filteredReports = getFilteredReportsByDateRange();

  return (
    <div>
      <select value={selectedTimeRange} onChange={(e) => setTimeRange(e.target.value)}>
        <option value="last_24h">Last 24 Hours</option>
        <option value="last_7d">Last 7 Days</option>
        <option value="last_30d">Last 30 Days</option>
      </select>

      {filteredReports.map((report) => (
        <div key={report.id}>
          <h3>{report.title}</h3>
          {/* Display report metrics and charts */}
        </div>
      ))}
    </div>
  );
}
```

### Export Report Data

```typescript
function ExportComponent() {
  const { exportReport } = useReportingAnalytics();

  const handleExport = () => {
    exportReport('monthly-revenue', {
      format: ExportFormat.CSV,
      filename: 'revenue-report-2024.csv',
      includeMetadata: true,
      dateRange: {
        start: Date.now() - 30 * 24 * 60 * 60 * 1000,
        end: Date.now(),
      },
    });
  };

  return <button onClick={handleExport}>Export as CSV</button>;
}
```

### Create Custom Dashboard

```typescript
function DashboardCreationComponent() {
  const { createDashboard } = useReportingAnalytics();

  const createExecutiveDashboard = () => {
    createDashboard({
      id: 'exec-dashboard',
      name: 'Executive Dashboard',
      description: 'High-level metrics for leadership',
      reports: ['revenue-2024', 'transaction-summary', 'user-growth'],
      refreshInterval: 60000, // Refresh every minute
      isPublic: false,
    });
  };

  return <button onClick={createExecutiveDashboard}>Create Dashboard</button>;
}
```

### Build Custom Query

```typescript
function QueryBuildingComponent() {
  const { saveQuery, executeQuery } = useReportingAnalytics();

  const createRevenueByMerchantQuery = () => {
    const query: Query = {
      id: 'revenue-by-merchant',
      name: 'Revenue by Merchant',
      table: 'transactions',
      fields: ['merchant_id', 'merchant_name', 'amount'],
      filters: [
        {
          field: 'status',
          operator: 'equals',
          value: 'completed',
        },
        {
          field: 'timestamp',
          operator: 'between',
          value: {
            start: Date.now() - 30 * 24 * 60 * 60 * 1000,
            end: Date.now(),
          },
        },
      ],
      aggregations: [
        {
          field: 'amount',
          type: AggregationType.SUM,
          alias: 'total_revenue',
        },
        {
          field: 'id',
          type: AggregationType.COUNT,
          alias: 'transaction_count',
        },
      ],
      groupBy: ['merchant_id', 'merchant_name'],
      orderBy: [{ field: 'total_revenue', direction: 'desc' }],
      limit: 100,
    };

    saveQuery(query);
    executeQuery(query);
  };

  return <button onClick={createRevenueByMerchantQuery}>Build Query</button>;
}
```

---

## Performance Optimization

### Memoization
- Reports cached with React.useMemo
- Filtered reports only recalculated when data changes
- Charts memoized to prevent unnecessary re-renders

### Auto-Refresh Strategies
- Configurable refresh intervals (30s to 5m default)
- Toggle to pause auto-refresh during editing
- Staggered updates to prevent thundering herd

### Data Persistence
- Reports stored in localStorage
- Dashboards cached for quick access
- Queries saved for reuse

### Chart Optimization
- SVG rendering for charts
- Virtual scrolling for large datasets
- Lazy-loaded chart libraries

---

## Best Practices

### Report Design
1. ✅ Use appropriate metric types (currency, percentage, etc.)
2. ✅ Include sparklines for historical context
3. ✅ Set realistic thresholds for status indicators
4. ✅ Group related metrics together
5. ❌ Don't overload with too many metrics per report

### Dashboard Organization
1. ✅ Use logical grouping of reports
2. ✅ Set appropriate refresh intervals
3. ✅ Include key metrics at top
4. ✅ Use consistent color schemes
5. ❌ Avoid mixing unrelated metrics

### Query Building
1. ✅ Start with specific fields only
2. ✅ Use filters to reduce dataset
3. ✅ Aggregate before grouping
4. ✅ Save and reuse common queries
5. ❌ Don't query across millions of records

### Time Range Filtering
1. ✅ Use relative ranges for consistency
2. ✅ Allow custom ranges for deep analysis
3. ✅ Show date range clearly to users
4. ✅ Persist selected range in state
5. ❌ Don't default to all-time for performance

---

## Troubleshooting

### Reports Not Updating
**Check:** Auto-refresh enabled and interval set
```typescript
toggleAutoRefresh(); // Enable auto-refresh
setRefreshInterval(30000); // Set 30s interval
```

### Data Export Failing
**Check:** Browser permissions for downloads
```typescript
// Ensure blob creation and download works
const blob = new Blob([data], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
```

### Slow Dashboard Performance
**Check:** Number of charts and data points
```typescript
// Reduce data points or use pagination
limit: 1000, // Limit query results
```

### Query Not Executing
**Check:** Table and field names valid
```typescript
// Verify table exists and fields are correct
table: 'transactions', // Valid table name
fields: ['id', 'amount', 'status'], // Valid fields
```

---

## Integration Guide

### Backend Integration
Reports pull from backend API endpoints:
- `GET /api/reports` - List all reports
- `POST /api/reports` - Create new report
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report
- `GET /api/reports/:id/data` - Get report data
- `POST /api/queries/execute` - Execute custom query

### Real-time Updates
WebSocket connection for live metrics:
```typescript
const ws = new WebSocket('wss://api.vfide.com/metrics');
ws.onmessage = (event) => {
  const update: RealtimeMetricUpdate = JSON.parse(event.data);
  updateMetric(update.id, update.reportId, update.value);
};
```

### Third-party Dashboard Tools
Export reports to external tools:
- Grafana dashboards
- Tableau dashboards
- Metabase queries
- Data warehouses (BigQuery, Snowflake)

---

## Future Enhancements

- [ ] Predictive analytics with ML models
- [ ] Custom alert rules and notifications
- [ ] Report scheduling and emailing
- [ ] Role-based dashboard access
- [ ] Advanced filtering with date pickers
- [ ] Multi-metric comparisons
- [ ] Drill-down capabilities
- [ ] Custom visualization builders
- [ ] Report templates library
- [ ] Anomaly detection
- [ ] Budget forecasting
- [ ] Performance benchmarking

---

## Support & Resources

**Documentation:** See [REPORTING-ANALYTICS-GUIDE.md](./REPORTING-ANALYTICS-GUIDE.md)
**Components:** Check `frontend/components/analytics/`
**Tests:** Run `npm test -- ReportingAnalytics`
**Examples:** See integration examples above

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Status:** Production Ready ✅
