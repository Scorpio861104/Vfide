# Reporting & Analytics Guide

Complete guide to the Vfide reporting and analytics system with dashboards, real-time metrics, data export, and query builder.

## Table of Contents

1. [Overview](#overview)
2. [ReportingDashboard](#reportingdashboard)
3. [DataExport](#dataexport)
4. [RealtimeMetrics](#realtimemetrics)
5. [QueryBuilder](#querybuilder)
6. [Integration Examples](#integration-examples)
7. [Best Practices](#best-practices)
8. [Performance Optimization](#performance-optimization)

---

## Overview

The Reporting & Analytics system provides comprehensive data visualization, real-time monitoring, data export capabilities, and flexible query building. Built with React 19 and TypeScript, it offers production-ready components for enterprise-grade analytics.

### Features

- **📊 Interactive Dashboards**: Multi-report dashboards with metrics, charts, and controls
- **📈 Real-time Metrics**: Live monitoring with status indicators and sparklines
- **💾 Data Export**: Export to CSV, JSON, PDF, and Excel formats
- **🔍 Query Builder**: Visual SQL-like query interface with filters and aggregations
- **📱 Responsive Design**: Mobile-first layouts with dark mode support
- **♿ Accessible**: WCAG 2.1 AA compliant with ARIA labels

### File Structure

```
frontend/
├── components/
│   └── analytics/
│       ├── ReportingDashboard.tsx   # Main dashboard component
│       ├── DataExport.tsx           # Data export utility
│       ├── RealtimeMetrics.tsx      # Real-time monitoring
│       └── QueryBuilder.tsx         # Visual query interface
└── __tests__/
    └── analytics/
        └── ReportingAnalytics.test.tsx   # 80+ comprehensive tests
```

---

## ReportingDashboard

The main dashboard component for displaying reports with metrics, charts, and interactive controls.

### Basic Usage

```tsx
import { ReportingDashboard } from '@/components/analytics/ReportingDashboard';

function MyDashboard() {
  const reports = [
    {
      id: 'sales-report',
      title: 'Sales Report',
      description: 'Monthly sales performance',
      lastUpdated: new Date(),
      updateInterval: 30000, // 30 seconds
      metrics: [
        {
          id: 'revenue',
          label: 'Total Revenue',
          value: 125000,
          change: 15.5,
          trend: 'up',
          format: 'currency'
        },
        {
          id: 'orders',
          label: 'Total Orders',
          value: 450,
          change: -5.2,
          trend: 'down',
          format: 'number'
        }
      ],
      charts: [
        {
          id: 'revenue-chart',
          label: 'Revenue Trend',
          data: [
            { x: 'Jan', y: 100000 },
            { x: 'Feb', y: 110000 },
            { x: 'Mar', y: 125000 }
          ],
          color: '#3b82f6'
        }
      ]
    }
  ];

  const handleRefresh = async () => {
    // Fetch fresh data
    const newData = await fetchReportData();
    // Update reports
  };

  const handleExport = (reportId: string, format: 'csv' | 'pdf' | 'json') => {
    // Export logic
    console.log(`Exporting ${reportId} as ${format}`);
  };

  return (
    <ReportingDashboard
      reports={reports}
      onRefresh={handleRefresh}
      onExport={handleExport}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `reports` | `Report[]` | Yes | Array of report configurations |
| `onRefresh` | `() => Promise<void>` | No | Callback for refreshing data |
| `onExport` | `(id: string, format) => void` | No | Callback for exporting data |
| `className` | `string` | No | Additional CSS classes |

### Report Type

```typescript
interface Report {
  id: string;
  title: string;
  description: string;
  metrics: Metric[];
  charts: ChartData[];
  lastUpdated: Date;
  updateInterval?: number; // milliseconds
}
```

### Metric Type

```typescript
interface Metric {
  id: string;
  label: string;
  value: number | string;
  change?: number;       // Percentage change
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}
```

### Chart Data Type

```typescript
interface ChartData {
  id: string;
  label: string;
  data: Array<{ x: string | number; y: number }>;
  color?: string;
}
```

### Format Options

- **number**: `1,234,567` (comma-separated)
- **currency**: `$1,234.56` (2 decimal places)
- **percentage**: `12.34%`
- **duration**: `5h 23m` (hours and minutes)

### Date Range Presets

- Last 24 Hours
- Last 7 Days
- Last 30 Days
- Last 90 Days

### Chart Types

- **Line Chart**: Displays trends over time
- **Bar Chart**: Compares values across categories

### Auto-Refresh

When `updateInterval` is provided in the report config, an auto-refresh toggle appears:

```tsx
{
  id: 'live-report',
  title: 'Live Metrics',
  updateInterval: 5000, // Refresh every 5 seconds
  // ... other config
}
```

---

## DataExport

Export data to multiple formats with configurable options.

### Basic Usage

```tsx
import { DataExport } from '@/components/analytics/DataExport';

function ExportSection() {
  const data = [
    { id: 1, name: 'Item 1', value: 100, date: '2024-01-01' },
    { id: 2, name: 'Item 2', value: 200, date: '2024-01-02' }
  ];

  const handleExport = (data: any[], options: ExportOptions) => {
    // Custom export logic
    if (options.format === 'pdf') {
      generatePDF(data, options);
    } else if (options.format === 'excel') {
      generateExcel(data, options);
    }
  };

  return (
    <DataExport
      data={data}
      filename="my-report"
      onExport={handleExport}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `any[]` | Yes | Array of data to export |
| `filename` | `string` | No | Base filename (default: 'export') |
| `onExport` | `(data, options) => void` | No | Custom export handler |
| `className` | `string` | No | Additional CSS classes |

### Export Options

```typescript
interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  includeHeaders?: boolean;
  dateFormat?: 'ISO' | 'US' | 'EU' | 'timestamp';
  compression?: boolean;
}
```

### Supported Formats

- **CSV**: Comma-separated values, Excel-compatible
- **JSON**: JavaScript Object Notation
- **PDF**: Requires custom implementation
- **Excel**: Requires custom implementation (.xlsx)

### Date Formats

- **ISO**: `2024-01-04T12:00:00Z`
- **US**: `01/04/2024`
- **EU**: `04/01/2024`
- **timestamp**: Unix timestamp (e.g., `1704369600`)

### Default Export

If `onExport` is not provided, CSV and JSON formats work automatically:

```tsx
<DataExport data={data} />
// Clicking CSV/JSON will download file directly
```

### Custom Export Example

```tsx
const handleExport = async (data: any[], options: ExportOptions) => {
  if (options.format === 'pdf') {
    // Use a PDF library like jsPDF
    const doc = new jsPDF();
    // Add data to PDF
    doc.save(`${filename}.pdf`);
  } else if (options.format === 'excel') {
    // Use a library like xlsx
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
};
```

---

## RealtimeMetrics

Monitor live metrics with status indicators, sparklines, and automatic updates.

### Basic Usage

```tsx
import { RealtimeMetrics } from '@/components/analytics/RealtimeMetrics';

function LiveMonitoring() {
  const metrics = [
    {
      id: 'active-users',
      label: 'Active Users',
      value: 45,
      history: [40, 42, 43, 44, 45],
      unit: 'users',
      color: '#3b82f6',
      threshold: {
        warning: 80,
        critical: 100
      }
    },
    {
      id: 'response-time',
      label: 'Response Time',
      value: 125,
      history: [120, 122, 123, 124, 125],
      unit: 'ms',
      color: '#10b981'
    }
  ];

  const fetchUpdate = async (metricId: string): Promise<number> => {
    // Fetch latest value for metric
    const response = await fetch(`/api/metrics/${metricId}`);
    const data = await response.json();
    return data.value;
  };

  return (
    <RealtimeMetrics
      metrics={metrics}
      onUpdate={fetchUpdate}
      updateInterval={5000}  // 5 seconds
      maxHistoryLength={60}  // Keep last 60 data points
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `metrics` | `RealtimeMetric[]` | Yes | Array of metrics to monitor |
| `onUpdate` | `(id: string) => Promise<number>` | No | Fetch latest value |
| `updateInterval` | `number` | No | Update frequency in ms (default: 5000) |
| `maxHistoryLength` | `number` | No | History size (default: 60) |
| `className` | `string` | No | Additional CSS classes |

### Realtime Metric Type

```typescript
interface RealtimeMetric {
  id: string;
  label: string;
  value: number;
  history: number[];
  unit?: string;
  color?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}
```

### Status Indicators

- **NORMAL**: Value below warning threshold (green)
- **WARNING**: Value ≥ warning threshold (yellow)
- **CRITICAL**: Value ≥ critical threshold (red)

### Statistics Display

Each metric card shows:
- **Min**: Minimum value in history
- **Max**: Maximum value in history
- **Avg**: Average value in history

### Pause/Resume

- Click "Pause" to stop automatic updates
- Click "Resume" to restart updates
- Live indicator pulse shows when active

### Sparkline Charts

Mini line charts visualize the history trend for each metric.

---

## QueryBuilder

Visual query interface with filters, aggregations, grouping, and sorting.

### Basic Usage

```tsx
import { QueryBuilder } from '@/components/analytics/QueryBuilder';

function DataAnalysis() {
  const fields = [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'value', type: 'number' },
    { name: 'date', type: 'date' },
    { name: 'active', type: 'boolean' }
  ];

  const data = [
    { id: 1, name: 'Item 1', value: 100, date: '2024-01-01', active: true },
    { id: 2, name: 'Item 2', value: 200, date: '2024-01-02', active: false },
    // ... more data
  ];

  const handleQuery = (results: any[]) => {
    console.log('Query results:', results);
    // Process results
  };

  return (
    <QueryBuilder
      fields={fields}
      data={data}
      onQuery={handleQuery}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fields` | `Field[]` | Yes | Available fields for querying |
| `data` | `any[]` | Yes | Data to query |
| `onQuery` | `(results: any[]) => void` | No | Callback with query results |
| `className` | `string` | No | Additional CSS classes |

### Field Type

```typescript
interface Field {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}
```

### Filter Operators

- **equals**: Exact match
- **notEquals**: Not equal to
- **contains**: String contains (case-insensitive)
- **greaterThan**: Numeric comparison
- **lessThan**: Numeric comparison
- **between**: Range (requires [min, max] array)
- **in**: Value in array

### Aggregation Functions

- **sum**: Total of numeric values
- **avg**: Average of numeric values
- **min**: Minimum value
- **max**: Maximum value
- **count**: Count of rows

### Query Example

```tsx
// Build query with filters
// Field: "value", Operator: "greaterThan", Value: "100"
// Field: "name", Operator: "contains", Value: "Item"

// Group By: ["date"]

// Aggregation: SUM(value) AS total_value

// Result:
[
  { date: '2024-01-01', total_value: 300 },
  { date: '2024-01-02', total_value: 500 }
]
```

### Results Preview

- First 10 rows displayed in table format
- Full result count shown
- Execute button shows result count

### Advanced Features

- Multiple filters (AND logic)
- Multiple aggregations
- Multiple group by fields
- Result limit control
- Real-time query execution

---

## Integration Examples

### Dashboard with Export

```tsx
import { ReportingDashboard } from '@/components/analytics/ReportingDashboard';
import { DataExport } from '@/components/analytics/DataExport';

function IntegratedDashboard() {
  const [reports, setReports] = useState(initialReports);
  const [exportData, setExportData] = useState([]);

  const handleExport = (reportId: string, format: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Prepare data for export
    const data = report.metrics.map(m => ({
      metric: m.label,
      value: m.value,
      change: m.change,
      trend: m.trend
    }));

    setExportData(data);
  };

  return (
    <div className="space-y-6">
      <ReportingDashboard
        reports={reports}
        onExport={handleExport}
      />
      
      {exportData.length > 0 && (
        <DataExport data={exportData} filename="dashboard-export" />
      )}
    </div>
  );
}
```

### Real-time Dashboard

```tsx
function RealtimeDashboard() {
  const [liveMetrics, setLiveMetrics] = useState(initialMetrics);

  const fetchMetricUpdate = async (metricId: string) => {
    const response = await fetch(`/api/metrics/${metricId}/live`);
    const data = await response.json();
    return data.value;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportingDashboard reports={staticReports} />
      <RealtimeMetrics
        metrics={liveMetrics}
        onUpdate={fetchMetricUpdate}
        updateInterval={3000}
      />
    </div>
  );
}
```

### Query to Export

```tsx
function QueryAndExport() {
  const [queryResults, setQueryResults] = useState([]);

  return (
    <div className="space-y-6">
      <QueryBuilder
        fields={fields}
        data={rawData}
        onQuery={setQueryResults}
      />
      
      {queryResults.length > 0 && (
        <DataExport
          data={queryResults}
          filename="query-results"
        />
      )}
    </div>
  );
}
```

---

## Best Practices

### Performance

1. **Memoize Large Datasets**
   ```tsx
   const memoizedData = useMemo(() => 
     processLargeDataset(rawData),
     [rawData]
   );
   ```

2. **Debounce Real-time Updates**
   ```tsx
   const updateInterval = 5000; // Don't update more than every 5s
   ```

3. **Limit Result Sets**
   ```tsx
   <QueryBuilder
     data={data}
     // Default limit prevents performance issues
   />
   ```

4. **Use Virtual Scrolling for Large Tables**
   ```tsx
   import { FixedSizeList } from 'react-window';
   ```

### Data Management

1. **Validate Data Before Rendering**
   ```tsx
   const validMetrics = metrics.filter(m => 
     m.value !== undefined && !isNaN(m.value)
   );
   ```

2. **Handle Missing Data Gracefully**
   ```tsx
   const value = metric.value ?? 0;
   const change = metric.change ?? null;
   ```

3. **Use TypeScript for Type Safety**
   ```tsx
   interface CustomMetric extends Metric {
     customField: string;
   }
   ```

### User Experience

1. **Provide Loading States**
   ```tsx
   {isLoading ? <Spinner /> : <ReportingDashboard reports={reports} />}
   ```

2. **Show Empty States**
   ```tsx
   {reports.length === 0 && (
     <EmptyState message="No reports available" />
   )}
   ```

3. **Display Error Messages**
   ```tsx
   {error && <Alert type="error">{error.message}</Alert>}
   ```

4. **Use Tooltips for Metrics**
   ```tsx
   <Tooltip content="Revenue from all sources">
     <span>{metric.label}</span>
   </Tooltip>
   ```

### Accessibility

1. **Add ARIA Labels**
   ```tsx
   <button aria-label="Refresh dashboard">
     <RefreshIcon />
   </button>
   ```

2. **Support Keyboard Navigation**
   ```tsx
   onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
   ```

3. **Ensure Color Contrast**
   - Text: 4.5:1 ratio minimum
   - Large text: 3:1 ratio minimum

4. **Provide Alternative Text**
   ```tsx
   <img src="/chart.png" alt="Revenue trend showing 15% increase" />
   ```

---

## Performance Optimization

### Chart Rendering

1. **Limit Data Points**
   ```tsx
   const chartData = fullData.slice(-100); // Last 100 points
   ```

2. **Use SVG for Small Charts**
   - Better for < 1000 data points
   - Crisp rendering at any scale

3. **Use Canvas for Large Datasets**
   - Better for > 1000 data points
   - Faster rendering

### Memory Management

1. **Cleanup Intervals**
   ```tsx
   useEffect(() => {
     const interval = setInterval(fetch, 5000);
     return () => clearInterval(interval);
   }, []);
   ```

2. **Limit History Size**
   ```tsx
   const history = [...oldHistory, newValue].slice(-60);
   ```

3. **Virtualize Long Lists**
   - Only render visible items
   - Reduce DOM nodes

### Network Optimization

1. **Batch API Requests**
   ```tsx
   const updates = await Promise.all(
     metrics.map(m => fetchUpdate(m.id))
   );
   ```

2. **Use WebSockets for Real-time**
   ```tsx
   const ws = new WebSocket('wss://api.example.com/metrics');
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     updateMetric(data);
   };
   ```

3. **Implement Caching**
   ```tsx
   const cache = new Map();
   if (cache.has(reportId)) {
     return cache.get(reportId);
   }
   ```

### Bundle Size

Components are tree-shakeable:
```tsx
// Import only what you need
import { ReportingDashboard } from '@/components/analytics/ReportingDashboard';
// Not the entire analytics bundle
```

---

## Troubleshooting

### Charts Not Rendering

**Problem**: Charts appear blank or don't render

**Solutions**:
1. Check data format matches ChartData type
2. Ensure data array is not empty
3. Verify numeric values in data.y
4. Check SVG viewBox dimensions

### Real-time Updates Not Working

**Problem**: Metrics don't update automatically

**Solutions**:
1. Ensure `onUpdate` prop is provided
2. Check `updateInterval` is set
3. Verify API endpoint returns numbers
4. Check browser console for errors

### Export Not Working

**Problem**: Export button does nothing

**Solutions**:
1. Check `onExport` prop is implemented
2. Verify data array is not empty
3. For PDF/Excel, ensure library is installed
4. Check browser allows downloads

### Performance Issues

**Problem**: Dashboard is slow or laggy

**Solutions**:
1. Reduce `updateInterval` (increase time between updates)
2. Limit chart data points
3. Use React.memo for expensive components
4. Enable production build optimizations

---

## API Reference

### ReportingDashboard

```tsx
<ReportingDashboard
  reports={Report[]}
  onRefresh?={async () => void}
  onExport?={(reportId: string, format: 'csv'|'pdf'|'json') => void}
  className?={string}
/>
```

### DataExport

```tsx
<DataExport
  data={any[]}
  filename?={string}
  onExport?={(data: any[], options: ExportOptions) => void}
  className?={string}
/>
```

### RealtimeMetrics

```tsx
<RealtimeMetrics
  metrics={RealtimeMetric[]}
  onUpdate?={async (metricId: string) => number}
  updateInterval?={number}
  maxHistoryLength?={number}
  className?={string}
/>
```

### QueryBuilder

```tsx
<QueryBuilder
  fields={Field[]}
  data={any[]}
  onQuery?={(results: any[]) => void}
  className?={string}
/>
```

---

## Testing

The analytics system includes 80+ comprehensive tests covering:

- Component rendering
- User interactions
- Data formatting
- Real-time updates
- Export functionality
- Query execution
- Accessibility
- Error handling

Run tests:
```bash
npm test ReportingAnalytics.test.tsx
```

---

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile browsers: iOS 14+, Android 8+

---

## Dependencies

- React 19.2.3
- TypeScript 5.x
- No external charting libraries required
- Optional: jsPDF, xlsx for advanced exports

---

## License

Part of the Vfide project. See LICENSE for details.

---

**Need Help?**
- Check the troubleshooting section
- Review the integration examples
- Consult the API reference
- Run the test suite to verify setup

**Version**: 1.0.0 (Phase 3, Item #17)
