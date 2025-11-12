# API v1 Client Usage Guide

Type-safe client library for Kanban Board API v1.

## Installation

The client is already included in the project at `lib/api/v1-client.ts`.

## Basic Usage

### Import

```typescript
import { api, configureApiClient } from '@/lib/api/v1-client';
```

### Configuration (Optional)

```typescript
// For external apps with API key
configureApiClient({
  baseUrl: 'https://your-domain.com/api/v1',
  apiKey: 'sk_live_...',
  onError: (error) => {
    console.error('API Error:', error);
    // Handle error (e.g., show toast notification)
  },
});
```

For web app (session authentication), no configuration needed.

## Projects API

### List Projects

```typescript
const response = await api.projects.list({
  page: 1,
  pageSize: 20,
  search: 'keyword',
});

console.log(response.data); // Project[]
console.log(response.pagination); // Pagination info
```

### Get Single Project

```typescript
const response = await api.projects.get('project-id');
console.log(response.data); // Project
```

### Create Project

```typescript
const response = await api.projects.create({
  name: 'My Project',
  description: 'Project description',
  color: '#3b82f6',
  isPublic: false,
});

console.log(response.data.projectId); // New project ID
```

### Update Project

```typescript
const response = await api.projects.update('project-id', {
  name: 'Updated Name',
  description: 'New description',
});
```

### Get Project Board

```typescript
const response = await api.projects.getBoard('project-id');

console.log(response.data.columns); // Board columns with cards
```

## Cards API

### List Cards

```typescript
const response = await api.cards.list({
  projectId: 'project-id',
  columnId: 'column-id', // Optional
  priority: 'high', // Optional
  search: 'keyword', // Optional
});

console.log(response.data); // Card[]
```

### Get Single Card

```typescript
const response = await api.cards.get('card-id', 'project-id');
console.log(response.data); // Card
```

### Create Card

```typescript
const response = await api.cards.create({
  projectId: 'project-id',
  columnId: 'column-id',
  title: 'Task title',
  description: 'Task description',
  priority: 'high',
  assignees: ['user-id-1', 'user-id-2'],
  tags: ['bug', 'urgent'],
});

console.log(response.data.id); // New card ID
```

### Update Card

```typescript
const response = await api.cards.update('card-id', 'project-id', {
  title: 'Updated title',
  priority: 'medium',
  assignees: ['user-id-1'],
});
```

### Move Card

```typescript
const response = await api.cards.move('card-id', 'project-id', {
  columnId: 'target-column-id',
  position: 0, // Optional: position in target column
});
```

### Delete Card

```typescript
await api.cards.delete('card-id', 'project-id');
```

## Organizations API

### List Organizations

```typescript
const response = await api.organizations.list();
console.log(response.data); // Organization[]
```

### Get Single Organization

```typescript
const response = await api.organizations.get('org-id');
console.log(response.data); // Organization
```

### Create Organization

```typescript
const response = await api.organizations.create({
  name: 'My Organization',
  slug: 'my-org', // Optional - auto-generated if not provided
  description: 'Org description',
  plan: 'free',
});
```

### Update Organization

```typescript
const response = await api.organizations.update('org-id', {
  name: 'Updated Name',
  plan: 'pro',
});
```

### Delete Organization

```typescript
await api.organizations.delete('org-id');
```

### List Organization Members

```typescript
const response = await api.organizations.getMembers('org-id');
console.log(response.data); // Member[]
```

## Error Handling

### Try-Catch Pattern

```typescript
import { ApiClientError } from '@/lib/api/v1-client';

try {
  const response = await api.projects.create({
    name: 'My Project',
  });

  console.log('Success:', response.data);
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Details:', error.apiError?.error.details);

    // Handle specific error codes
    switch (error.apiError?.error.code) {
      case 'UNAUTHORIZED':
        // Redirect to login
        break;
      case 'VALIDATION_ERROR':
        // Show validation errors
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Show rate limit message
        break;
      default:
        // Generic error handling
    }
  } else {
    console.error('Network Error:', error);
  }
}
```

### Global Error Handler

```typescript
configureApiClient({
  onError: (error) => {
    // Global error handling
    if (error.error.code === 'UNAUTHORIZED') {
      window.location.href = '/login';
    } else if (error.error.code === 'RATE_LIMIT_EXCEEDED') {
      showToast('Rate limit exceeded. Please try again later.');
    } else {
      showToast(error.error.message);
    }
  },
});
```

## React Hook Example

### Custom Hook

```typescript
import { useState, useEffect } from 'react';
import { api, Project } from '@/lib/api/v1-client';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await api.projects.list();
        setProjects(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return { projects, loading, error };
}
```

### Usage in Component

```typescript
function ProjectList() {
  const { projects, loading, error } = useProjects();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {projects.map((project) => (
        <li key={project.projectId}>{project.name}</li>
      ))}
    </ul>
  );
}
```

## TypeScript Types

All types are exported for use in your code:

```typescript
import {
  Project,
  Card,
  Organization,
  Board,
  ApiResponse,
  ApiPaginatedResponse,
  ApiError,
  ApiClientError,
} from '@/lib/api/v1-client';
```

## Rate Limiting

The API has rate limits:
- **API Key Auth**: 100 requests per 15 minutes
- **Session Auth**: 1000 requests per 15 minutes

Rate limit headers are returned in responses:
- `X-RateLimit-Limit`: Max requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Best Practices

1. **Use TypeScript**: The client provides full type safety
2. **Handle Errors**: Always use try-catch for API calls
3. **Show Loading States**: Provide feedback during API calls
4. **Cache When Possible**: Use React Query or SWR for caching
5. **Respect Rate Limits**: Check `X-RateLimit-*` headers
6. **Use Optimistic Updates**: Update UI immediately, sync with API
7. **Batch Requests**: Avoid making multiple calls in rapid succession

## Migration from Old API

### Before (Old API)

```typescript
const res = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Project' }),
});

const data = await res.json();
```

### After (API v1 Client)

```typescript
const response = await api.projects.create({ name: 'Project' });
// Fully typed, error handling included
```

## Next Steps

- Integrate with React Query for caching and synchronization
- Add optimistic updates for better UX
- Implement real-time updates via WebSocket
- Add offline support with service workers
