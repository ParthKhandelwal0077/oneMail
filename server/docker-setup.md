# OneBox Docker Setup Guide

## Quick Start with Docker

### Option 1: Using Docker Compose (Recommended)

This is the easiest way to run both Elasticsearch and the OneBox API together.

```bash
# 1. Start both Elasticsearch and OneBox API
npm run docker:up

# 2. Check if services are running
docker-compose ps

# 3. View logs
npm run docker:logs:all

# 4. Stop services
npm run docker:down
```

### Option 2: Using Individual Docker Commands

#### Step 1: Start Elasticsearch Only

```bash
# Using the npm script (recommended)
npm run docker:elasticsearch

# Or manually
docker run -d \
  --name onebox-elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0
```

#### Step 2: Build and Run OneBox API

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

### Option 3: Development with Docker

For development, you can run Elasticsearch in Docker and the API locally:

```bash
# 1. Start only Elasticsearch
npm run docker:elasticsearch

# 2. Run the API locally
npm run dev
```

## Docker Commands Reference

### Container Management

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Restart API service only
npm run docker:restart

# View logs for all services
npm run docker:logs:all

# View logs for specific service
docker logs -f onebox-api
docker logs -f onebox-elasticsearch
```

### Individual Service Management

```bash
# Build API image
npm run docker:build

# Run API container
npm run docker:run

# Stop API container
npm run docker:stop

# View API logs
npm run docker:logs
```

### Elasticsearch Management

```bash
# Start Elasticsearch only
npm run docker:elasticsearch

# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Stop Elasticsearch
docker stop onebox-elasticsearch
docker rm onebox-elasticsearch
```

## Environment Configuration

### For Docker Compose

Create a `.env` file in the server directory:

```env
NODE_ENV=production
PORT=5001
ELASTICSEARCH_URL=http://elasticsearch:9200
CLIENT_URL=http://localhost:3000
```

### For Individual Containers

```env
NODE_ENV=production
PORT=5001
ELASTICSEARCH_URL=http://localhost:9200
CLIENT_URL=http://localhost:3000
```

## Health Checks

### Check Service Status

```bash
# Check if containers are running
docker ps

# Check API health
curl http://localhost:5001/health

# Check Elasticsearch health
curl http://localhost:9200/_cluster/health
```

### Monitor Logs

```bash
# Follow all logs
docker-compose logs -f

# Follow specific service logs
docker logs -f onebox-api
docker logs -f onebox-elasticsearch
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :5001
   lsof -i :9200
   
   # Stop conflicting services
   docker stop $(docker ps -q --filter "publish=5001")
   docker stop $(docker ps -q --filter "publish=9200")
   ```

2. **Elasticsearch Not Starting**
   ```bash
   # Check Elasticsearch logs
   docker logs onebox-elasticsearch
   
   # Increase memory limit
   docker run -d \
     --name onebox-elasticsearch \
     -p 9200:9200 \
     -e "discovery.type=single-node" \
     -e "xpack.security.enabled=false" \
     -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
     docker.elastic.co/elasticsearch/elasticsearch:8.15.0
   ```

3. **API Can't Connect to Elasticsearch**
   ```bash
   # Check if Elasticsearch is accessible
   curl http://localhost:9200
   
   # Check API logs
   docker logs onebox-api
   ```

### Clean Up

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove specific containers
docker rm -f onebox-api onebox-elasticsearch

# Remove unused images
docker image prune -f

# Remove all unused Docker resources
docker system prune -f
```

## Production Deployment

### Using Docker Compose

1. Set up production environment variables
2. Use Docker secrets for sensitive data
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

### Example Production docker-compose.yml

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - onebox-api

  onebox-api:
    build: .
    environment:
      - NODE_ENV=production
    secrets:
      - credentials.json
    depends_on:
      - elasticsearch

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

secrets:
  credentials.json:
    file: ./credentials.json

volumes:
  elasticsearch_data:
```

## Monitoring

### Optional: Add Kibana for Elasticsearch Management

```bash
# Start with Kibana
docker-compose --profile monitoring up -d

# Access Kibana at http://localhost:5601
```

### Health Monitoring

```bash
# Set up monitoring script
#!/bin/bash
while true; do
  curl -f http://localhost:5001/health || echo "API is down"
  curl -f http://localhost:9200/_cluster/health || echo "Elasticsearch is down"
  sleep 30
done
```
