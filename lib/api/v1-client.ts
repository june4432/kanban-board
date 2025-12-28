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

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  cardId: string;
  userId: string;
  userName?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileUrl: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'move';
  resourceType: string;
  resourceId: string;
  projectId?: string;
  changes?: any;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  companyId?: string;
  companyRole?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: string;
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

    delete: async (projectId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },

    leave: async (projectId: string): Promise<ApiResponse<{ message: string; project: Project }>> => {
      return this.request<{ message: string; project: Project }>(`/projects/${projectId}/leave`, {
        method: 'DELETE',
      });
    },

    join: async (projectId: string, message?: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/projects/${projectId}/join`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },

    getJoinRequests: async (projectId: string): Promise<ApiResponse<{ requests: any[] }>> => {
      return this.request<{ requests: any[] }>(`/projects/${projectId}/join-requests`);
    },

    approveJoinRequest: async (projectId: string, requestId: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/projects/${projectId}/join-requests/${requestId}/approve`, {
        method: 'POST',
      });
    },

    rejectJoinRequest: async (projectId: string, requestId: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/projects/${projectId}/join-requests/${requestId}/reject`, {
        method: 'POST',
      });
    },

    getMembers: async (projectId: string): Promise<ApiResponse<{ members: any[] }>> => {
      return this.request<{ members: any[] }>(`/projects/${projectId}/members`);
    },

    addMember: async (projectId: string, userId: string, role?: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
      });
    },

    updateMember: async (projectId: string, userId: string, role: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },

    removeMember: async (projectId: string, userId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },

    inviteMember: async (projectId: string, email: string, role?: string): Promise<ApiResponse<{ invite: any }>> => {
      return this.request<{ invite: any }>(`/projects/${projectId}/members/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
    },

    getDashboard: async (projectId: string): Promise<ApiResponse<any>> => {
      return this.request<any>(`/projects/${projectId}/dashboard`);
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

    // Comments
    getComments: async (cardId: string): Promise<ApiResponse<{ comments: Comment[] }>> => {
      return this.request<{ comments: Comment[] }>(`/cards/${cardId}/comments`);
    },

    createComment: async (cardId: string, content: string): Promise<ApiResponse<{ comment: Comment }>> => {
      return this.request<{ comment: Comment }>(`/cards/${cardId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },

    updateComment: async (cardId: string, commentId: string, content: string): Promise<ApiResponse<{ comment: Comment }>> => {
      return this.request<{ comment: Comment }>(`/cards/${cardId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    },

    deleteComment: async (cardId: string, commentId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/cards/${cardId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },

    // Attachments
    getAttachments: async (cardId: string): Promise<ApiResponse<{ attachments: Attachment[] }>> => {
      return this.request<{ attachments: Attachment[] }>(`/cards/${cardId}/attachments`);
    },

    createAttachment: async (cardId: string, data: {
      fileName: string;
      fileType?: string;
      fileSize?: number;
      fileUrl: string;
    }): Promise<ApiResponse<{ attachment: Attachment }>> => {
      return this.request<{ attachment: Attachment }>(`/cards/${cardId}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    deleteAttachment: async (cardId: string, attachmentId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/cards/${cardId}/attachments/${attachmentId}`, {
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

    addMember: async (orgId: string, userId: string, role?: string): Promise<ApiResponse<{ message: string }>> => {
      return this.request<{ message: string }>(`/organizations/${orgId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
      });
    },

    removeMember: async (orgId: string, userId: string): Promise<void> => {
      await fetch(`${clientConfig.baseUrl}/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },
  };

  // ============================================================================
  // Users API
  // ============================================================================

  users = {
    list: async (): Promise<ApiResponse<User[]>> => {
      return this.request<User[]>('/users');
    },

    get: async (userId: string): Promise<ApiResponse<User>> => {
      return this.request<User>(`/users/${userId}`);
    },

    getMe: async (): Promise<ApiResponse<User>> => {
      return this.request<User>('/users/me');
    },

    update: async (userId: string, data: {
      name?: string;
      avatarUrl?: string;
    }): Promise<ApiResponse<User>> => {
      return this.request<User>(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  };

  // ============================================================================
  // Companies API
  // ============================================================================

  companies = {
    list: async (): Promise<ApiResponse<Company[]>> => {
      return this.request<Company[]>('/companies');
    },

    get: async (companyId: string): Promise<ApiResponse<Company>> => {
      return this.request<Company>(`/companies/${companyId}`);
    },

    create: async (data: {
      name: string;
      slug?: string;
      domain?: string;
      plan?: string;
    }): Promise<ApiResponse<Company>> => {
      return this.request<Company>('/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (companyId: string, data: {
      name?: string;
      domain?: string;
      plan?: string;
    }): Promise<ApiResponse<Company>> => {
      return this.request<Company>(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  };

  // ============================================================================
  // Audit Logs API
  // ============================================================================

  auditLogs = {
    list: async (params?: {
      projectId?: string;
      userId?: string;
      resourceType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<{ logs: AuditLog[]; pagination: any }>> => {
      const query = new URLSearchParams(params as any).toString();
      return this.request<{ logs: AuditLog[]; pagination: any }>(`/audit-logs${query ? `?${query}` : ''}`);
    },

    get: async (logId: string): Promise<ApiResponse<{ log: AuditLog }>> => {
      return this.request<{ log: AuditLog }>(`/audit-logs/${logId}`);
    },

    getStatistics: async (projectId: string, days?: number): Promise<ApiResponse<{
      projectId: string;
      period: { days: number; startDate: string; endDate: string };
      totalActions: number;
      actionsByType: Record<string, number>;
      actionsByUser: Record<string, number>;
      recentActivity: AuditLog[];
    }>> => {
      const query = new URLSearchParams({
        projectId,
        ...(days && { days: days.toString() })
      }).toString();
      return this.request<any>(`/audit-logs/statistics?${query}`);
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
