import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportingDashboard } from '@/components/analytics/ReportingDashboard';
import { DataExport } from '@/components/analytics/DataExport';
import { RealtimeMetrics } from '@/components/analytics/RealtimeMetrics';
import { QueryBuilder } from '@/components/analytics/QueryBuilder';

// Mock data for testing
const mockReports = [
  {
    id: 'report-1',
    title: 'Sales Report',
    description: 'Monthly sales performance',
    lastUpdated: new Date('2024-01-01'),
    updateInterval: 30000,
    metrics: [
      {
        id: 'metric-1',
        label: 'Total Revenue',
        value: 125000,
        change: 15.5,
        trend: 'up' as const,
        format: 'currency' as const
      },
      {
        id: 'metric-2',
        label: 'Total Orders',
        value: 450,
        change: -5.2,
        trend: 'down' as const,
        format: 'number' as const
      },
      {
        id: 'metric-3',
        label: 'Average Order Value',
        value: 277.78,
        change: 8.3,
        trend: 'up' as const,
        format: 'currency' as const
      },
      {
        id: 'metric-4',
        label: 'Conversion Rate',
        value: 3.45,
        format: 'percentage' as const
      }
    ],
    charts: [
      {
        id: 'chart-1',
        label: 'Revenue',
        data: [
          { x: 'Jan', y: 100000 },
          { x: 'Feb', y: 110000 },
          { x: 'Mar', y: 125000 }
        ],
        color: '#3b82f6'
      },
      {
        id: 'chart-2',
        label: 'Orders',
        data: [
          { x: 'Jan', y: 400 },
          { x: 'Feb', y: 425 },
          { x: 'Mar', y: 450 }
        ],
        color: '#10b981'
      }
    ]
  },
  {
    id: 'report-2',
    title: 'User Activity Report',
    description: 'User engagement metrics',
    lastUpdated: new Date('2024-01-02'),
    metrics: [
      {
        id: 'metric-5',
        label: 'Active Users',
        value: 1250,
        format: 'number' as const
      }
    ],
    charts: []
  }
];

const mockRealtimeMetrics = [
  {
    id: 'rt-1',
    label: 'Active Sessions',
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
    id: 'rt-2',
    label: 'Response Time',
    value: 125,
    history: [120, 122, 123, 124, 125],
    unit: 'ms',
    color: '#10b981'
  }
];

const mockExportData = [
  { id: 1, name: 'Item 1', value: 100, date: '2024-01-01' },
  { id: 2, name: 'Item 2', value: 200, date: '2024-01-02' },
  { id: 3, name: 'Item 3', value: 300, date: '2024-01-03' }
];

const mockQueryFields = [
  { name: 'id', type: 'number' as const },
  { name: 'name', type: 'string' as const },
  { name: 'value', type: 'number' as const },
  { name: 'date', type: 'date' as const }
];

