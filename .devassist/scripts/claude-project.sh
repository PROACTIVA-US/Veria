#!/bin/bash

# Project-specific Claude launcher with automatic terminal logging
PROJECT_NAME=$(basename "$(pwd)")
LOG_DIR=".devassist/terminal_logs"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Generate log filename
LOG_FILE="$LOG_DIR/terminal_$(date +%Y%m%d_%H%M%S).log"

echo "🚀 Starting Claude for project: $PROJECT_NAME"
echo "📹 Terminal recording to: $LOG_FILE"
echo ""

# Start Claude with terminal recording
script -q "$LOG_FILE" claude "$@"

echo ""
echo "Session recorded to: $LOG_FILE"
