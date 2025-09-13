#!/bin/bash

echo "Starting Veria Sprint 1 Services..."
echo "=================================="

# Start API Gateway (Port 3000)
echo "Starting API Gateway on port 3000..."
cd api-gateway && npm run dev &
API_PID=$!

# Start QuickBooks Connector (Port 3001)
echo "Starting QuickBooks Connector on port 3001..."
cd ../connectors/quickbooks && npm run dev &
QB_PID=$!

# Start Dashboard (Port 3002)
echo "Starting Compliance Dashboard on port 3002..."
cd ../../dashboard && npm run dev &
DASH_PID=$!

# Start Tax Engine (Port 3003)
echo "Starting Tax Engine on port 3003..."
cd ../tax-engine && npm run dev &
TAX_PID=$!

echo ""
echo "All services started!"
echo "====================="
echo "API Gateway: http://localhost:3000"
echo "QuickBooks Connector: http://localhost:3001"
echo "Compliance Dashboard: http://localhost:3002"
echo "Tax Engine: http://localhost:3003"
echo ""
echo "Process IDs:"
echo "API Gateway: $API_PID"
echo "QuickBooks: $QB_PID"
echo "Dashboard: $DASH_PID"
echo "Tax Engine: $TAX_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait