/**
 * Performance Metrics API Route
 * 
 * Receives and stores performance metrics from the client.
 */

import { NextRequest, NextResponse } from 'next/server';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  navigationType?: string;
}

interface MetricReport {
  metric: PerformanceMetric;
  timestamp: number;
  url: string;
  userAgent?: string;
}

// In-memory storage (use database in production)
const metricsStore: MetricReport[] = [];
const MAX_METRICS = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const report: MetricReport = {
      metric: body.metric,
      timestamp: body.timestamp || Date.now(),
      url: body.url,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    metricsStore.push(report);

    // Keep only recent metrics
    if (metricsStore.length > MAX_METRICS) {
      metricsStore.shift();
    }

    // In production, send to monitoring service:
    // await sendToDatadog(report);
    // await sendToNewRelic(report);
    // await sendToGoogleAnalytics(report);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error storing performance metric:', error);
    return NextResponse.json(
      { error: 'Failed to store metric' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Development only: view recent metrics
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
  const metricName = request.nextUrl.searchParams.get('metric');

  let filtered = metricsStore;
  if (metricName) {
    filtered = metricsStore.filter(m => m.metric.name === metricName);
  }

  const recent = filtered.slice(-limit).reverse();

  // Calculate aggregates
  const grouped = recent.reduce((acc, report) => {
    const name = report.metric.name;
    if (!acc[name]) {
      acc[name] = {
        count: 0,
        values: [],
        good: 0,
        needsImprovement: 0,
        poor: 0,
      };
    }
    
    acc[name].count++;
    acc[name].values.push(report.metric.value);
    
    if (report.metric.rating === 'good') acc[name].good++;
    else if (report.metric.rating === 'needs-improvement') acc[name].needsImprovement++;
    else acc[name].poor++;

    return acc;
  }, {} as Record<string, any>);

  // Calculate statistics
  const stats = Object.entries(grouped).map(([name, data]) => ({
    name,
    count: data.count,
    avg: data.values.reduce((a: number, b: number) => a + b, 0) / data.count,
    min: Math.min(...data.values),
    max: Math.max(...data.values),
    p50: calculatePercentile(data.values, 50),
    p75: calculatePercentile(data.values, 75),
    p95: calculatePercentile(data.values, 95),
    good: data.good,
    needsImprovement: data.needsImprovement,
    poor: data.poor,
    goodPercent: ((data.good / data.count) * 100).toFixed(1),
  }));

  return NextResponse.json({
    total: metricsStore.length,
    filtered: recent.length,
    metrics: recent,
    statistics: stats,
  });
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}