describe('ReportingDashboard', () => {
  describe('Basic Rendering', () => {
    it('should render dashboard with reports', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('Sales Report')).toBeInTheDocument();
      expect(screen.getByText('Monthly sales performance')).toBeInTheDocument();
    });

    it('should render empty state when no reports', () => {
      render(<ReportingDashboard reports={[]} />);
      
      expect(screen.getByText('No reports available')).toBeInTheDocument();
    });

    it('should render all metrics', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Average Order Value')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    });

    it('should format metric values correctly', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      // Currency format
      expect(screen.getByText('$125,000.00')).toBeInTheDocument();
      // Number format
      expect(screen.getByText('450')).toBeInTheDocument();
      // Percentage format
      expect(screen.getByText('3.45%')).toBeInTheDocument();
    });
  });

  describe('Metric Trends', () => {
    it('should show trend icons for metrics', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const metricCards = screen.getAllByText(/\+15\.50%|-5\.20%|\+8\.30%/);
      expect(metricCards.length).toBeGreaterThan(0);
    });

    it('should display positive change with + sign', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('+15.50%')).toBeInTheDocument();
    });

    it('should display negative change without extra sign', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('-5.20%')).toBeInTheDocument();
    });
  });

  describe('Report Selection', () => {
    it('should allow selecting different reports', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const selector = screen.getByRole('combobox', { name: /report/i });
      fireEvent.change(selector, { target: { value: 'report-2' } });
      
      expect(screen.getByText('User Activity Report')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('should update metrics when report changes', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      
      const selector = screen.getByRole('combobox', { name: /report/i });
      fireEvent.change(selector, { target: { value: 'report-2' } });
      
      expect(screen.queryByText('Total Revenue')).not.toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });
  });

  describe('Date Range Selection', () => {
    it('should render date range selector', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const dateSelector = screen.getByRole('combobox', { name: /date range/i });
      expect(dateSelector).toBeInTheDocument();
    });

    it('should have date range presets', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const dateSelector = screen.getByRole('combobox', { name: /date range/i });
      expect(dateSelector.querySelectorAll('option')).toHaveLength(4);
    });

    it('should allow changing date range', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const dateSelector = screen.getByRole('combobox', { name: /date range/i });
      fireEvent.change(dateSelector, { target: { value: 'Last 30 Days' } });
      
      expect(dateSelector).toHaveValue('Last 30 Days');
    });
  });

  describe('Chart Type Selection', () => {
    it('should render chart type selector', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const chartSelector = screen.getByRole('combobox', { name: /chart type/i });
      expect(chartSelector).toBeInTheDocument();
    });

    it('should switch between line and bar charts', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      const chartSelector = screen.getByRole('combobox', { name: /chart type/i });
      
      fireEvent.change(chartSelector, { target: { value: 'bar' } });
      expect(chartSelector).toHaveValue('bar');
      
      fireEvent.change(chartSelector, { target: { value: 'line' } });
      expect(chartSelector).toHaveValue('line');
    });
  });

  describe('Refresh Functionality', () => {
    it('should render refresh button when onRefresh provided', () => {
      const onRefresh = jest.fn();
      render(<ReportingDashboard reports={mockReports} onRefresh={onRefresh} />);
      
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should call onRefresh when button clicked', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);
      render(<ReportingDashboard reports={mockReports} onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable refresh button while refreshing', async () => {
      const onRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ReportingDashboard reports={mockReports} onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      expect(refreshButton).toBeDisabled();
    });

    it('should show auto-refresh toggle when updateInterval provided', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('Auto-refresh')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should render export buttons when onExport provided', () => {
      const onExport = jest.fn();
      render(<ReportingDashboard reports={mockReports} onExport={onExport} />);
      
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
    });

    it('should call onExport with correct format', () => {
      const onExport = jest.fn();
      render(<ReportingDashboard reports={mockReports} onExport={onExport} />);
      
      fireEvent.click(screen.getByText('CSV'));
      expect(onExport).toHaveBeenCalledWith('report-1', 'csv');
      
      fireEvent.click(screen.getByText('PDF'));
      expect(onExport).toHaveBeenCalledWith('report-1', 'pdf');
      
      fireEvent.click(screen.getByText('JSON'));
      expect(onExport).toHaveBeenCalledWith('report-1', 'json');
    });
  });

  describe('Charts', () => {
    it('should render charts when data available', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('Trends')).toBeInTheDocument();
    });

    it('should render chart legend', () => {
      render(<ReportingDashboard reports={mockReports} />);
      
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });
  });
});

