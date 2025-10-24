#!/bin/bash

# Build trigger script for Luxraytime on beta.timeluxury.com
# This triggers the producer to run a build

set -e

echo "Triggering Luxraytime build on beta.timeluxury.com..."

# Get the producer URL (default to localhost:8080)
PRODUCER_URL="${PRODUCER_URL:-http://localhost:8080}"

# Trigger the build via the producer
curl "${PRODUCER_URL}/?task={\"siteId\":\"luxraytime\",\"cmd\":\"buildLuxraytime\",\"buildType\":\"npm\",\"key\":\"buildLux$(date +%s)\",\"page\":1,\"totalPages\":1,\"data\":[]}"

echo ""
echo "Build triggered successfully!"
echo "Check the producer UI at ${PRODUCER_URL} for build status"
