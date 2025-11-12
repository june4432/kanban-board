# Kanban Board API v1 - Quick Start Guide

## 🚀 Getting Started

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

The API supports two authentication methods:

#### 1. API Key Authentication (Recommended for external apps)
```bash
curl -H "Authorization: Bearer sk_live_..." \
  http://localhost:3000/api/v1/projects
```

#### 2. Session Authentication (Web app only)
- Automatic cookie-based authentication via NextAuth
- No additional headers needed

### Get an API Key

1. Log in to the web application
2. Navigate to **Settings** → **API Keys**
3. Click **"Generate New Key"**
4. Copy the key immediately (it won't be shown again!)
5. Use the key in your `Authorization` header

### API Key Format

- **Production**: `sk_live_...` (32 random characters)
- **Testing**: `sk_test_...` (32 random characters)

## 📚 Interactive Documentation

Visit the interactive API documentation with Swagger UI:
```
http://localhost:3000/api-docs
```

Features:
- **Try it out**: Test API endpoints directly from the browser
- **Authentication**: Authorize with your API key
- **Examples**: See request/response examples
- **Schemas**: Explore data models

## 🔑 Quick Examples

### List Projects
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/v1/projects"
```

### Create a Project
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "Project description",
    "color": "#3b82f6",
    "isPublic": false
  }' \
  "http://localhost:3000/api/v1/projects"
```

### List Cards
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/v1/cards?projectId=YOUR_PROJECT_ID"
```

### Create a Card
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "columnId": "COLUMN_ID",
    "title": "Task title",
    "description": "Task description",
    "priority": "high"
  }' \
  "http://localhost:3000/api/v1/cards"
```

### Move a Card
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "columnId": "TARGET_COLUMN_ID",
    "position": 0
  }' \
  "http://localhost:3000/api/v1/cards/CARD_ID/move?projectId=PROJECT_ID"
```

## 📖 API Endpoints

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `PATCH /api/v1/projects/{id}` - Update project

### Cards
- `GET /api/v1/cards` - List cards (requires `projectId` query param)
- `POST /api/v1/cards` - Create card
- `GET /api/v1/cards/{id}` - Get card
- `PATCH /api/v1/cards/{id}` - Update card
- `DELETE /api/v1/cards/{id}` - Delete card
- `POST /api/v1/cards/{id}/move` - Move card to different column

### Organizations
- `GET /api/v1/organizations` - List organizations
- `POST /api/v1/organizations` - Create organization
- `GET /api/v1/organizations/{id}` - Get organization
- `PATCH /api/v1/organizations/{id}` - Update organization
- `DELETE /api/v1/organizations/{id}` - Delete organization
- `GET /api/v1/organizations/{id}/members` - List members

### API Keys (Session auth only)
- `GET /api/v1/api-keys` - List your API keys

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for API keys in production
3. **Rotate keys regularly** (delete old, create new)
4. **Use different keys** for development and production
5. **Revoke compromised keys** immediately

## ⚡ Response Format

### Success Response
```json
{
  "data": { /* your data */ },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2025-11-12T15:30:00.000Z"
  }
}
```

### Paginated Response
```json
{
  "data": [ /* array of items */ ],
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2025-11-12T15:30:00.000Z",
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2025-11-12T15:30:00.000Z"
  }
}
```

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `INVALID_INPUT` | Invalid input parameters |
| `INTERNAL_ERROR` | Server error |

## 📊 Rate Limiting

Currently, no rate limiting is enforced. This may be added in future versions.

## 🔄 Pagination

List endpoints support pagination:

```bash
GET /api/v1/projects?page=1&pageSize=20&sort=createdAt
```

Parameters:
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 100)
- `sort`: Sort field (optional)

## 🔍 Filtering

Many endpoints support filtering:

### Projects
```bash
GET /api/v1/projects?organizationId=ORG_ID&isPublic=true&search=keyword
```

### Cards
```bash
GET /api/v1/cards?projectId=PROJECT_ID&priority=high&assignee=USER_ID
```

## 🧪 Testing

We provide a comprehensive test script:

```bash
# Set your API key
export API_KEY="sk_live_..."

# Run tests
./scripts/test-api-v1.sh
```

Results: **17/19 tests passing (89.5%)**

## 📝 Changelog

### v1.0.0 (2025-11-12)
- Initial release
- Projects API (CRUD)
- Cards API (CRUD + move)
- Organizations API (CRUD + members)
- API Key authentication
- Comprehensive validation
- OpenAPI 3.0 specification

## 🤝 Support

- **Documentation**: http://localhost:3000/api-docs
- **Issues**: Report bugs via GitHub Issues
- **API Keys**: Manage at http://localhost:3000/settings/api-keys

## 📄 License

MIT
