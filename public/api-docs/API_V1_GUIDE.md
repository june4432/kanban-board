# API v1 Usage Guide

**RESTful API for Kanban Board System**
**Version:** 1.0.0
**Base URL:** `/api/v1`

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Projects API](#projects-api)
6. [Milestones API](#milestones-api)
7. [Labels API](#labels-api)
8. [Columns API](#columns-api)
9. [Users API](#users-api)
10. [Cards API](#cards-api)
11. [Examples](#examples)

---

## 🚀 Getting Started

### Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://your-domain.com/api/v1
```

### Common Headers

```http
Content-Type: application/json
Cookie: next-auth.session-token=...  # For authenticated requests
```

---

## 🔐 Authentication

API v1 uses NextAuth session-based authentication. You must be logged in to access most endpoints.

### Check Authentication Status

```bash
curl -b cookies.txt http://localhost:3000/api/auth/session
```

### Login

Use the existing authentication system (not part of API v1 yet):

```bash
# Login through web interface first
# Or use POST /api/auth/login (existing endpoint)
```

---

## 📦 Response Format

### Success Response

```json
{
  "data": {
    // Resource data
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-12T14:30:00Z"
  }
}
```

### Paginated Response

```json
{
  "data": [
    // Array of resources
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-12T14:30:00Z"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-12T14:30:00Z"
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists, constraint violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Codes

```typescript
// Authentication & Authorization
UNAUTHORIZED
FORBIDDEN
TOKEN_EXPIRED
INVALID_TOKEN

// Validation
VALIDATION_ERROR
INVALID_INPUT
MISSING_REQUIRED_FIELD

// Resource
NOT_FOUND
ALREADY_EXISTS
CONFLICT

// Rate Limiting
RATE_LIMIT_EXCEEDED
QUOTA_EXCEEDED

// Server
INTERNAL_ERROR
SERVICE_UNAVAILABLE
DATABASE_ERROR
```

---

## 📁 Projects API

### List Projects

**GET** `/api/v1/projects`

Query Parameters:
- `page` (number, default: 1) - Page number
- `pageSize` (number, default: 20, max: 100) - Items per page
- `sort` (string) - Sort field (prefix with `-` for descending)
- `search` (string) - Search in name and description
- `ownerId` (UUID) - Filter by owner
- `isPublic` (boolean) - Filter by public/private

```bash
# List all projects (paginated)
curl -b cookies.txt http://localhost:3000/api/v1/projects

# Search projects
curl -b cookies.txt "http://localhost:3000/api/v1/projects?search=sprint&page=1&pageSize=10"

# Filter by owner
curl -b cookies.txt "http://localhost:3000/api/v1/projects?ownerId=user-123"

# Sort by name descending
curl -b cookies.txt "http://localhost:3000/api/v1/projects?sort=-name"
```

Response:
```json
{
  "data": [
    {
      "id": "proj-123",
      "name": "Sprint Planning",
      "description": "Q4 2025 Sprint",
      "ownerId": "user-123",
      "color": "#3b82f6",
      "isPublic": false,
      "members": [...],
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-12T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "totalPages": 1
  },
  "meta": {...}
}
```

### Create Project

**POST** `/api/v1/projects`

Request Body:
```json
{
  "name": "New Project",
  "description": "Project description",
  "color": "#3b82f6",
  "isPublic": false
}
```

```bash
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"New Project","description":"My new project","color":"#ff6b6b"}' \
  http://localhost:3000/api/v1/projects
```

Response (201 Created):
```json
{
  "data": {
    "id": "proj-456",
    "name": "New Project",
    "description": "My new project",
    "ownerId": "user-123",
    "color": "#ff6b6b",
    "isPublic": false,
    "members": [],
    "createdAt": "2025-11-12T14:30:00Z",
    "updatedAt": "2025-11-12T14:30:00Z"
  },
  "meta": {...}
}
```

### Get Project

**GET** `/api/v1/projects/:id`

```bash
curl -b cookies.txt http://localhost:3000/api/v1/projects/proj-123
```

Response (200 OK):
```json
{
  "data": {
    "id": "proj-123",
    "name": "Sprint Planning",
    // ... full project details
  },
  "meta": {...}
}
```

### Update Project

**PATCH** `/api/v1/projects/:id`

*Requires: Project owner*

Request Body (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#22c55e",
  "isPublic": true
}
```

```bash
curl -X PATCH \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Project Name"}' \
  http://localhost:3000/api/v1/projects/proj-123
```

Response (200 OK):
```json
{
  "data": {
    "id": "proj-123",
    "name": "Updated Project Name",
    // ... updated project
  },
  "meta": {...}
}
```

### Delete Project

**DELETE** `/api/v1/projects/:id`

*Requires: Project owner*

```bash
curl -X DELETE \
  -b cookies.txt \
  http://localhost:3000/api/v1/projects/proj-123
```

Response (204 No Content)

---

## 🎯 Milestones API

### Create Milestone

**POST** `/api/v1/projects/:id/milestones`

*Requires: Project member*

Request Body:
```json
{
  "name": "Sprint 1",
  "dueDate": "2025-12-31",
  "description": "Complete core features"
}
```

```bash
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Q4 Milestone",
    "dueDate":"2025-12-31",
    "description":"Complete all Q4 objectives"
  }' \
  http://localhost:3000/api/v1/projects/proj-123/milestones
```

Response (201 Created):
```json
{
  "data": {
    "milestone": {
      "id": "milestone-123",
      "name": "Q4 Milestone",
      "dueDate": "2025-12-31T00:00:00.000Z",
      "description": "Complete all Q4 objectives",
      "boardId": "board-123",
      "createdAt": "2025-11-19T00:00:00Z",
      "updatedAt": "2025-11-19T00:00:00Z"
    },
    "message": "Milestone created successfully"
  },
  "meta": {...}
}
```

### Update Milestone

**PATCH** `/api/v1/projects/:id/milestones/:milestoneId`

*Requires: Project member*

Request Body (all fields optional):
```json
{
  "name": "Updated Sprint 1",
  "dueDate": "2026-01-15",
  "description": "Updated description"
}
```

```bash
curl -X PATCH \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Milestone","dueDate":"2026-01-15"}' \
  http://localhost:3000/api/v1/projects/proj-123/milestones/milestone-123
```

Response (200 OK):
```json
{
  "data": {
    "milestone": {
      "id": "milestone-123",
      "name": "Updated Milestone",
      "dueDate": "2026-01-15T00:00:00.000Z",
      // ... updated milestone
    },
    "message": "Milestone updated successfully"
  },
  "meta": {...}
}
```

### Delete Milestone

**DELETE** `/api/v1/projects/:id/milestones/:milestoneId`

*Requires: Project member*

```bash
curl -X DELETE \
  -b cookies.txt \
  http://localhost:3000/api/v1/projects/proj-123/milestones/milestone-123
```

Response (200 OK):
```json
{
  "data": {
    "message": "Milestone deleted successfully"
  },
  "meta": {...}
}
```

---

## 🏷️ Labels API

### Create Label

**POST** `/api/v1/projects/:id/labels`

*Requires: Project member*

Request Body:
```json
{
  "name": "Bug",
  "color": "#ef4444"
}
```

```bash
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Feature","color":"#3b82f6"}' \
  http://localhost:3000/api/v1/projects/proj-123/labels
```

Response (201 Created):
```json
{
  "data": {
    "label": {
      "id": "label-123",
      "name": "Feature",
      "color": "#3b82f6",
      "boardId": "board-123",
      "createdAt": "2025-11-19T00:00:00Z"
    },
    "message": "Label created successfully"
  },
  "meta": {...}
}
```

### Update Label

**PATCH** `/api/v1/projects/:id/labels/:labelId`

*Requires: Project member*

Request Body (at least one field required):
```json
{
  "name": "Critical Bug",
  "color": "#dc2626"
}
```

```bash
curl -X PATCH \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Label","color":"#22c55e"}' \
  http://localhost:3000/api/v1/projects/proj-123/labels/label-123
```

Response (200 OK):
```json
{
  "data": {
    "label": {
      "id": "label-123",
      "name": "Updated Label",
      "color": "#22c55e",
      // ... updated label
    },
    "message": "Label updated successfully"
  },
  "meta": {...}
}
```

### Delete Label

**DELETE** `/api/v1/projects/:id/labels/:labelId`

*Requires: Project member*

```bash
curl -X DELETE \
  -b cookies.txt \
  http://localhost:3000/api/v1/projects/proj-123/labels/label-123
```

Response (200 OK):
```json
{
  "data": {
    "message": "Label deleted successfully"
  },
  "meta": {...}
}
```

---

## 📊 Columns API

### Update Column

**PATCH** `/api/v1/projects/:id/columns/:columnId`

*Requires: Project member*

Request Body:
```json
{
  "wipLimit": 5
}
```

```bash
curl -X PATCH \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"wipLimit":3}' \
  http://localhost:3000/api/v1/projects/proj-123/columns/col-123
```

Response (200 OK):
```json
{
  "data": {
    "column": {
      "id": "col-123",
      "title": "In Progress",
      "wipLimit": 3,
      "position": 1,
      "boardId": "board-123"
    },
    "message": "Column updated successfully"
  },
  "meta": {...}
}
```

---

## 👥 Users API

### Search Users

**GET** `/api/users/search`

Query Parameters:
- `q` (string, required, min 2 chars) - Search query for email or name

```bash
# Search by email
curl -b cookies.txt "http://localhost:3000/api/users/search?q=john"

# Search by name
curl -b cookies.txt "http://localhost:3000/api/users/search?q=Smith"
```

Response (200 OK):
```json
{
  "users": [
    {
      "id": "user-456",
      "email": "john.smith@example.com",
      "name": "John Smith",
      "avatar": "https://..."
    },
    {
      "id": "user-789",
      "email": "jane.smith@example.com",
      "name": "Jane Smith",
      "avatar": "https://..."
    }
  ]
}
```

### Invite User to Project

**POST** `/api/projects/:projectId/members/invite`

*Requires: Project owner*

Request Body:
```json
{
  "userId": "user-456"
}
```

```bash
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-456"}' \
  http://localhost:3000/api/projects/proj-123/members/invite
```

Response (201 Created):
```json
{
  "message": "User invited successfully",
  "member": {
    "id": "member-123",
    "userId": "user-456",
    "role": "member",
    "joinedAt": "2025-11-19T00:00:00Z",
    "email": "john.smith@example.com",
    "name": "John Smith",
    "avatar": "https://..."
  }
}
```

Error Responses:
- `400 Bad Request` - User already a member
- `403 Forbidden` - Only project owner can invite
- `404 Not Found` - User or project not found

---

## 🎴 Cards API

### List/Search Cards

**GET** `/api/v1/cards`

Query Parameters (all optional except `projectId`):
- `projectId` (UUID, required) - Filter by project
- `columnId` (UUID) - Filter by column
- `assignee` (UUID) - Filter by assignee
- `priority` (string) - Filter by priority: low, medium, high, urgent
- `dueDateFrom` (ISO date) - Filter cards due after this date
- `dueDateTo` (ISO date) - Filter cards due before this date
- `tags` (string) - Comma-separated tags
- `search` (string) - Search in title and description
- `page` (number, default: 1)
- `pageSize` (number, default: 20)
- `sort` (string) - Sort field

```bash
# List all cards in project
curl -b cookies.txt "http://localhost:3000/api/v1/cards?projectId=proj-123"

# Search cards
curl -b cookies.txt "http://localhost:3000/api/v1/cards?projectId=proj-123&search=bug&priority=high"

# Filter by assignee and due date
curl -b cookies.txt "http://localhost:3000/api/v1/cards?projectId=proj-123&assignee=user-456&dueDateFrom=2025-11-01"

# Filter by tags
curl -b cookies.txt "http://localhost:3000/api/v1/cards?projectId=proj-123&tags=urgent,backend"
```

Response:
```json
{
  "data": [
    {
      "id": "card-789",
      "title": "Fix login bug",
      "description": "Users unable to login",
      "priority": "high",
      "assignees": ["user-456"],
      "labels": ["label-123"],
      "tags": ["urgent", "backend"],
      "dueDate": "2025-11-15T00:00:00Z",
      "columnId": "col-123",
      "columnTitle": "In Progress",
      "createdAt": "2025-11-10T09:00:00Z",
      "updatedAt": "2025-11-12T14:00:00Z"
    }
  ],
  "pagination": {...},
  "meta": {...}
}
```

### Create Card

**POST** `/api/v1/cards`

Request Body:
```json
{
  "projectId": "proj-123",
  "columnId": "col-123",
  "title": "Implement feature X",
  "description": "Detailed description",
  "priority": "medium",
  "assignees": ["user-456"],
  "labels": ["label-123"],
  "dueDate": "2025-11-20T00:00:00Z",
  "tags": ["feature", "frontend"]
}
```

Required fields: `projectId`, `columnId`, `title`

```bash
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "projectId":"proj-123",
    "columnId":"col-123",
    "title":"New Feature",
    "description":"Implement user dashboard",
    "priority":"high"
  }' \
  http://localhost:3000/api/v1/cards
```

Response (201 Created):
```json
{
  "data": {
    "id": "card-999",
    "title": "New Feature",
    "description": "Implement user dashboard",
    "priority": "high",
    "assignees": [],
    "columnId": "col-123",
    "createdAt": "2025-11-12T15:00:00Z",
    "updatedAt": "2025-11-12T15:00:00Z"
  },
  "meta": {...}
}
```

### Get Card

**GET** `/api/v1/cards/:id`

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cards/card-789
```

Response (200 OK):
```json
{
  "data": {
    "id": "card-789",
    "title": "Fix login bug",
    // ... full card details
  },
  "meta": {...}
}
```

### Update Card

**PATCH** `/api/v1/cards/:id`

Request Body (all fields optional):
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "urgent",
  "assignees": ["user-456", "user-789"],
  "dueDate": "2025-11-25T00:00:00Z",
  "tags": ["urgent", "bug"]
}
```

```bash
curl -X PATCH \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"priority":"urgent","title":"URGENT: Fix login bug"}' \
  http://localhost:3000/api/v1/cards/card-789
```

Response (200 OK):
```json
{
  "data": {
    "id": "card-789",
    "title": "URGENT: Fix login bug",
    "priority": "urgent",
    // ... updated card
  },
  "meta": {...}
}
```

### Delete Card

**DELETE** `/api/v1/cards/:id`

```bash
curl -X DELETE \
  -b cookies.txt \
  http://localhost:3000/api/v1/cards/card-789
```

Response (204 No Content)

### Move Card

**POST** `/api/v1/cards/:id/move`

Request Body:
```json
{
  "columnId": "col-456",
  "position": 2
}
```

```bash
curl -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"columnId":"col-456"}' \
  http://localhost:3000/api/v1/cards/card-789/move
```

Response (200 OK):
```json
{
  "data": {
    "id": "card-789",
    "columnId": "col-456",
    // ... moved card
  },
  "meta": {...}
}
```

---

## 💻 Examples

### JavaScript/TypeScript Client

```typescript
// api-client.ts
const API_BASE = 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

class KanbanApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include', // Include session cookie
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Projects
  async listProjects(params?: {
    page?: number;
    search?: string;
  }): Promise<PaginatedResponse<Project>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/projects?${query}`);
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<ApiResponse<Project>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    id: string,
    data: Partial<Project>
  ): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Cards
  async listCards(params: {
    projectId: string;
    search?: string;
    priority?: string;
  }): Promise<PaginatedResponse<Card>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/cards?${query}`);
  }

  async createCard(data: {
    projectId: string;
    columnId: string;
    title: string;
    description?: string;
    priority?: string;
  }): Promise<ApiResponse<Card>> {
    return this.request('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCard(
    id: string,
    data: Partial<Card>
  ): Promise<ApiResponse<Card>> {
    return this.request(`/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async moveCard(
    id: string,
    columnId: string
  ): Promise<ApiResponse<Card>> {
    return this.request(`/cards/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ columnId }),
    });
  }

  async deleteCard(id: string): Promise<void> {
    return this.request(`/cards/${id}`, { method: 'DELETE' });
  }
}

