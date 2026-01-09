#!/bin/bash

# Performance Testing Script for VFIDE
# Tests various performance metrics including Lighthouse, load testing, and bundle analysis

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
WEBSOCKET_DIR="websocket-server"
RESULTS_DIR="performance-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VFIDE Performance Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# 1. Bundle Size Analysis
echo -e "${YELLOW}[1/5] Analyzing bundle sizes...${NC}"
cd "$FRONTEND_DIR"

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: frontend/package.json not found${NC}"
    exit 1
fi

# Run build with bundle analyzer
echo "Building frontend with bundle analyzer..."
ANALYZE=true npm run build > "../$RESULTS_DIR/bundle-analysis-$TIMESTAMP.log" 2>&1 || true

# Check bundle sizes
echo "Checking JavaScript bundle sizes..."
if [ -d ".next/static" ]; then
    TOTAL_JS_SIZE=$(find .next/static -name "*.js" -type f -exec du -ch {} + | grep total$ | cut -f1)
    echo -e "${GREEN}✓ Total JavaScript bundle size: $TOTAL_JS_SIZE${NC}"
    echo "JS Bundle Size: $TOTAL_JS_SIZE" >> "../$RESULTS_DIR/metrics-$TIMESTAMP.txt"
else
    echo -e "${RED}✗ Build output not found${NC}"
fi

cd ..

# 2. Lighthouse CI
echo ""
echo -e "${YELLOW}[2/5] Running Lighthouse audits...${NC}"

# Check if lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    echo "Installing Lighthouse CLI..."
    npm install -g @lhci/cli lighthouse
fi

# Start the application
echo "Starting frontend server..."
cd "$FRONTEND_DIR"
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 10

# Run Lighthouse on key pages
PAGES=("/" "/governance" "/council" "/chat")
for page in "${PAGES[@]}"; do
    PAGE_NAME=$(echo "$page" | sed 's/\//-/g')
    [ -z "$PAGE_NAME" ] && PAGE_NAME="home"
    
    echo "Auditing: http://localhost:3000$page"
    lighthouse "http://localhost:3000$page" \
        --output=json \
        --output=html \
        --output-path="$RESULTS_DIR/lighthouse-$PAGE_NAME-$TIMESTAMP" \
        --chrome-flags="--headless --no-sandbox" \
        --quiet || true
done

# Stop frontend server
kill $FRONTEND_PID 2>/dev/null || true

echo -e "${GREEN}✓ Lighthouse audits complete${NC}"

# 3. Load Testing (Artillery)
echo ""
echo -e "${YELLOW}[3/5] Running load tests...${NC}"

# Check if artillery is installed
if ! command -v artillery &> /dev/null; then
    echo "Installing Artillery..."
    npm install -g artillery
fi

# Create artillery config
cat > "$RESULTS_DIR/artillery-config-$TIMESTAMP.yml" << EOF
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"
  http:
    timeout: 10
scenarios:
  - name: "Browse pages"
    flow:
      - get:
          url: "/"
      - think: 2
      - get:
          url: "/governance"
      - think: 2
      - get:
          url: "/council"
      - think: 2
      - get:
          url: "/chat"
EOF

# Start frontend for load testing
echo "Starting frontend for load testing..."
cd "$FRONTEND_DIR"
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 10

echo "Running Artillery load test..."
artillery run "$RESULTS_DIR/artillery-config-$TIMESTAMP.yml" \
    --output "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" || true

# Generate HTML report
if [ -f "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" ]; then
    artillery report "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" \
        --output "$RESULTS_DIR/artillery-report-$TIMESTAMP.html" || true
    echo -e "${GREEN}✓ Load test complete${NC}"
else
    echo -e "${YELLOW}⚠ Load test results not generated${NC}"
fi

# Stop frontend
kill $FRONTEND_PID 2>/dev/null || true

# 4. Memory Profiling
echo ""
echo -e "${YELLOW}[4/5] Memory profiling...${NC}"