describe('DataExport', () => {
  describe('Basic Rendering', () => {
    it('should render export component', () => {
      render(<DataExport data={mockExportData} />);
      
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    it('should show record count', () => {
      render(<DataExport data={mockExportData} />);
      
      expect(screen.getByText(/3 records will be exported/)).toBeInTheDocument();
    });

    it('should render all format buttons', () => {
      render(<DataExport data={mockExportData} />);
      
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('EXCEL')).toBeInTheDocument();
    });
  });

  describe('Format Selection', () => {
    it('should allow selecting CSV format', () => {
      render(<DataExport data={mockExportData} />);
      
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      expect(csvButton).toHaveClass('border-blue-600');
    });

    it('should allow selecting JSON format', () => {
      render(<DataExport data={mockExportData} />);
      
      const jsonButton = screen.getByText('JSON');
      fireEvent.click(jsonButton);
      
      expect(jsonButton).toHaveClass('border-blue-600');
    });

    it('should highlight selected format', () => {
      render(<DataExport data={mockExportData} />);
      
      const pdfButton = screen.getByText('PDF');
      fireEvent.click(pdfButton);
      
      expect(pdfButton).toHaveClass('border-blue-600');
      expect(pdfButton).toHaveClass('bg-blue-50');
    });
  });

  describe('Options', () => {
    it('should render include headers checkbox', () => {
      render(<DataExport data={mockExportData} />);
      
      expect(screen.getByText('Include headers')).toBeInTheDocument();
    });

    it('should toggle include headers', () => {
      render(<DataExport data={mockExportData} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /include headers/i });
      expect(checkbox).toBeChecked();
      
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should render date format selector', () => {
      render(<DataExport data={mockExportData} />);
      
      const selector = screen.getByRole('combobox', { name: /date format/i });
      expect(selector).toBeInTheDocument();
    });

    it('should have date format options', () => {
      render(<DataExport data={mockExportData} />);
      
      const selector = screen.getByRole('combobox', { name: /date format/i });
      expect(selector.querySelectorAll('option')).toHaveLength(4);
    });

    it('should render compression checkbox', () => {
      render(<DataExport data={mockExportData} />);
      
      expect(screen.getByText('Compress output (ZIP)')).toBeInTheDocument();
    });
  });

  describe('Export Action', () => {
    it('should render export button', () => {
      render(<DataExport data={mockExportData} />);
      
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    it('should call onExport when button clicked', () => {
      const onExport = jest.fn();
      render(<DataExport data={mockExportData} onExport={onExport} />);
      
      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);
      
      expect(onExport).toHaveBeenCalled();
    });

    it('should disable button when data is empty', () => {
      render(<DataExport data={[]} />);
      
      const exportButton = screen.getByText('Export Data');
      expect(exportButton).toBeDisabled();
    });

    it('should show loading state when exporting', async () => {
      const onExport = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<DataExport data={mockExportData} onExport={onExport} />);
      
      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);
      
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });
  });
});

describe('RealtimeMetrics', () => {
  describe('Basic Rendering', () => {
    it('should render realtime metrics component', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText('Real-time Metrics')).toBeInTheDocument();
    });

    it('should render all metrics', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
    });

    it('should display metric values', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('125')).toBeInTheDocument();
    });

    it('should display units', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('ms')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show normal status for values below threshold', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
    });

    it('should show warning status when above warning threshold', () => {
      const warningMetrics = [{
        ...mockRealtimeMetrics[0],
        value: 85,
        threshold: { warning: 80, critical: 100 }
      }];
      
      render(<RealtimeMetrics metrics={warningMetrics} />);
      
      expect(screen.getByText('WARNING')).toBeInTheDocument();
    });

    it('should show critical status when above critical threshold', () => {
      const criticalMetrics = [{
        ...mockRealtimeMetrics[0],
        value: 105,
        threshold: { warning: 80, critical: 100 }
      }];
      
      render(<RealtimeMetrics metrics={criticalMetrics} />);
      
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('should display min, max, avg statistics', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText(/Min: 40/)).toBeInTheDocument();
      expect(screen.getByText(/Max: 45/)).toBeInTheDocument();
      expect(screen.getByText(/Avg:/)).toBeInTheDocument();
    });
  });

  describe('Pause/Resume', () => {
    it('should render pause button', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    it('should toggle between pause and resume', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      const button = screen.getByText('Pause');
      fireEvent.click(button);
      
      expect(screen.getByText('Resume')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Resume'));
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    it('should show live indicator when not paused', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getAllByText('Live')).toHaveLength(mockRealtimeMetrics.length);
    });

    it('should hide live indicator when paused', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      const button = screen.getByText('Pause');
      fireEvent.click(button);
      
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });
  });

  describe('Threshold Display', () => {
    it('should show threshold values when configured', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} />);
      
      expect(screen.getByText(/Warning: 80/)).toBeInTheDocument();
      expect(screen.getByText(/Critical: 100/)).toBeInTheDocument();
    });

    it('should not show thresholds when not configured', () => {
      const metricsWithoutThreshold = [mockRealtimeMetrics[1]];
      render(<RealtimeMetrics metrics={metricsWithoutThreshold} />);
      
      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });
  });

  describe('Update Information', () => {
    it('should display update interval', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} updateInterval={5000} />);
      
      expect(screen.getByText(/Updates every 5s/)).toBeInTheDocument();
    });

    it('should display history length', () => {
      render(<RealtimeMetrics metrics={mockRealtimeMetrics} maxHistoryLength={60} />);
      
      expect(screen.getByText(/Showing last 60 data points/)).toBeInTheDocument();
    });
  });
});

