/**
 * API v1: Project Milestones
 * POST /api/v1/projects/:id/milestones - Create a new milestone for the project
 */

import { NextApiResponse } from 'next';
import { ApiRequest, ApiErrorCode } from '@/lib/api-v1/types';
import { withErrorHandler } from '@/lib/api-v1/middleware/error-handler';
import { requireAuth, requireProjectMember } from '@/lib/api-v1/middleware/auth';
import { sendSuccess, sendMethodNotAllowed, sendError } from '@/lib/api-v1/utils/response';
import { validateId, validateBody } from '@/lib/api-v1/utils/validation';
import { getRepositories } from '@/lib/repositories';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schema for creating a milestone
const CreateMilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(100, 'Milestone name is too long'),
  dueDate: z.string().refine((val) => {
    // Accept YYYY-MM-DD format or ISO datetime
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val) && !isNaN(Date.parse(val));
  }, 'Invalid date format (must be YYYY-MM-DD or ISO 8601 datetime)'),
  description: z.string().max(500, 'Description is too long').optional(),
  scope: z.enum(['organization', 'project', 'board']).optional().default('board'),
});

async function handler(req: ApiRequest, res: NextApiResponse) {
  req.requestId = uuidv4();

  const projectId = validateId(req.query.id, 'projectId');

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST'], req.requestId);
  }

  return await handlePost(req, res, projectId);
}

/**
 * POST /api/v1/projects/:id/milestones
 * Create a new milestone for the project
 */
async function handlePost(req: ApiRequest, res: NextApiResponse, projectId: string) {
  // Check project membership
  const membershipCheck = await requireProjectMember(req, res, projectId);
  if (!membershipCheck) return;

  // Debug logging
  console.log('[Milestone API] req.body:', JSON.stringify(req.body));
  console.log('[Milestone API] req.body type:', typeof req.body);
  console.log('[Milestone API] req.body is null:', req.body === null);
  console.log('[Milestone API] req.body is undefined:', req.body === undefined);

  // Validate request body
  const body = validateBody(req, CreateMilestoneSchema);

  const { boards, projects } = getRepositories();

  // Determine scope and scope_id based on the scope parameter
  let scopeId: string;
  // Map 'board' to 'project' for backward compatibility
  const scope: 'company' | 'organization' | 'project' =
    (body.scope === 'board' || !body.scope) ? 'project' :
    (body.scope as 'company' | 'organization' | 'project');

  if (scope === 'organization') {
    // Get organization_id from project
    const project = await projects.findById(projectId);
    if (!project || !project.organizationId) {
      return sendError(
        res,
        ApiErrorCode.NOT_FOUND,
        'Organization not found for this project',
        404,
        undefined,
        req.requestId
      );
    }
    scopeId = project.organizationId;
  } else {
    // scope === 'project' or 'company' - use project ID
    scopeId = projectId;
  }

  // Get current board for checking existing milestones
  const board = await boards.findByProjectId(projectId);
  if (!board) {
    return sendError(
      res,
      ApiErrorCode.NOT_FOUND,
      'Board not found for this project',
      404,
      undefined,
      req.requestId
    );
  }

  // Check if milestone with same name already exists in this scope
  const existingMilestone = board.milestones?.find(
    (m) => m.name.toLowerCase() === body.name.toLowerCase()
  );

  if (existingMilestone) {
    return sendSuccess(
      res,
      {
        milestone: existingMilestone,
        message: 'Milestone already exists',
      },
      200,
      req.requestId
    );
  }

  // Create new milestone with scope
  const newMilestone = await boards.createMilestone(scopeId, {
    name: body.name,
    dueDate: new Date(body.dueDate),
    description: body.description,
    scope: scope,
  });

  sendSuccess(
    res,
    {
      milestone: newMilestone,
      message: 'Milestone created successfully',
    },
    201,
    req.requestId
  );
}

export default withErrorHandler(requireAuth(handler));