# Start frontend with memory profiling
cd "$FRONTEND_DIR"
node --expose-gc --max-old-space-size=512 node_modules/.bin/next start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 10

# Monitor memory usage
echo "Monitoring memory usage for 30 seconds..."
for i in {1..30}; do
    if ps -p $FRONTEND_PID > /dev/null; then
        MEMORY=$(ps -o rss= -p $FRONTEND_PID | awk '{print $1/1024 " MB"}')
        echo "Memory usage: $MEMORY" >> "$RESULTS_DIR/memory-$TIMESTAMP.log"
    fi
    sleep 1
done

kill $FRONTEND_PID 2>/dev/null || true
echo -e "${GREEN}✓ Memory profiling complete${NC}"

# 5. Type Checking Performance
echo ""
echo -e "${YELLOW}[5/5] TypeScript type checking performance...${NC}"

cd "$FRONTEND_DIR"
echo "Running type check..."
TIME_START=$(date +%s)
npm run type-check > "../$RESULTS_DIR/type-check-$TIMESTAMP.log" 2>&1 || true
TIME_END=$(date +%s)
TIME_DIFF=$((TIME_END - TIME_START))

echo -e "${GREEN}✓ Type check completed in ${TIME_DIFF}s${NC}"
echo "TypeScript check time: ${TIME_DIFF}s" >> "../$RESULTS_DIR/metrics-$TIMESTAMP.txt"

cd ..

# Generate summary report
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Performance Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse Lighthouse results
if [ -f "$RESULTS_DIR/lighthouse-home-$TIMESTAMP.report.json" ]; then
    PERF_SCORE=$(jq -r '.categories.performance.score * 100' "$RESULTS_DIR/lighthouse-home-$TIMESTAMP.report.json" 2>/dev/null || echo "N/A")
    A11Y_SCORE=$(jq -r '.categories.accessibility.score * 100' "$RESULTS_DIR/lighthouse-home-$TIMESTAMP.report.json" 2>/dev/null || echo "N/A")
    BP_SCORE=$(jq -r '.categories["best-practices"].score * 100' "$RESULTS_DIR/lighthouse-home-$TIMESTAMP.report.json" 2>/dev/null || echo "N/A")
    SEO_SCORE=$(jq -r '.categories.seo.score * 100' "$RESULTS_DIR/lighthouse-home-$TIMESTAMP.report.json" 2>/dev/null || echo "N/A")
    
    echo "Lighthouse Scores (Home Page):"
    echo "  Performance:    $PERF_SCORE / 100"
    echo "  Accessibility:  $A11Y_SCORE / 100"
    echo "  Best Practices: $BP_SCORE / 100"
    echo "  SEO:            $SEO_SCORE / 100"
    echo ""
fi

# Parse Artillery results
if [ -f "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" ]; then
    AVG_RESPONSE=$(jq -r '.aggregate.latency.median' "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" 2>/dev/null || echo "N/A")
    P95_RESPONSE=$(jq -r '.aggregate.latency.p95' "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" 2>/dev/null || echo "N/A")
    P99_RESPONSE=$(jq -r '.aggregate.latency.p99' "$RESULTS_DIR/artillery-results-$TIMESTAMP.json" 2>/dev/null || echo "N/A")
    
    echo "Load Test Results:"
    echo "  Median latency: ${AVG_RESPONSE}ms"
    echo "  P95 latency:    ${P95_RESPONSE}ms"
    echo "  P99 latency:    ${P99_RESPONSE}ms"
    echo ""
fi

echo -e "${GREEN}✓ All performance tests complete!${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR/"
echo ""
echo "View detailed reports:"
echo "  - Bundle analysis: $RESULTS_DIR/bundle-analysis-$TIMESTAMP.log"
echo "  - Lighthouse reports: $RESULTS_DIR/lighthouse-*.html"
echo "  - Load test report: $RESULTS_DIR/artillery-report-$TIMESTAMP.html"
echo "  - Memory profile: $RESULTS_DIR/memory-$TIMESTAMP.log"
echo ""

exit 0
