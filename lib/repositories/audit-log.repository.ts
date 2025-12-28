import { queryOne, queryAll } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLog {
    id: string;
    organizationId?: string; // Legacy - maps to organization_id column
    companyId?: string; // Alias for organizationId (same DB column)
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'move' | 'view' | 'export' | 'login' | 'logout';
    resourceType: string;
    resourceId: string;
    projectId?: string;
    groupId?: string; // New - for group-related actions
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    createdAt: Date;
}

export interface CreateAuditLogParams {
    organizationId?: string; // Legacy - will be stored as organization_id
    companyId?: string; // Preferred - same column as organizationId
    userId: string;
    userName: string;
    action: AuditLog['action'];
    resourceType: string;
    resourceId: string;
    projectId?: string;
    groupId?: string; // For group-related actions
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
}

export interface AuditLogFilters {
    organizationId?: string; // Legacy
    companyId?: string; // Preferred - same as organizationId
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    projectId?: string;
    groupId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export class AuditLogRepository {
    async create(params: CreateAuditLogParams): Promise<AuditLog> {
        const id = uuidv4();
        // Use companyId as preferred, fallback to organizationId (same DB column)
        const orgId = params.companyId || params.organizationId;

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
            orgId,
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
            companyId: row.organization_id, // Alias for organizationId
            userId: row.user_id,
            userName: row.user_name,
            action: row.action,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            projectId: row.project_id,
            groupId: row.group_id, // New field for group-related actions
            changes: row.changes,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            requestId: row.request_id,
            createdAt: row.created_at,
        };
    }

    /**
     * Find audit logs by company (alias for findByOrganization)
     */
    async findByCompany(companyId: string, filters: AuditLogFilters = {}): Promise<{ logs: AuditLog[], total: number }> {
        return this.findByOrganization(companyId, filters);
    }
}
