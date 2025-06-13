# Build stage
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Install yarn if not available
RUN apk add --no-cache yarn

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM nginx:alpine AS production

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
