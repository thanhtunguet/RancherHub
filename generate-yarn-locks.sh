#!/bin/bash

# Generate yarn.lock files for both backend and frontend
# This script should be run once to create the initial yarn.lock files

set -e

echo "🔧 Generating yarn.lock files for Rancher Hub..."

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Please install it first:"
    echo "   npm install -g yarn"
    exit 1
fi

# Generate backend yarn.lock
echo "📦 Generating backend yarn.lock..."
cd backend
if [ -f yarn.lock ]; then
    echo "⚠️  yarn.lock already exists in backend, skipping..."
else
    yarn install
    echo "✅ Generated backend/yarn.lock"
fi
cd ..

# Generate frontend yarn.lock
echo "📦 Generating frontend yarn.lock..."
cd frontend
if [ -f yarn.lock ]; then
    echo "⚠️  yarn.lock already exists in frontend, skipping..."
else
    yarn install
    echo "✅ Generated frontend/yarn.lock"
fi
cd ..

echo ""
echo "✅ Yarn lock files generated successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Commit the yarn.lock files to your repository:"
echo "      git add backend/yarn.lock frontend/yarn.lock"
echo "      git commit -m \"Add yarn.lock files for dependency management\""
echo ""
echo "   2. Push to trigger GitHub Actions build:"
echo "      git push origin main"