// Usage
const api = new KanbanApiClient();

// List projects
const projects = await api.listProjects({ search: 'sprint' });
console.log(projects.data); // Project[]
console.log(projects.pagination); // { page, pageSize, total, totalPages }

// Create project
const newProject = await api.createProject({
  name: 'Q4 Planning',
  description: 'Planning for Q4 2025',
  color: '#22c55e',
});
console.log(newProject.data); // Project

// List cards
const cards = await api.listCards({
  projectId: 'proj-123',
  priority: 'high',
});
console.log(cards.data); // Card[]

// Create and move card
const card = await api.createCard({
  projectId: 'proj-123',
  columnId: 'col-todo',
  title: 'Implement API v1',
  priority: 'high',
});

await api.moveCard(card.data.id, 'col-in-progress');
```

### React Hooks

```typescript
// hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

export function useProjects(search?: string) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await api.listProjects({ search });
        setProjects(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [search]);

  return { projects, loading, error };
}

// Component usage
function ProjectList() {
  const { projects, loading, error } = useProjects();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {projects.map((project) => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

### Python Client

```python
# kanban_api.py
import requests
from typing import Optional, Dict, List

class KanbanApiClient:
    def __init__(self, base_url: str = "http://localhost:3000/api/v1", session_cookie: str = None):
        self.base_url = base_url
        self.session = requests.Session()
        if session_cookie:
            self.session.cookies.set("next-auth.session-token", session_cookie)

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()

        if response.status_code == 204:
            return None

        return response.json()

    # Projects
    def list_projects(self, search: Optional[str] = None, page: int = 1) -> Dict:
        params = {"page": page}
        if search:
            params["search"] = search
        return self._request("GET", "/projects", params=params)

    def create_project(self, name: str, description: str = "", color: str = "#3b82f6") -> Dict:
        data = {"name": name, "description": description, "color": color}
        return self._request("POST", "/projects", json=data)

    def update_project(self, project_id: str, **updates) -> Dict:
        return self._request("PATCH", f"/projects/{project_id}", json=updates)

    def delete_project(self, project_id: str) -> None:
        return self._request("DELETE", f"/projects/{project_id}")

    # Cards
    def list_cards(self, project_id: str, **filters) -> Dict:
        params = {"projectId": project_id, **filters}
        return self._request("GET", "/cards", params=params)

    def create_card(self, project_id: str, column_id: str, title: str, **kwargs) -> Dict:
        data = {"projectId": project_id, "columnId": column_id, "title": title, **kwargs}
        return self._request("POST", "/cards", json=data)

    def update_card(self, card_id: str, **updates) -> Dict:
        return self._request("PATCH", f"/cards/{card_id}", json=updates)

    def move_card(self, card_id: str, column_id: str) -> Dict:
        return self._request("POST", f"/cards/{card_id}/move", json={"columnId": column_id})

    def delete_card(self, card_id: str) -> None:
        return self._request("DELETE", f"/cards/{card_id}")

# Usage
api = KanbanApiClient(session_cookie="your-session-token")

# List projects
projects = api.list_projects(search="sprint")
print(f"Found {projects['pagination']['total']} projects")

# Create card
card = api.create_card(
    project_id="proj-123",
    column_id="col-todo",
    title="Implement Python client",
    priority="high",
    description="Create Python API client for Kanban board"
)
print(f"Created card: {card['data']['id']}")

# Move card
api.move_card(card['data']['id'], "col-in-progress")
```

---

## 🔄 Migration from Old API

### Endpoint Mapping

| Old Endpoint | New Endpoint (v1) | Changes |
|--------------|-------------------|---------|
| `POST /api/cards` | `POST /api/v1/cards` | Standardized response format |
| `GET /api/projects` | `GET /api/v1/projects` | Added pagination, filters |
| `GET /api/projects/[id]` | `GET /api/v1/projects/[id]` | Same functionality |
| `POST /api/cards/move` | `POST /api/v1/cards/[id]/move` | RESTful resource path |

### Response Format Changes

**Old:**
```json
{
  "projects": [...],
  "error": "message"
}
```

**New:**
```json
{
  "data": [...],
  "pagination": {...},
  "meta": {...}
}
```

Or error:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": [...]
  },
  "meta": {...}
}
```

---

## 🧪 Testing

### Manual Testing with cURL

```bash
# Save cookies to file
curl -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  http://localhost:3000/api/auth/login

# Use cookies for authenticated requests
curl -b cookies.txt http://localhost:3000/api/v1/projects

# Test error handling
curl -b cookies.txt \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Missing required fields"}' \
  http://localhost:3000/api/v1/cards

# Expected: 400 Bad Request with validation errors
```

### Postman Collection

Import the following collection into Postman:

```json
{
  "info": {
    "name": "Kanban API v1",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Projects",
      "item": [
        {
          "name": "List Projects",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/v1/projects"
          }
        },
        {
          "name": "Create Project",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/v1/projects",
            "body": {
              "mode": "raw",
              "raw": "{\"name\":\"Test Project\",\"description\":\"Test\"}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## 📚 Additional Resources

- [Enterprise Roadmap](/claudedocs/ENTERPRISE_ROADMAP.md)
- [API Architecture Design](/lib/api-v1/types/index.ts)
- [Validation Schemas](/lib/api-v1/utils/validation.ts)
- [Error Handler Documentation](/lib/api-v1/middleware/error-handler.ts)

---

## 🤝 Contributing

When adding new endpoints:

1. Follow RESTful principles
2. Use standardized response format
3. Implement proper validation with Zod
4. Add error handling with try-catch
5. Document in this guide
6. Add TypeScript types

---

**Last Updated:** 2025-11-19
**API Version:** 1.0.0

## 📝 Changelog

### 2025-11-19
- Added Milestones API (create, update, delete)
- Added Labels API (create, update, delete)
- Added Columns API (update WIP limit)
- Added Users API (search, invite to project)
