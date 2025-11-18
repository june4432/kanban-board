import { useState } from 'react';
import Head from 'next/head';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  auth: boolean;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    location: 'path' | 'query' | 'body';
  }[];
  requestBody?: {
    type: string;
    properties: {
      name: string;
      type: string;
      required: boolean;
      description: string;
      example?: any;
    }[];
  };
  responses: {
    status: number;
    description: string;
    example: any;
  }[];
  examples?: {
    title: string;
    code: string;
  }[];
}

interface ApiCategory {
  name: string;
  icon: string;
  endpoints: ApiEndpoint[];
}

const API_DOCUMENTATION: ApiCategory[] = [
  {
    name: 'Authentication',
    icon: '🔐',
    endpoints: [
      {
        id: 'auth-login',
        method: 'POST',
        path: '/api/auth/login',
        title: 'Login',
        description: 'Authenticate a user and create a session',
        auth: false,
        requestBody: {
          type: 'object',
          properties: [
            { name: 'email', type: 'string', required: true, description: 'User email address', example: 'user@example.com' },
            { name: 'password', type: 'string', required: true, description: 'User password', example: 'password123' },
          ]
        },
        responses: [
          {
            status: 200,
            description: 'Login successful',
            example: { success: true, user: { id: 'user-123', name: 'John Doe', email: 'user@example.com' } }
          },
          {
            status: 401,
            description: 'Invalid credentials',
            example: { error: 'Invalid email or password' }
          }
        ],
        examples: [
          {
            title: 'cURL',
            code: `curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'`
          },
          {
            title: 'JavaScript',
            code: `const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const data = await response.json();`
          }
        ]
      }
    ]
  },
  {
    name: 'Organizations',
    icon: '🏢',
    endpoints: [
      {
        id: 'orgs-list',
        method: 'GET',
        path: '/api/v1/organizations',
        title: 'List Organizations',
        description: 'Get all organizations accessible by the current user',
        auth: true,
        responses: [
          {
            status: 200,
            description: 'Organizations retrieved successfully',
            example: {
              data: [
                { id: 'org-123', name: 'Acme Corp', slug: 'acme', plan: 'pro', createdAt: '2025-01-01T00:00:00Z' }
              ],
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ],
        examples: [
          {
            title: 'cURL',
            code: `curl -H "Authorization: Bearer sk_live_abc123..." \\
  http://localhost:3000/api/v1/organizations`
          }
        ]
      },
      {
        id: 'orgs-create',
        method: 'POST',
        path: '/api/v1/organizations',
        title: 'Create Organization',
        description: 'Create a new organization',
        auth: true,
        requestBody: {
          type: 'object',
          properties: [
            { name: 'name', type: 'string', required: true, description: 'Organization name', example: 'Acme Corp' },
            { name: 'slug', type: 'string', required: false, description: 'URL-friendly identifier', example: 'acme' },
            { name: 'description', type: 'string', required: false, description: 'Organization description', example: 'Our company' },
            { name: 'plan', type: 'string', required: false, description: 'Subscription plan', example: 'pro' },
          ]
        },
        responses: [
          {
            status: 201,
            description: 'Organization created',
            example: {
              data: { id: 'org-123', name: 'Acme Corp', slug: 'acme', plan: 'free' },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      }
    ]
  },
  {
    name: 'Projects',
    icon: '📁',
    endpoints: [
      {
        id: 'projects-list',
        method: 'GET',
        path: '/api/v1/projects',
        title: 'List Projects',
        description: 'Get all projects with pagination and filtering',
        auth: true,
        parameters: [
          { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', location: 'query' },
          { name: 'pageSize', type: 'number', required: false, description: 'Items per page (default: 20, max: 100)', location: 'query' },
          { name: 'search', type: 'string', required: false, description: 'Search in name and description', location: 'query' },
          { name: 'isPublic', type: 'boolean', required: false, description: 'Filter by public/private', location: 'query' },
          { name: 'sort', type: 'string', required: false, description: 'Sort field (prefix with - for descending)', location: 'query' },
        ],
        responses: [
          {
            status: 200,
            description: 'Projects retrieved successfully',
            example: {
              data: [
                {
                  projectId: 'proj-123',
                  name: 'Sprint Planning',
                  description: 'Q4 2025',
                  ownerId: 'user-123',
                  color: '#3b82f6',
                  isPublic: false,
                  members: [],
                  createdAt: '2025-01-01T00:00:00Z',
                  updatedAt: '2025-11-18T10:00:00Z'
                }
              ],
              pagination: { page: 1, pageSize: 20, total: 5, totalPages: 1 },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ],
        examples: [
          {
            title: 'List all projects',
            code: `curl -H "Authorization: Bearer sk_live_abc123..." \\
  "http://localhost:3000/api/v1/projects"`
          },
          {
            title: 'Search projects',
            code: `curl -H "Authorization: Bearer sk_live_abc123..." \\
  "http://localhost:3000/api/v1/projects?search=sprint&page=1&pageSize=10"`
          }
        ]
      },
      {
        id: 'projects-create',
        method: 'POST',
        path: '/api/v1/projects',
        title: 'Create Project',
        description: 'Create a new project',
        auth: true,
        requestBody: {
          type: 'object',
          properties: [
            { name: 'name', type: 'string', required: true, description: 'Project name', example: 'New Project' },
            { name: 'description', type: 'string', required: false, description: 'Project description', example: 'Project description' },
            { name: 'color', type: 'string', required: false, description: 'Project color (hex)', example: '#3b82f6' },
            { name: 'isPublic', type: 'boolean', required: false, description: 'Public visibility', example: false },
          ]
        },
        responses: [
          {
            status: 201,
            description: 'Project created successfully',
            example: {
              data: { projectId: 'proj-456', name: 'New Project', ownerId: 'user-123', color: '#3b82f6' },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      },
      {
        id: 'projects-get',
        method: 'GET',
        path: '/api/v1/projects/:id',
        title: 'Get Project',
        description: 'Get detailed information about a specific project',
        auth: true,
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Project ID', location: 'path' },
        ],
        responses: [
          {
            status: 200,
            description: 'Project retrieved successfully',
            example: {
              data: { projectId: 'proj-123', name: 'Sprint Planning', ownerId: 'user-123' },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          },
          {
            status: 404,
            description: 'Project not found',
            example: { error: { code: 'NOT_FOUND', message: 'Project not found' } }
          }
        ]
      },
      {
        id: 'projects-get-board',
        method: 'GET',
        path: '/api/v1/projects/:id/board',
        title: 'Get Project Board',
        description: 'Get the kanban board for a project including all columns and cards',
        auth: true,
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Project ID', location: 'path' },
        ],
        responses: [
          {
            status: 200,
            description: 'Board retrieved successfully',
            example: {
              data: {
                boardId: 'board-123',
                projectId: 'proj-123',
                columns: [
                  {
                    id: 'col-1',
                    title: 'To Do',
                    position: 0,
                    wipLimit: 10,
                    cards: [
                      {
                        id: 'card-1',
                        title: 'Task 1',
                        description: 'Description',
                        priority: 'high',
                        assignees: ['user-123'],
                        position: 0
                      }
                    ]
                  }
                ],
                labels: [],
                milestones: []
              },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      }
    ]
  },
  {
    name: 'Cards',
    icon: '📝',
    endpoints: [
      {
        id: 'cards-list',
        method: 'GET',
        path: '/api/v1/cards',
        title: 'List/Search Cards',
        description: 'Get cards with advanced filtering and search',
        auth: true,
        parameters: [
          { name: 'projectId', type: 'string', required: true, description: 'Filter by project', location: 'query' },
          { name: 'columnId', type: 'string', required: false, description: 'Filter by column', location: 'query' },
          { name: 'assignee', type: 'string', required: false, description: 'Filter by assignee', location: 'query' },
          { name: 'priority', type: 'string', required: false, description: 'Filter by priority (low, medium, high, urgent)', location: 'query' },
          { name: 'search', type: 'string', required: false, description: 'Search in title and description', location: 'query' },
          { name: 'page', type: 'number', required: false, description: 'Page number', location: 'query' },
        ],
        responses: [
          {
            status: 200,
            description: 'Cards retrieved successfully',
            example: {
              data: [
                {
                  id: 'card-123',
                  title: 'Fix login bug',
                  description: 'Users unable to login',
                  priority: 'high',
                  columnId: 'col-123',
                  assignees: ['user-456'],
                  createdAt: '2025-11-10T09:00:00Z'
                }
              ],
              pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ],
        examples: [
          {
            title: 'List all cards in project',
            code: `curl -H "Authorization: Bearer sk_live_abc123..." \\
  "http://localhost:3000/api/v1/cards?projectId=proj-123"`
          },
          {
            title: 'Search high priority cards',
            code: `curl -H "Authorization: Bearer sk_live_abc123..." \\
  "http://localhost:3000/api/v1/cards?projectId=proj-123&priority=high&search=bug"`
          }
        ]
      },
      {
        id: 'cards-create',
        method: 'POST',
        path: '/api/v1/cards',
        title: 'Create Card',
        description: 'Create a new card in a column',
        auth: true,
        requestBody: {
          type: 'object',
          properties: [
            { name: 'projectId', type: 'string', required: true, description: 'Project ID', example: 'proj-123' },
            { name: 'columnId', type: 'string', required: true, description: 'Column ID', example: 'col-123' },
            { name: 'title', type: 'string', required: true, description: 'Card title', example: 'New Task' },
            { name: 'description', type: 'string', required: false, description: 'Card description', example: 'Task details' },
            { name: 'priority', type: 'string', required: false, description: 'Priority level', example: 'medium' },
            { name: 'assignees', type: 'string[]', required: false, description: 'Assignee user IDs', example: ['user-123'] },
            { name: 'dueDate', type: 'string', required: false, description: 'Due date (ISO 8601)', example: '2025-11-20T00:00:00Z' },
          ]
        },
        responses: [
          {
            status: 201,
            description: 'Card created successfully',
            example: {
              data: { id: 'card-999', title: 'New Task', columnId: 'col-123', priority: 'medium' },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      },
      {
        id: 'cards-update',
        method: 'PATCH',
        path: '/api/v1/cards/:id',
        title: 'Update Card',
        description: 'Update an existing card',
        auth: true,
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Card ID', location: 'path' },
          { name: 'projectId', type: 'string', required: true, description: 'Project ID', location: 'query' },
        ],
        requestBody: {
          type: 'object',
          properties: [
            { name: 'title', type: 'string', required: false, description: 'Card title' },
            { name: 'description', type: 'string', required: false, description: 'Card description' },
            { name: 'priority', type: 'string', required: false, description: 'Priority level' },
            { name: 'assignees', type: 'string[]', required: false, description: 'Assignee user IDs' },
          ]
        },
        responses: [
          {
            status: 200,
            description: 'Card updated successfully',
            example: {
              data: { id: 'card-123', title: 'Updated Title', priority: 'urgent' },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      },
      {
        id: 'cards-move',
        method: 'POST',
        path: '/api/v1/cards/:id/move',
        title: 'Move Card',
        description: 'Move a card to a different column',
        auth: true,
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Card ID', location: 'path' },
          { name: 'projectId', type: 'string', required: true, description: 'Project ID', location: 'query' },
        ],
        requestBody: {
          type: 'object',
          properties: [
            { name: 'columnId', type: 'string', required: true, description: 'Target column ID', example: 'col-456' },
            { name: 'position', type: 'number', required: false, description: 'Position in column', example: 2 },
          ]
        },
        responses: [
          {
            status: 200,
            description: 'Card moved successfully',
            example: {
              data: { id: 'card-123', columnId: 'col-456', position: 2 },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      }
    ]
  },
  {
    name: 'Dashboard',
    icon: '📊',
    endpoints: [
      {
        id: 'dashboard-get',
        method: 'GET',
        path: '/api/projects/:projectId/dashboard',
        title: 'Get Project Dashboard',
        description: 'Get comprehensive dashboard statistics for a project',
        auth: true,
        parameters: [
          { name: 'projectId', type: 'string', required: true, description: 'Project ID', location: 'path' },
        ],
        responses: [
          {
            status: 200,
            description: 'Dashboard data retrieved successfully',
            example: {
              dashboard: {
                cardStats: {
                  total: 45,
                  byColumn: { 'To Do': 12, 'In Progress': 8, 'Done': 25 },
                  byPriority: { low: 10, medium: 20, high: 12, urgent: 3 },
                  overdue: 5,
                  dueSoon: 8,
                  completed: 25
                },
                progress: { percentage: 55, totalCards: 45, completedCards: 25 },
                teamActivity: [
                  { userId: 'user-123', userName: 'John', cardsAssigned: 8, cardsCompleted: 5, commentsCount: 23 }
                ],
                recentActivity: [
                  { action: 'update', userName: 'John', resourceType: 'card', resourceId: 'card-123', timestamp: '2025-11-18T10:00:00Z' }
                ],
                trends: [
                  { date: '2025-11-01', cardsCreated: 5, cardsCompleted: 3, cardsActive: 12 }
                ]
              }
            }
          }
        ]
      }
    ]
  },
  {
    name: 'API Keys',
    icon: '🔑',
    endpoints: [
      {
        id: 'apikeys-list',
        method: 'GET',
        path: '/api/v1/api-keys',
        title: 'List API Keys',
        description: 'Get all API keys for the current user',
        auth: true,
        responses: [
          {
            status: 200,
            description: 'API keys retrieved successfully',
            example: {
              data: [
                {
                  id: 'key-123',
                  name: 'Production Key',
                  keyPrefix: 'sk_live_',
                  scopes: 'read,write',
                  isActive: true,
                  createdAt: '2025-01-01T00:00:00Z',
                  lastUsedAt: '2025-11-18T10:00:00Z'
                }
              ],
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      },
      {
        id: 'apikeys-create',
        method: 'POST',
        path: '/api/v1/api-keys',
        title: 'Create API Key',
        description: 'Generate a new API key (shown only once)',
        auth: true,
        requestBody: {
          type: 'object',
          properties: [
            { name: 'name', type: 'string', required: true, description: 'Key name', example: 'Production Key' },
            { name: 'scopes', type: 'string', required: false, description: 'Permissions (comma-separated)', example: 'read,write' },
            { name: 'expiresAt', type: 'string', required: false, description: 'Expiration date (ISO 8601)', example: '2026-01-01T00:00:00Z' },
          ]
        },
        responses: [
          {
            status: 201,
            description: 'API key created (save the key - shown only once!)',
            example: {
              data: {
                id: 'key-123',
                name: 'Production Key',
                apiKey: 'sk_live_abc123def456...',
                keyPrefix: 'sk_live_',
                scopes: 'read,write',
                createdAt: '2025-11-18T10:00:00Z'
              },
              meta: { requestId: 'req-123', timestamp: '2025-11-18T10:00:00Z' }
            }
          }
        ]
      }
    ]
  }
];

export default function ApiReference() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_DOCUMENTATION[0]!.endpoints[0]!);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = API_DOCUMENTATION.map(category => ({
    ...category,
    endpoints: category.endpoints.filter(endpoint =>
      endpoint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.endpoints.length > 0);

  const methodColors = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    PATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <>
      <Head>
        <title>API Reference - Kanban Board</title>
      </Head>

      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              API Reference
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Complete REST API documentation
            </p>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Categories */}
            <nav className="space-y-6">
              {filteredDocs.map((category) => (
                <div key={category.name}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </h3>
                  <ul className="space-y-1">
                    {category.endpoints.map((endpoint) => (
                      <li key={endpoint.id}>
                        <button
                          onClick={() => setSelectedEndpoint(endpoint)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedEndpoint.id === endpoint.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${methodColors[endpoint.method]}`}>
                              {endpoint.method}
                            </span>
                            <span className="font-medium truncate">{endpoint.title}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded ${methodColors[selectedEndpoint.method]}`}>
                  {selectedEndpoint.method}
                </span>
                <code className="text-lg font-mono text-gray-900 dark:text-white">
                  {selectedEndpoint.path}
                </code>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedEndpoint.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedEndpoint.description}
              </p>

              {selectedEndpoint.auth && (
                <div className="mt-4 flex items-center text-sm">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    🔒 Authentication required
                  </span>
                </div>
              )}
            </div>

            {/* Parameters */}
            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Parameters</h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedEndpoint.parameters.map((param) => (
                        <tr key={param.name}>
                          <td className="px-4 py-3">
                            <code className="text-sm font-mono text-purple-600 dark:text-purple-400">
                              {param.name}
                            </code>
                            {param.required && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">*required</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {param.type}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              {param.location}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {param.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Request Body */}
            {selectedEndpoint.requestBody && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Request Body</h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedEndpoint.requestBody.properties.map((prop) => (
                        <tr key={prop.name}>
                          <td className="px-4 py-3">
                            <code className="text-sm font-mono text-purple-600 dark:text-purple-400">
                              {prop.name}
                            </code>
                            {prop.required && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">*required</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {prop.type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {prop.description}
                          </td>
                          <td className="px-4 py-3">
                            {prop.example !== undefined && (
                              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-white">
                                {JSON.stringify(prop.example)}
                              </code>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Responses */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Responses</h2>
              <div className="space-y-4">
                {selectedEndpoint.responses.map((response) => (
                  <div key={response.status} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${
                          response.status < 300 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          response.status < 400 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {response.status}
                        </span>
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{response.description}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{JSON.stringify(response.example, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Examples */}
            {selectedEndpoint.examples && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Examples</h2>
                <div className="space-y-4">
                  {selectedEndpoint.examples.map((example, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{example.title}</span>
                      </div>
                      <div className="p-4">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{example.code}</code>
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
