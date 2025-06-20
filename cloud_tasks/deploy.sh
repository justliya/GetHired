#!/bin/bash

set -e

show_usage() {
    echo "Usage: $0 PROJECT_ID [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  PROJECT_ID                Google Cloud Project ID (required)"
    echo ""
    echo "Environment Variables:"
    echo "  SERVICE_NAME             Cloud Run service name (default: gethired-scheduler)"
    echo "  REGION                   Deployment region (default: us-central1)"
    echo "  QUEUE_NAME               Cloud Tasks queue name (default: scheduled-searches)"
    echo "  GETHIRED_API_URL         GetHired API URL (default: https://your-gethired-api-url.com)"
    echo "  SKIP_BUILD               Skip Docker build (default: false)"
    echo "  SKIP_PUSH                Skip image push (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 my-project-id"
    echo "  SERVICE_NAME=my-scheduler $0 my-project-id"
    echo "  GETHIRED_API_URL=https://api.gethired.com $0 my-project-id"
    echo "  SKIP_BUILD=true $0 my-project-id  # Use existing image"
}

PROJECT_ID="${PROJECT_ID:-${1}}"
SERVICE_NAME="${SERVICE_NAME:-gethired-scheduler}"
REGION="${REGION:-us-central1}"
QUEUE_NAME="${QUEUE_NAME:-scheduled-searches}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_PUSH="${SKIP_PUSH:-false}"

if [[ -z "$PROJECT_ID" ]] || [[ "$PROJECT_ID" == "--help" ]] || [[ "$PROJECT_ID" == "-h" ]]; then
    show_usage
    exit 1
fi

echo "🐳 Building and deploying GetHired Scheduler"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Queue: $QUEUE_NAME"
echo ""

IMAGE_URL="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if [[ "$SKIP_BUILD" != "true" ]]; then
    echo "🐳 Building Docker image..."
    docker build -t $IMAGE_URL .
    echo "✅ Build complete"
else
    echo "⏭️  Skipping Docker build"
fi

if [[ "$SKIP_PUSH" != "true" ]]; then
    echo "📤 Pushing to Container Registry..."
    docker push $IMAGE_URL
    echo "✅ Push complete"
else
    echo "⏭️  Skipping image push"
fi

echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image $IMAGE_URL \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID},CLOUD_TASKS_LOCATION=${REGION},CLOUD_TASKS_QUEUE=${QUEUE_NAME},GETHIRED_API_URL=${GETHIRED_API_URL:-https://your-gethired-api-url.com} \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --project ${PROJECT_ID} \
    --quiet

SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)")

echo ""
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Service URL: $SERVICE_URL"
echo "🔗 Health Check: $SERVICE_URL/api/v1/health"
echo ""

if command -v curl &> /dev/null; then
    echo "🏥 Testing health endpoint..."
    if curl -s "$SERVICE_URL/api/v1/health" | grep -q "ok"; then
        echo "✅ Service is healthy"
    else
        echo "⚠️  Health check failed - service may still be starting"
    fi
fi
