#!/bin/bash

# PostgreSQL Docker Setup Script
# Starts PostgreSQL container with local data persistence

CONTAINER_NAME="kanban-postgres"
POSTGRES_PASSWORD="kanban_dev_2024"
POSTGRES_DB="kanban"
POSTGRES_PORT="5432"
DATA_DIR="$(pwd)/data/postgres"

echo "🐳 Starting PostgreSQL Docker container..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
  echo "🛑 Stopping existing container..."
  docker stop $CONTAINER_NAME > /dev/null 2>&1
  echo "🗑️  Removing existing container..."
  docker rm $CONTAINER_NAME > /dev/null 2>&1
fi

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

echo "📦 Creating PostgreSQL container..."
docker run --name $CONTAINER_NAME \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_DB=$POSTGRES_DB \
  -p $POSTGRES_PORT:5432 \
  -v "$DATA_DIR":/var/lib/postgresql/data \
  -d postgres:15

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Check if container is running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo ""
  echo "✅ PostgreSQL container started successfully!"
  echo ""
  echo "📋 Connection details:"
  echo "   Host: localhost"
  echo "   Port: $POSTGRES_PORT"
  echo "   Database: $POSTGRES_DB"
  echo "   User: postgres"
  echo "   Password: $POSTGRES_PASSWORD"
  echo ""
  echo "💾 Data directory: $DATA_DIR"
  echo ""
  echo "📝 Update your .env file with these settings:"
  echo "   DATABASE_TYPE=postgres"
  echo "   POSTGRES_HOST=localhost"
  echo "   POSTGRES_PORT=$POSTGRES_PORT"
  echo "   POSTGRES_DB=$POSTGRES_DB"
  echo "   POSTGRES_USER=postgres"
  echo "   POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
  echo ""
  echo "🔍 Container logs: docker logs $CONTAINER_NAME"
  echo "🛑 Stop container: docker stop $CONTAINER_NAME"
  echo "🔄 Restart container: docker start $CONTAINER_NAME"
else
  echo ""
  echo "❌ Failed to start PostgreSQL container"
  docker logs $CONTAINER_NAME
  exit 1
fi
