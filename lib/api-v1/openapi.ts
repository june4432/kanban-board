/**
 * OpenAPI v3 Specification
 * Auto-generated API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kanban Board API',
      version: '1.0.0',
      description: 'Enterprise Kanban Board Management System - RESTful API',
      contact: {
        name: 'API Support',
        email: 'api@kanban.example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.kanban.example.com/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },

        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },

        // Organization schemas
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            plan: {
              type: 'string',
              enum: ['free', 'pro', 'enterprise'],
            },
            settings: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        OrganizationMember: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            userName: { type: 'string' },
            userEmail: { type: 'string' },
            role: {
              type: 'string',
              enum: ['owner', 'admin', 'editor', 'viewer', 'member'],
            },
            joinedAt: { type: 'string', format: 'date-time' },
          },
        },

        // Project schemas
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: { type: 'string' },
            organizationId: { type: 'string' },
            color: { type: 'string' },
            isPublic: { type: 'boolean' },
            members: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        // Card schemas
        Card: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            columnId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            assignees: { type: 'array', items: { type: 'string' } },
            labels: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            dueDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
      parameters: {
        page: {
          name: 'page',
          in: 'query',
          description: 'Page number',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        pageSize: {
          name: 'pageSize',
          in: 'query',
          description: 'Items per page',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        sort: {
          name: 'sort',
          in: 'query',
          description: 'Sort field (prefix with - for descending)',
          schema: { type: 'string' },
          example: '-createdAt',
        },
        search: {
          name: 'search',
          in: 'query',
          description: 'Search term',
          schema: { type: 'string' },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
    tags: [
      {
        name: 'Organizations',
        description: 'Organization management and multi-tenancy',
      },
      {
        name: 'Projects',
        description: 'Project CRUD operations',
      },
      {
        name: 'Cards',
        description: 'Card management and operations',
      },
    ],
  },
  apis: ['./pages/api/v1/**/*.ts'], // Path to API docs
};

export const openapiSpec = swaggerJsdoc(options);