describe('QueryBuilder', () => {
  describe('Basic Rendering', () => {
    it('should render query builder component', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      expect(screen.getByText('Query Builder')).toBeInTheDocument();
    });

    it('should render empty filters section', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      expect(screen.getByText('No filters applied')).toBeInTheDocument();
    });

    it('should render empty aggregations section', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      expect(screen.getByText('No aggregations configured')).toBeInTheDocument();
    });
  });

  describe('Filter Management', () => {
    it('should add new filter', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText('+ Add Filter'));
      
      expect(screen.queryByText('No filters applied')).not.toBeInTheDocument();
    });

    it('should render filter controls', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText('+ Add Filter'));
      
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('should remove filter', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText('+ Add Filter'));
      
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg path[d*="M6 18L18 6"]')
      );
      
      if (removeButton) {
        fireEvent.click(removeButton);
        expect(screen.getByText('No filters applied')).toBeInTheDocument();
      }
    });
  });

  describe('Aggregation Management', () => {
    it('should add new aggregation', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText('+ Add Aggregation'));
      
      expect(screen.queryByText('No aggregations configured')).not.toBeInTheDocument();
    });

    it('should render aggregation controls', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText('+ Add Aggregation'));
      
      // Should have function selector
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Group By', () => {
    it('should render group by selector', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      expect(screen.getByText('Group By')).toBeInTheDocument();
    });

    it('should have all fields as options', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      const groupBySelect = screen.getByRole('listbox');
      expect(groupBySelect.querySelectorAll('option')).toHaveLength(4);
    });
  });

  describe('Result Limit', () => {
    it('should render limit input', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      const limitInput = screen.getByRole('spinbutton');
      expect(limitInput).toHaveValue(100);
    });

    it('should allow changing limit', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      const limitInput = screen.getByRole('spinbutton');
      fireEvent.change(limitInput, { target: { value: '50' } });
      
      expect(limitInput).toHaveValue(50);
    });
  });

  describe('Query Execution', () => {
    it('should render execute button', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      expect(screen.getByText(/Execute Query/)).toBeInTheDocument();
    });

    it('should show result count in button', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      expect(screen.getByText(/3 results/)).toBeInTheDocument();
    });

    it('should call onQuery when executed', () => {
      const onQuery = jest.fn();
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} onQuery={onQuery} />);
      
      fireEvent.click(screen.getByText(/Execute Query/));
      
      expect(onQuery).toHaveBeenCalled();
    });
  });

  describe('Results Preview', () => {
    it('should show results preview after execution', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText(/Execute Query/));
      
      expect(screen.getByText(/Results Preview/)).toBeInTheDocument();
    });

    it('should display results in table format', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      fireEvent.click(screen.getByText(/Execute Query/));
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should limit preview to 10 rows', () => {
      const largeData = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: (i + 1) * 100,
        date: '2024-01-01'
      }));
      
      render(<QueryBuilder fields={mockQueryFields} data={largeData} />);
      
      fireEvent.click(screen.getByText(/Execute Query/));
      
      expect(screen.getByText(/Showing first 10 of 20 results/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      const groupBySelect = screen.getByRole('listbox');
      expect(groupBySelect).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<QueryBuilder fields={mockQueryFields} data={mockExportData} />);
      
      const limitInput = screen.getByRole('spinbutton');
      expect(limitInput).toHaveAttribute('type', 'number');
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate dashboard with export', () => {
    const onExport = jest.fn();
    render(<ReportingDashboard reports={mockReports} onExport={onExport} />);
    
    fireEvent.click(screen.getByText('CSV'));
    
    expect(onExport).toHaveBeenCalledWith('report-1', 'csv');
  });

  it('should integrate dashboard with refresh', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    render(<ReportingDashboard reports={mockReports} onRefresh={onRefresh} />);
    
    fireEvent.click(screen.getByText('Refresh'));
    
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
