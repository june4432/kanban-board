/**
 * Audit Log Service
 *
 * 모든 중요한 변경사항을 추적하는 감사 로그 시스템
 * - 누가 (user_id, user_name)
 * - 언제 (created_at)
 * - 무엇을 (resource_type, resource_id)
 * - 어떻게 변경했는지 (action, changes)
 */

import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

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
  constructor(private db: Database) {}

  /**
   * 감사 로그 기록
   */
  log(entry: AuditLogEntry): void {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, user_name, action, resource_type, resource_id,
        project_id, changes, ip_address, user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
    );
  }

  /**
   * 프로젝트의 감사 로그 조회
   */
  getProjectLogs(projectId: string, limit: number = 50, offset: number = 0): AuditLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(projectId, limit, offset) as any[];
    return rows.map(row => this.mapRowToAuditLog(row));
  }

  /**
   * 특정 리소스의 히스토리 조회
   */
  getResourceHistory(resourceType: string, resourceId: string): AuditLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE resource_type = ? AND resource_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(resourceType, resourceId) as any[];
    return rows.map(row => this.mapRowToAuditLog(row));
  }

  /**
   * 사용자의 활동 로그 조회
   */
  getUserActivity(userId: string, limit: number = 50): AuditLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit) as any[];
    return rows.map(row => this.mapRowToAuditLog(row));
  }

  /**
   * 특정 기간의 로그 조회
   */
  getLogsByDateRange(startDate: Date, endDate: Date, projectId?: string): AuditLog[] {
    let query = `
      SELECT * FROM audit_logs
      WHERE created_at BETWEEN ? AND ?
    `;
    const params: any[] = [startDate.toISOString(), endDate.toISOString()];

    if (projectId) {
      query += ` AND project_id = ?`;
      params.push(projectId);
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.mapRowToAuditLog(row));
  }

  /**
   * 감사 로그 통계
   */
  getStatistics(projectId: string, days: number = 30): {
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
    recentActivity: AuditLog[];
  } {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 총 액션 수
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE project_id = ? AND created_at >= ?
    `);
    const totalResult = totalStmt.get(projectId, startDate.toISOString()) as any;

    // 액션 타입별 통계
    const actionTypeStmt = this.db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE project_id = ? AND created_at >= ?
      GROUP BY action
    `);
    const actionTypeRows = actionTypeStmt.all(projectId, startDate.toISOString()) as any[];
    const actionsByType: Record<string, number> = {};
    actionTypeRows.forEach(row => {
      actionsByType[row.action] = row.count;
    });

    // 사용자별 통계
    const userStmt = this.db.prepare(`
      SELECT user_name, COUNT(*) as count
      FROM audit_logs
      WHERE project_id = ? AND created_at >= ?
      GROUP BY user_id, user_name
      ORDER BY count DESC
    `);
    const userRows = userStmt.all(projectId, startDate.toISOString()) as any[];
    const actionsByUser: Record<string, number> = {};
    userRows.forEach(row => {
      actionsByUser[row.user_name] = row.count;
    });

    // 최근 활동
    const recentActivity = this.getProjectLogs(projectId, 10);

    return {
      totalActions: totalResult.count,
      actionsByType,
      actionsByUser,
      recentActivity,
    };
  }

  /**
   * 오래된 로그 삭제 (데이터 보관 정책)
   */
  deleteOldLogs(daysToKeep: number = 365): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const stmt = this.db.prepare(`
      DELETE FROM audit_logs
      WHERE created_at < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
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
