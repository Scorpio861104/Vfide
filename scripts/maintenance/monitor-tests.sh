#!/bin/bash
# Test monitoring script

echo "🔍 Monitoring Test Execution..."
echo ""

# Wait for tests to run
sleep 30

if [ -f /tmp/forge-all-tests.log ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 FOUNDRY TEST RESULTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -100 /tmp/forge-all-tests.log | grep -E "Test result:|passing|failing|Suite result"
    echo ""
    
    # Check for failures
    if grep -q "FAILED" /tmp/forge-all-tests.log; then
        echo "❌ FAILURES DETECTED"
        echo ""
        echo "Failed tests:"
        grep "FAIL\|Error" /tmp/forge-all-tests.log | head -20
    else
        echo "✅ All Foundry tests passing!"
    fi
else
    echo "⏳ Tests still running..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Full log available at: /tmp/forge-all-tests.log"
echo "Run: tail -f /tmp/forge-all-tests.log"
