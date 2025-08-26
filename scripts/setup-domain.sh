#!/bin/bash

# Domain setup script for api.myl.zip
# This script sets up the domain mapping and provides DNS instructions

set -e

# Configuration
PROJECT_ID="zip-myl-backend"
REGION="us-central1"
SERVICE_NAME="zip-myl-backend"
DOMAIN="api.myl.zip"

echo "🌐 Setting up domain mapping for ${DOMAIN}"

# Set the project
gcloud config set project ${PROJECT_ID}

# Create domain mapping
echo "📋 Creating domain mapping..."
gcloud run domain-mappings create \
  --service ${SERVICE_NAME} \
  --domain ${DOMAIN} \
  --region ${REGION} \
  --project ${PROJECT_ID}

# Get DNS records
echo "📋 DNS Records to add to your domain provider:"
echo "=============================================="
gcloud run domain-mappings describe ${DOMAIN} \
  --region=${REGION} \
  --format="table(status.resourceRecords[].name,status.resourceRecords[].rrdata,status.resourceRecords[].type)"

echo ""
echo "🔧 Instructions:"
echo "1. Go to your domain provider (where you manage myl.zip)"
echo "2. Add the DNS records shown above"
echo "3. Wait for DNS propagation (usually 5-15 minutes)"
echo "4. Your API will be available at: https://${DOMAIN}"

echo ""
echo "✅ Domain mapping created successfully!"
echo "🌐 Once DNS is configured, your API will be available at: https://${DOMAIN}"
