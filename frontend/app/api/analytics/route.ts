/**
 * Analytics API
 * 
 * Endpoints for fetching analytics data and metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  MetricType,
  TimeRange,
  getMetricSummary,
  getTimeSeriesData,
  getPlatformAnalytics,
  getUserAnalytics,
  getTimeRangeBounds,
} from '@/lib/analytics';

// ============================================================================
// GET - Fetch analytics data
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'metrics';
    
    // Metric summary endpoint
    if (endpoint === 'metrics') {
      const type = searchParams.get('type') as MetricType;
      const range = (searchParams.get('range') as TimeRange) || TimeRange.DAY;
      
      if (!type) {
        return NextResponse.json(
          { success: false, error: 'type is required' },
          { status: 400 }
        );
      }
      
      const summary = getMetricSummary(type, range);
      
      return NextResponse.json({
        success: true,
        summary,
      });
    }
    
    // Time series endpoint
    if (endpoint === 'timeseries') {
      const type = searchParams.get('type') as MetricType;
      const range = (searchParams.get('range') as TimeRange) || TimeRange.DAY;
      
      if (!type) {
        return NextResponse.json(
          { success: false, error: 'type is required' },
          { status: 400 }
        );
      }
      
      // Determine interval based on range
      let interval: number;
      switch (range) {
        case TimeRange.HOUR:
          interval = 5 * 60 * 1000; // 5 minutes
          break;
        case TimeRange.DAY:
          interval = 60 * 60 * 1000; // 1 hour
          break;
        case TimeRange.WEEK:
          interval = 6 * 60 * 60 * 1000; // 6 hours
          break;
        case TimeRange.MONTH:
          interval = 24 * 60 * 60 * 1000; // 1 day
          break;
        case TimeRange.YEAR:
          interval = 7 * 24 * 60 * 60 * 1000; // 1 week
          break;
        default:
          interval = 24 * 60 * 60 * 1000; // 1 day
      }
      
      const data = getTimeSeriesData(type, range, interval);
      
      return NextResponse.json({
        success: true,
        data,
        interval,
      });
    }
    
    // Platform analytics endpoint
    if (endpoint === 'platform') {
      const range = (searchParams.get('range') as TimeRange) || TimeRange.DAY;
      const analytics = getPlatformAnalytics(range);
      
      return NextResponse.json({
        success: true,
        analytics,
      });
    }
    
    // User analytics endpoint
    if (endpoint === 'user') {
      const userId = searchParams.get('userId');
      const range = (searchParams.get('range') as TimeRange) || TimeRange.ALL;
      
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'userId is required' },
          { status: 400 }
        );
      }
      
      const analytics = getUserAnalytics(userId, range);
      
      return NextResponse.json({
        success: true,
        analytics,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid endpoint' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
