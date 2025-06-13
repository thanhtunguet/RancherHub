#!/bin/bash

# Rancher Hub Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
BACKEND_URL="http://localhost:3000"
BUILD_FIRST=false
DETACH=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-url)
            BACKEND_URL="$2"
            shift 2
            ;;
        --build)
            BUILD_FIRST=true
            shift
            ;;
        --foreground)
            DETACH=false
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --backend-url URL    Set backend URL for frontend (default: http://localhost:3000)"
            echo "  --build              Build images before deploying"
            echo "  --foreground         Run in foreground (don't detach)"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🚀 Deploying Rancher Hub to Production..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Build if requested
if [ "$BUILD_FIRST" = true ]; then
    print_status "Building images first..."
    ./build-production.sh
fi

# Set environment variables
export BACKEND_URL="$BACKEND_URL"

print_status "Configuration:"
echo "  Backend URL: $BACKEND_URL"
echo "  Detached mode: $DETACH"
echo ""

# Stop existing deployment
print_status "Stopping existing deployment..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start the deployment
print_status "Starting production deployment..."
if [ "$DETACH" = true ]; then
    if docker-compose -f docker-compose.prod.yml up -d; then
        print_success "Deployment started successfully!"
        echo ""
        print_status "Waiting for services to be healthy..."
        
        # Wait for backend health check
        timeout=60
        count=0
        while [ $count -lt $timeout ]; do
            if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                print_success "Backend is healthy"
                break
            fi
            sleep 2
            count=$((count + 2))
            if [ $count -eq $timeout ]; then
                print_warning "Backend health check timeout"
            fi
        done
        
        # Wait for frontend health check
        count=0
        while [ $count -lt $timeout ]; do
            if curl -f http://localhost/health > /dev/null 2>&1; then
                print_success "Frontend is healthy"
                break
            fi
            sleep 2
            count=$((count + 2))
            if [ $count -eq $timeout ]; then
                print_warning "Frontend health check timeout"
            fi
        done
        
        echo ""
        print_success "🎉 Deployment completed successfully!"
        echo ""
        print_status "Application is now running:"
        echo "  Frontend: http://localhost"
        echo "  Backend:  http://localhost:3000"
        echo "  API Docs: http://localhost:3000/api/docs"
        echo ""
        print_status "To view logs, run:"
        echo "  docker-compose -f docker-compose.prod.yml logs -f"
        echo ""
        print_status "To stop the application, run:"
        echo "  docker-compose -f docker-compose.prod.yml down"
    else
        print_error "Deployment failed"
        exit 1
    fi
else
    print_status "Starting in foreground mode..."
    docker-compose -f docker-compose.prod.yml up
fi