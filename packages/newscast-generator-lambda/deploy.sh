#!/bin/bash

# AWS Lambda Deployment Script for newscast-generator-lambda
# This script creates a deployment package and deploys the Lambda function

set -e

# Configuration
FUNCTION_NAME="newscast-generator-lambda"
RUNTIME="python3.13"
HANDLER="lambda_function.lambda_handler"
ROLE_NAME="newscast-generator-lambda-role"
LAYER_NAME="ffmpeg-layer"
TIMEOUT=300
MEMORY_SIZE=1024
EPHEMERAL_STORAGE=1024  # MB - can be increased up to 10240 if needed

# Required environment variables - must be set before running this script
if [ -z "$R2_PUBLIC_URL" ]; then
    printf "${RED}❌ R2_PUBLIC_URL environment variable is required${NC}\n"
    echo "Example: export R2_PUBLIC_URL='https://your-r2-public-url/'"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "${GREEN}=== AWS Lambda Deployment for newscast-generator-lambda ===${NC}\n"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    printf "${RED}❌ AWS CLI is not installed${NC}\n"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    printf "${RED}❌ AWS credentials not configured${NC}\n"
    exit 1
fi

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

printf "${BLUE}📋 Deployment Configuration:${NC}\n"
echo "  • Function Name: $FUNCTION_NAME"
echo "  • Runtime: $RUNTIME"
echo "  • Region: $REGION"
echo "  • Account ID: $ACCOUNT_ID"
echo "  • Memory: ${MEMORY_SIZE}MB"
echo "  • Timeout: ${TIMEOUT}s"
echo "  • Ephemeral Storage: ${EPHEMERAL_STORAGE}MB"
echo ""

# Step 1: Create deployment package
printf "${YELLOW}📦 Creating deployment package...${NC}\n"

# Create temporary build directory
BUILD_DIR="build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copy Lambda function code and modules
cp *.py $BUILD_DIR/

# No external dependencies to install (using only standard library)
printf "${GREEN}✅ Deployment package created${NC}\n"
echo ""

# Step 2: Create ZIP file
printf "${YELLOW}🗜️ Creating ZIP archive...${NC}\n"
cd $BUILD_DIR
zip -r ../deployment-package.zip .
cd ..

ZIP_SIZE=$(du -h deployment-package.zip | cut -f1)
printf "${GREEN}✅ ZIP archive created (${ZIP_SIZE})${NC}\n"
echo ""

# Step 3: Check/Create IAM Role
printf "${YELLOW}🔐 Checking IAM role...${NC}\n"

if aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
    printf "${GREEN}✅ IAM role $ROLE_NAME already exists${NC}\n"
else
    printf "${YELLOW}Creating IAM role $ROLE_NAME...${NC}\n"

    # Create trust policy
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json

    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    printf "${GREEN}✅ IAM role created${NC}\n"

    # Clean up
    rm trust-policy.json
fi

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo ""

# Step 4: Check for FFmpeg Layer
printf "${YELLOW}🎬 Checking FFmpeg Layer...${NC}\n"

# Try to find existing FFmpeg layer
LAYER_ARN=""

# First, check if function already has a layer
EXISTING_LAYER=$(aws lambda get-function-configuration --function-name $FUNCTION_NAME --query 'Layers[0].Arn' --output text 2>/dev/null || echo "")
if [ -n "$EXISTING_LAYER" ] && [ "$EXISTING_LAYER" != "None" ]; then
    LAYER_ARN="$EXISTING_LAYER"
    printf "${GREEN}✅ Using existing function layer: $LAYER_ARN${NC}\n"
elif aws lambda list-layers --query "Layers[?LayerName=='$LAYER_NAME'].LatestMatchingVersion.LayerVersionArn" --output text | grep -q arn; then
    LAYER_ARN=$(aws lambda list-layers --query "Layers[?LayerName=='$LAYER_NAME'].LatestMatchingVersion.LayerVersionArn" --output text)
    printf "${GREEN}✅ Found existing FFmpeg layer: $LAYER_ARN${NC}\n"
else
    printf "${YELLOW}⚠️  FFmpeg layer not found${NC}\n"
    printf "${BLUE}💡 To create FFmpeg layer, you can:${NC}\n"
    echo "  1. Use pre-built layer from AWS Serverless Application Repository"
    echo "  2. Create custom layer with latest FFmpeg binary"
    echo "  3. Use this ARN for pre-built layer: arn:aws:lambda:${REGION}:145266761615:layer:ffmpeg:4"
    echo ""

    # Use pre-built FFmpeg layer as fallback
    LAYER_ARN="arn:aws:lambda:${REGION}:145266761615:layer:ffmpeg:4"
    printf "${YELLOW}Using pre-built FFmpeg layer: $LAYER_ARN${NC}\n"
fi
echo ""

# Step 5: Deploy/Update Lambda function
printf "${YELLOW}🚀 Deploying Lambda function...${NC}\n"

if aws lambda get-function --function-name $FUNCTION_NAME &> /dev/null; then
    printf "${YELLOW}Updating existing function...${NC}\n"

    # Update function code
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment-package.zip

    # Update function configuration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --layers "$LAYER_ARN" \
        --environment Variables="{R2_PUBLIC_URL=${R2_PUBLIC_URL}}" \
        --ephemeral-storage Size=$EPHEMERAL_STORAGE

    printf "${GREEN}✅ Function updated${NC}\n"
else
    printf "${YELLOW}Creating new function...${NC}\n"

    # Wait for role to be ready
    printf "${YELLOW}Waiting for IAM role to be ready...${NC}\n"
    sleep 10

    # Create function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://deployment-package.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --layers "$LAYER_ARN" \
        --environment Variables="{R2_PUBLIC_URL=${R2_PUBLIC_URL}}" \
        --ephemeral-storage Size=$EPHEMERAL_STORAGE

    printf "${GREEN}✅ Function created${NC}\n"
fi
echo ""

# Step 6: Test function (optional)
printf "${YELLOW}🧪 Testing function...${NC}\n"

# Create test event
cat > test-event.json << EOF
{
  "newscast_id": "2025-09-22T17-08-49-437Z",
  "topic_index": 1
}
EOF

# Invoke function
TEST_RESULT=$(aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://test-event.json \
    --log-type Tail \
    response.json \
    --query 'LogResult' \
    --output text | base64 -d)

if [ $? -eq 0 ]; then
    printf "${GREEN}✅ Test invocation successful${NC}\n"
    echo "Response:"
    cat response.json | jq .
    echo ""
    echo "Logs:"
    echo "$TEST_RESULT"
else
    printf "${RED}❌ Test invocation failed${NC}\n"
fi

# Clean up
rm -rf $BUILD_DIR deployment-package.zip test-event.json response.json

echo ""
printf "${GREEN}=== Deployment Complete ===${NC}\n"
printf "${BLUE}Function ARN: arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}${NC}\n"
echo ""
printf "${BLUE}💡 To invoke the function:${NC}\n"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"newscast_id\":\"2025-09-22T17-08-49-437Z\",\"topic_index\":1}' response.json"