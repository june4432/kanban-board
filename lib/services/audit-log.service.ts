/**
 * Audit Log Service
 *
 * 모든 중요한 변경사항을 추적하는 감사 로그 시스템
 * - 누가 (user_id, user_name)
 * - 언제 (created_at)
 * - 무엇을 (resource_type, resource_id)
 * - 어떻게 변경했는지 (action, changes)
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '@/lib/postgres';

export interface AuditLogEntry {
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'move';
  resourceType: 'card' | 'project' | 'member' | 'comment';
  resourceId: string;
  projectId?: string;
  changes?: ChangeDetail[];
  ipAddress?: string;
  userAgent?: string;
}

export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLog extends AuditLogEntry {
  id: string;
  createdAt: Date;
}

export class AuditLogService {
  constructor() { }

  /**
   * 감사 로그 기록
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const id = uuidv4();

    await query(`
      INSERT INTO audit_logs (
        id, user_id, user_name, action, resource_type, resource_id,
        project_id, changes, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id,
      entry.userId,
      entry.userName,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.projectId || null,
      entry.changes ? JSON.stringify(entry.changes) : null,
      entry.ipAddress || null,
      entry.userAgent || null
    ]);
  }

  /**
   * 프로젝트의 감사 로그 조회
   */
  async getProjectLogs(projectId: string, limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    const rows = await queryAll(`
      SELECT * FROM audit_logs
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [projectId, limit, offset]);

    return rows.map((row: any) => this.mapRowToAuditLog(row));
  }

  /**
   * 특정 리소스의 히스토리 조회
   */
  async getResourceHistory(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    const rows = await queryAll(`
      SELECT * FROM audit_logs
      WHERE resource_type = $1 AND resource_id = $2
      ORDER BY created_at DESC
    `, [resourceType, resourceId]);

    return rows.map((row: any) => this.mapRowToAuditLog(row));
  }

  /**
   * 사용자의 활동 로그 조회
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const rows = await queryAll(`
      SELECT * FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map((row: any) => this.mapRowToAuditLog(row));
  }

  /**
   * 특정 기간의 로그 조회
   */
  async getLogsByDateRange(startDate: Date, endDate: Date, projectId?: string): Promise<AuditLog[]> {
    let sql = `
      SELECT * FROM audit_logs
      WHERE created_at BETWEEN $1 AND $2
    `;
    const params: any[] = [startDate.toISOString(), endDate.toISOString()];

    if (projectId) {
      sql += ` AND project_id = $3`;
      params.push(projectId);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = await queryAll(sql, params);
    return rows.map((row: any) => this.mapRowToAuditLog(row));
  }

  /**
   * 감사 로그 통계
   */
  async getStatistics(projectId: string, days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
    recentActivity: AuditLog[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 총 액션 수
    const totalResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE project_id = $1 AND created_at >= $2
    `, [projectId, startDate.toISOString()]);

    // 액션 타입별 통계
    const actionTypeRows = await queryAll(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE project_id = $1 AND created_at >= $2
      GROUP BY action
    `, [projectId, startDate.toISOString()]);

    const actionsByType: Record<string, number> = {};
    actionTypeRows.forEach((row: any) => {
      actionsByType[row.action] = parseInt(row.count);
    });

    // 사용자별 통계
    const userRows = await queryAll(`
      SELECT user_name, COUNT(*) as count
      FROM audit_logs
      WHERE project_id = $1 AND created_at >= $2
      GROUP BY user_id, user_name
      ORDER BY count DESC
    `, [projectId, startDate.toISOString()]);

    const actionsByUser: Record<string, number> = {};
    userRows.forEach((row: any) => {
      actionsByUser[row.user_name] = parseInt(row.count);
    });

    // 최근 활동
    const recentActivity = await this.getProjectLogs(projectId, 10);

    return {
      totalActions: parseInt(totalResult?.count || '0'),
      actionsByType,
      actionsByUser,
      recentActivity,
    };
  }

  /**
   * 오래된 로그 삭제 (데이터 보관 정책)
   */
  async deleteOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await query(`
      DELETE FROM audit_logs
      WHERE created_at < $1
    `, [cutoffDate.toISOString()]);

    return (result as any).rowCount || 0;
  }

  /**
   * Row를 AuditLog로 매핑
   */
  private mapRowToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      projectId: row.project_id,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
    };
  }
}

/**
 * 변경사항을 추출하는 헬퍼 함수
 */
export function extractChanges(oldObj: any, newObj: any, fields: string[]): ChangeDetail[] {
  const changes: ChangeDetail[] = [];

  fields.forEach(field => {
    const oldValue = oldObj?.[field];
    const newValue = newObj?.[field];

    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue,
      });
    }
  });

  return changes;
}
