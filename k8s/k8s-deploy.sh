#!/bin/bash

# Kubernetes Deployment Script for Rancher Hub
# This script deploys all Kubernetes resources for Rancher Hub

set -e

echo "🚀 Deploying Rancher Hub to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if namespace exists, create if not
if ! kubectl get namespace rancher-hub &> /dev/null; then
    echo "📦 Creating namespace..."
    kubectl apply -f namespace.yaml
fi

# Apply ConfigMap
echo "📝 Applying ConfigMap..."
kubectl apply -f configmap.yaml

# Apply Secret (user should update this first)
echo "🔐 Applying Secret..."
if ! kubectl get secret rancher-hub-secret -n rancher-hub &> /dev/null; then
    echo "⚠️  Warning: Secret doesn't exist. Please update secret.yaml with your values first."
    echo "   Or create it manually with:"
    echo "   kubectl create secret generic rancher-hub-secret \\"
    echo "     --from-literal=DATABASE_PASSWORD='your-db-password' \\"
    echo "     --from-literal=JWT_SECRET='your-jwt-secret' \\"
    echo "     -n rancher-hub"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
kubectl apply -f secret.yaml

# Deploy PostgreSQL (optional - comment out if using external database)
echo "🗄️  Deploying PostgreSQL..."
kubectl apply -f postgres.yaml

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n rancher-hub --timeout=300s || true

# Deploy Backend
echo "🔧 Deploying Backend..."
kubectl apply -f backend.yaml

# Deploy Frontend
echo "🎨 Deploying Frontend..."
kubectl apply -f frontend.yaml

# Deploy Ingress
echo "🌐 Deploying Ingress..."
kubectl apply -f ingress.yaml

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with:"
echo "   kubectl get all -n rancher-hub"
echo ""
echo "📝 View logs with:"
echo "   kubectl logs -f deployment/rancher-hub-backend -n rancher-hub"
echo "   kubectl logs -f deployment/rancher-hub-frontend -n rancher-hub"
echo ""
echo "🌍 Update ingress.yaml with your domain before accessing the application"







