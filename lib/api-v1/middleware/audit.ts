import { NextApiResponse } from 'next';
import { ApiRequest } from '../types';
import { getRepositories } from '@/lib/repositories';

export type AuditAction = 'create' | 'update' | 'delete' | 'move' | 'view' | 'export' | 'login' | 'logout';

export function auditLog(action: AuditAction, resourceType: string) {
    return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void> | void) => {
        // Capture original json method to intercept response
        const originalJson = res.json;
        const { auditLogs } = getRepositories();

        // Override json method
        res.json = function (data: any) {
            // Only log successful operations (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Determine resource ID based on request
                let resourceId = 'unknown';

                // Try to find ID in response data first (for create operations)
                if (data && data.data && data.data.id) {
                    resourceId = data.data.id;
                } else if (data && data.id) {
                    resourceId = data.id;
                }
                // Fallback to query param (for update/delete operations)
                else if (req.query.id) {
                    resourceId = req.query.id as string;
                }
                // Fallback to specific ID params
                else if (req.query.projectId) resourceId = req.query.projectId as string;
                else if (req.query.cardId) resourceId = req.query.cardId as string;
                else if (req.query.groupId) resourceId = req.query.groupId as string;

                // Prepare audit log entry
                if (req.user) {
                    // Async write to audit log (don't await to avoid blocking response)
                    auditLogs.create({
                        organizationId: (req.user as any).companyId || undefined, // Use companyId as fallback
                        userId: req.user.id,
                        userName: req.user.name || req.user.email,
                        action,
                        resourceType,
                        resourceId,
                        projectId: (req.query.projectId as string) || (data.data && data.data.projectId),
                        changes: req.method === 'PATCH' || req.method === 'PUT' ? {
                            body: req.body,
                            // Note: Real diffing requires fetching previous state, which is expensive.
                            // For now, we log the update payload.
                        } : undefined,
                        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
                        userAgent: req.headers['user-agent'],
                        requestId: req.requestId,
                    }).catch((err: Error) => {
                        console.error('Failed to write audit log:', err);
                    });
                }
            }

            // Call original json method
            return originalJson.call(this, data);
        };

        await next();
    };
}
