/**
 * API v1 Client Wrapper
 * Type-safe client for API v1 endpoints
 */

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiPaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  color?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }>;
  pendingRequests?: any[];
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignees?: string[];
  labels?: string[];
  dueDate?: string;
  tags?: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  boardId: string;
  projectId: string;
  columns: Array<{
    id: string;
    title: string;
    wipLimit: number;
    position: number;
    cards: Card[];
  }>;
  labels: any[];
  milestones: any[];
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface ApiClientConfig {
  baseUrl?: string;
  apiKey?: string;
  onError?: (error: ApiError) => void;
}

const defaultConfig: ApiClientConfig = {
  baseUrl: '/api/v1',
};

let clientConfig: ApiClientConfig = { ...defaultConfig };

export function configureApiClient(config: Partial<ApiClientConfig>) {
  clientConfig = { ...clientConfig, ...config };
}

// ============================================================================
// HTTP Client
// ============================================================================

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${clientConfig.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add API key if configured
    if (clientConfig.apiKey) {
      headers['Authorization'] = `Bearer ${clientConfig.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for session auth
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        if (clientConfig.onError) {
          clientConfig.onError(error);
        }
        throw new ApiClientError(error.error.message, response.status, error);
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Projects API
  // ============================================================================

  projects = {
    list: async (params?: {
      page?: number;
      pageSize?: number;
      organizationId?: string;
      isPublic?: boolean;
      search?: string;
    }): Promise<ApiPaginatedResponse<Project>> => {
      const query = new URLSearchParams(params as any).toString();
      return this.request<Project[]>(`/projects${query ? `?${query}` : ''}`) as any;
    },

    get: async (projectId: string): Promise<ApiResponse<Project>> => {
      return this.request<Project>(`/projects/${projectId}`);
    },

    create: async (data: {
      name: string;
      description?: string;
      color?: string;
      isPublic?: boolean;
      organizationId?: string;
      companyId?: string;
    }): Promise<ApiResponse<Project>> => {
      return this.request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (
      projectId: string,
      data: {
        name?: string;
        description?: string;
        color?: string;
        isPublic?: boolean;
      }
    ): Promise<ApiResponse<Project>> => {
      return this.request<Project>(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    getBoard: async (projectId: string): Promise<ApiResponse<Board>> => {
      return this.request<Board>(`/projects/${projectId}/board`);
    },

    createLabel: async (
      projectId: string,
      data: {
        name: string;
        color: string;
      }
    ): Promise<ApiResponse<{ label: any; message: string }>> => {
      return this.request<{ label: any; message: string }>(`/projects/${projectId}/labels`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    createMilestone: async (
      projectId: string,
      data: {
        name: string;
        dueDate: string;
        description?: string;
      }
    ): Promise<ApiResponse<{ milestone: any; message: string }>> => {
      return this.request<{ milestone: any; message: string }>(`/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateColumn: async (
      projectId: string,
      columnId: string,
      data: {
        wipLimit?: number;
      }
    ): Promise<ApiResponse<{ column: any; message: string }>> => {
      return this.request<{ column: any; message: string }>(`/projects/${projectId}/columns/${columnId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  };

  // ============================================================================
  // Cards API
  // ============================================================================

  cards = {
    list: async (params: {
      projectId: string;
      columnId?: string;
      priority?: string;
      assignee?: string;
      search?: string;
    }): Promise<ApiResponse<Card[]>> => {
      const query = new URLSearchParams(params as any).toString();
      return this.request<Card[]>(`/cards?${query}`);
    },

    get: async (cardId: string, projectId: string): Promise<ApiResponse<Card>> => {
      return this.request<Card>(`/cards/${cardId}?projectId=${projectId}`);
    },

    create: async (data: {
      projectId: string;
      columnId: string;
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assignees?: string[];
      labels?: string[];
      dueDate?: string;
      tags?: string[];
    }): Promise<ApiResponse<Card>> => {
      return this.request<Card>('/cards', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (
      cardId: string,
      projectId: string,
      data: {
        title?: string;
        description?: string;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        assignees?: string[];
        labels?: string[];
        dueDate?: string;
        tags?: string[];
      }
    ): Promise<ApiResponse<Card>> => {
      return this.request<Card>(`/cards/${cardId}?projectId=${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    move: async (
      cardId: string,
      projectId: string,
      data: {
        columnId: string;
        position?: number;
      }
    ): Promise<ApiResponse<Card>> => {
      return this.request<Card>(`/cards/${cardId}/move?projectId=${projectId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    delete: async (cardId: string, projectId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/cards/${cardId}?projectId=${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },
  };

  // ============================================================================
  // Organizations API
  // ============================================================================

  organizations = {
    list: async (): Promise<ApiResponse<Organization[]>> => {
      return this.request<Organization[]>('/organizations');
    },

    get: async (orgId: string): Promise<ApiResponse<Organization>> => {
      return this.request<Organization>(`/organizations/${orgId}`);
    },

    create: async (data: {
      name: string;
      slug?: string;
      description?: string;
      plan?: 'free' | 'pro' | 'enterprise';
    }): Promise<ApiResponse<Organization>> => {
      return this.request<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (
      orgId: string,
      data: {
        name?: string;
        description?: string;
        plan?: 'free' | 'pro' | 'enterprise';
      }
    ): Promise<ApiResponse<Organization>> => {
      return this.request<Organization>(`/organizations/${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (orgId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/organizations/${orgId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },

    getMembers: async (orgId: string): Promise<ApiResponse<any[]>> => {
      return this.request<any[]>(`/organizations/${orgId}/members`);
    },
  };
}

// ============================================================================
// Error Class
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: ApiError
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const api = new ApiClient();

// Export for custom instances
export { ApiClient };
