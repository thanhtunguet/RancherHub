#!/bin/bash

# Rancher Hub Production Build Script
set -e

echo "🚀 Building Rancher Hub for Production..."

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

print_status "Starting production build process..."

# Clean up existing containers and images
print_status "Cleaning up existing resources..."
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Remove old images if they exist
docker rmi rancher-hub-backend:latest 2>/dev/null || true
docker rmi rancher-hub-frontend:latest 2>/dev/null || true

# Build backend
print_status "Building backend container..."
cd backend
if docker build -t rancher-hub-backend:latest .; then
    print_success "Backend build completed successfully"
else
    print_error "Backend build failed"
    exit 1
fi
cd ..

# Build frontend
print_status "Building frontend container..."
cd frontend
if docker build -t rancher-hub-frontend:latest .; then
    print_success "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

# Build with docker-compose
print_status "Building services with docker-compose..."
if docker-compose -f docker-compose.prod.yml build; then
    print_success "Docker Compose build completed successfully"
else
    print_error "Docker Compose build failed"
    exit 1
fi

print_success "🎉 Production build completed successfully!"
echo ""
print_status "To start the application, run:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
print_status "To view logs, run:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
print_status "Application will be available at:"
echo "  Frontend: http://localhost"
echo "  Backend:  http://localhost:3000"
echo "  API Docs: http://localhost:3000/api/docs"