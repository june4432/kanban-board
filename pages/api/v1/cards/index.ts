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
  sendSuccess,
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
  const { cards, boards, projects } = getRepositories();

  // projectId is required for now (future: could search across all accessible projects)
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

  const board = boards.findByProjectId(filters.projectId);
  if (!board) {
    return sendSuccess(res, [], 200, req.requestId);
  }

  // Collect all cards from board
  let allCards: any[] = [];
  for (const column of board.columns) {
    allCards = allCards.concat(
      column.cards.map((card) => ({
        ...card,
        columnId: column.id,
        columnTitle: column.title,
      }))
    );
  }

  // Apply filters
  if (filters.columnId) {
    allCards = allCards.filter((c) => c.columnId === filters.columnId);
  }

  if (filters.assignee) {
    allCards = allCards.filter((c) => c.assignees?.includes(filters.assignee));
  }

  if (filters.priority) {
    allCards = allCards.filter((c) => c.priority === filters.priority);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    allCards = allCards.filter(
      (c) =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.tags) {
    const tagsArray = filters.tags.split(',').map((t) => t.trim());
    allCards = allCards.filter((c) =>
      c.tags?.some((tag: string) => tagsArray.includes(tag))
    );
  }

  if (filters.dueDateFrom) {
    const fromDate = new Date(filters.dueDateFrom);
    allCards = allCards.filter((c) => c.dueDate && new Date(c.dueDate) >= fromDate);
  }

  if (filters.dueDateTo) {
    const toDate = new Date(filters.dueDateTo);
    allCards = allCards.filter((c) => c.dueDate && new Date(c.dueDate) <= toDate);
  }

  // Sorting
  if (filters.sort) {
    const [field, order] = filters.sort.startsWith('-')
      ? [filters.sort.slice(1), 'desc']
      : [filters.sort, 'asc'];

    allCards.sort((a, b) => {
      let aVal = (a as any)[field];
      let bVal = (b as any)[field];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (order === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
  }

  // Pagination
  const total = allCards.length;
  const totalPages = Math.ceil(total / filters.pageSize);
  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize;
  const paginatedCards = allCards.slice(startIndex, endIndex);

  sendPaginated(
    res,
    {
      items: paginatedCards,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages,
    },
    req.requestId
  );
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
  const board = boards.findByProjectId(data.projectId);
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
  const newCard = cards.create({
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
