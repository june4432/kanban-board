/**
 * API v1: Cards Collection
 * GET  /api/v1/cards - List/search cards
 * POST /api/v1/cards - Create card
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireProjectMember } from '@/lib/api-v1/middleware/auth';
import {
  sendCreated,
  sendMethodNotAllowed,
  sendPaginated,
  sendValidationError,
} from '@/lib/api-v1/utils/response';
import {
  validateBody,
  validateQuery,
  createCardSchema,
  cardFiltersSchema,
} from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'POST':
      return await handlePost(req, res);
    default:
      return sendMethodNotAllowed(res, ['GET', 'POST'], req.requestId);
  }
}

/**
 * GET /api/v1/cards
 * List/search cards with filters
 */
async function handleGet(req: ApiRequest, res: NextApiResponse) {
  const filters = validateQuery(req, cardFiltersSchema);
  const { cards } = getRepositories();

  // projectId is required for now
  if (!filters.projectId) {
    return sendValidationError(
      res,
      'Project ID is required',
      [{ field: 'projectId', message: 'This field is required' }],
      req.requestId
    );
  }

  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, filters.projectId);
  if (!membershipCheck) return;

  // Prepare query options
  const queryOptions = {
    projectId: filters.projectId,
    filters: {
      status: filters.columnId ? [filters.columnId] : undefined, // Map columnId to status/column filter
      priority: filters.priority ? [filters.priority] : undefined,
      assignee: filters.assignee ? [filters.assignee] : undefined,
      tags: filters.tags ? filters.tags.split(',').map(t => t.trim()) : undefined,
      search: filters.search,
      dueDate: {
        gte: filters.dueDateFrom ? new Date(filters.dueDateFrom) : undefined,
        lte: filters.dueDateTo ? new Date(filters.dueDateTo) : undefined,
      }
    },
    sort: filters.sort ? [{
      field: filters.sort.startsWith('-') ? filters.sort.slice(1) : filters.sort,
      direction: (filters.sort.startsWith('-') ? 'desc' : 'asc') as 'asc' | 'desc'
    }] : [],
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize
    }
  };

  try {
    const result = await cards.findAll(queryOptions);

    sendPaginated(
      res,
      {
        items: result.cards,
        total: result.total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(result.total / filters.pageSize),
      },
      req.requestId
    );
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    // Fallback or error response?
    // For now, let the error handler catch it or send internal error
    throw error;
  }
}

/**
 * POST /api/v1/cards
 * Create a new card
 */
async function handlePost(req: ApiRequest, res: NextApiResponse) {
  const data = validateBody(req, createCardSchema);
  const { cards, boards } = getRepositories();

  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, data.projectId);
  if (!membershipCheck) return;

  // Get board and validate column
  // Note: boards repo might still be SQLite, but we can use it for validation if it works.
  // If boards repo is not migrated, findByProjectId might be sync.
  const board = await boards.findByProjectId(data.projectId);
  if (!board) {
    return sendValidationError(
      res,
      'Board not found for this project',
      undefined,
      req.requestId
    );
  }

  const column = board.columns.find((col) => col.id === data.columnId);
  if (!column) {
    return sendValidationError(
      res,
      'Column not found',
      [{ field: 'columnId', message: 'Invalid column ID' }],
      req.requestId
    );
  }

  // Check WIP limit
  if (column.wipLimit > 0 && column.cards.length >= column.wipLimit) {
    return sendValidationError(
      res,
      `WIP limit exceeded: ${column.title} column has a maximum of ${column.wipLimit} cards`,
      [
        {
          field: 'columnId',
          message: `Column ${column.title} is at capacity (${column.wipLimit} cards)`,
        },
      ],
      req.requestId
    );
  }

  // Create card
  const newCard = await cards.create({
    columnId: data.columnId,
    title: data.title,
    description: data.description || '',
    assignees: data.assignees || [],
    labels: data.labels || [],
    milestoneId: undefined,
    priority: data.priority || 'medium',
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  });

  // Note: WebSocket notifications would be sent here in production
  // For now, omitting to keep API v1 focused on RESTful pattern

  sendCreated(res, newCard, req.requestId);
}

export default withErrorHandler(requireAuth(handler));
