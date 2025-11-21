import { queryOne, queryAll } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLog {
    id: string;
    organizationId?: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'move' | 'view' | 'export' | 'login' | 'logout';
    resourceType: string;
    resourceId: string;
    projectId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    createdAt: Date;
}

export interface CreateAuditLogParams {
    organizationId?: string;
    userId: string;
    userName: string;
    action: AuditLog['action'];
    resourceType: string;
    resourceId: string;
    projectId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
}

export interface AuditLogFilters {
    organizationId?: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    projectId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export class AuditLogRepository {
    async create(params: CreateAuditLogParams): Promise<AuditLog> {
        const id = uuidv4();
        const sql = `
      INSERT INTO audit_logs (
        id, organization_id, user_id, user_name, action, 
        resource_type, resource_id, project_id, changes, 
        ip_address, user_agent, request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

        const values = [
            id,
            params.organizationId,
            params.userId,
            params.userName,
            params.action,
            params.resourceType,
            params.resourceId,
            params.projectId,
            params.changes ? JSON.stringify(params.changes) : null,
            params.ipAddress,
            params.userAgent,
            params.requestId,
        ];

        const result = await queryOne<any>(sql, values);
        return this.mapToModel(result);
    }

    async findByOrganization(organizationId: string, filters: AuditLogFilters = {}): Promise<{ logs: AuditLog[], total: number }> {
        let sql = `SELECT * FROM audit_logs WHERE organization_id = $1`;
        const values: any[] = [organizationId];
        let paramIndex = 2;

        if (filters.userId) {
            sql += ` AND user_id = $${paramIndex++}`;
            values.push(filters.userId);
        }

        if (filters.resourceType) {
            sql += ` AND resource_type = $${paramIndex++}`;
            values.push(filters.resourceType);
        }

        if (filters.resourceId) {
            sql += ` AND resource_id = $${paramIndex++}`;
            values.push(filters.resourceId);
        }

        if (filters.projectId) {
            sql += ` AND project_id = $${paramIndex++}`;
            values.push(filters.projectId);
        }

        if (filters.action) {
            sql += ` AND action = $${paramIndex++}`;
            values.push(filters.action);
        }

        if (filters.startDate) {
            sql += ` AND created_at >= $${paramIndex++}`;
            values.push(filters.startDate);
        }

        if (filters.endDate) {
            sql += ` AND created_at <= $${paramIndex++}`;
            values.push(filters.endDate);
        }

        // Count total before pagination
        const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
        const countResult = await queryOne(countSql, values);
        const total = parseInt(countResult?.total || '0');

        // Add sorting and pagination
        sql += ` ORDER BY created_at DESC`;

        if (filters.limit) {
            sql += ` LIMIT $${paramIndex++}`;
            values.push(filters.limit);
        }

        if (filters.offset) {
            sql += ` OFFSET $${paramIndex++}`;
            values.push(filters.offset);
        }

        const rows = await queryAll<any>(sql, values);
        const logs = rows.map(this.mapToModel);

        return { logs, total };
    }

    private mapToModel(row: any): AuditLog {
        return {
            id: row.id,
            organizationId: row.organization_id,
            userId: row.user_id,
            userName: row.user_name,
            action: row.action,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            projectId: row.project_id,
            changes: row.changes,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            requestId: row.request_id,
            createdAt: row.created_at,
        };
    }
}
