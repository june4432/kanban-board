/**
 * Dashboard Service
 * 프로젝트 진행률 및 통계 데이터 제공
 */

import { Database } from 'better-sqlite3';

export interface DashboardStats {
  // 카드 통계
  cardStats: {
    total: number;
    byColumn: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    dueSoon: number; // 7일 이내
    completed: number;
  };

  // 프로젝트 진행률
  progress: {
    percentage: number;
    totalCards: number;
    completedCards: number;
  };

  // 팀 활동
  teamActivity: {
    userId: string;
    userName: string;
    cardsAssigned: number;
    cardsCompleted: number;
    commentsCount: number;
  }[];

  // 최근 활동 (감사 로그 기반)
  recentActivity: {
    action: string;
    userName: string;
    resourceType: string;
    resourceId: string;
    timestamp: Date;
  }[];

  // 시간별 추세 (최근 30일)
  trends: {
    date: string;
    cardsCreated: number;
    cardsCompleted: number;
    cardsActive: number;
  }[];
}

export class DashboardService {
  constructor(private db: Database) {}

  /**
   * 프로젝트 대시보드 통계 조회
   */
  getProjectDashboard(projectId: string): DashboardStats {
    return {
      cardStats: this.getCardStats(projectId),
      progress: this.getProgress(projectId),
      teamActivity: this.getTeamActivity(projectId),
      recentActivity: this.getRecentActivity(projectId, 20),
      trends: this.getTrends(projectId, 30),
    };
  }

  /**
   * 카드 통계
   */
  private getCardStats(projectId: string): DashboardStats['cardStats'] {
    // 전체 카드 수
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
    `);
    const total = (totalStmt.get(projectId) as any).total;

    // 컬럼별 카드 수
    const byColumnStmt = this.db.prepare(`
      SELECT col.title, COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
      GROUP BY col.title
    `);
    const byColumnRows = byColumnStmt.all(projectId) as any[];
    const byColumn: Record<string, number> = {};
    byColumnRows.forEach(row => {
      byColumn[row.title] = row.count;
    });

    // 우선순위별 카드 수
    const byPriorityStmt = this.db.prepare(`
      SELECT c.priority, COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
      GROUP BY c.priority
    `);
    const byPriorityRows = byPriorityStmt.all(projectId) as any[];
    const byPriority: Record<string, number> = {};
    byPriorityRows.forEach(row => {
      byPriority[row.priority || 'medium'] = row.count;
    });

    // 기한 초과 카드
    const overdueStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
        AND c.due_date IS NOT NULL
        AND c.due_date < datetime('now')
        AND col.title NOT IN ('Done', 'Completed', '완료')
    `);
    const overdue = (overdueStmt.get(projectId) as any).count;

    // 곧 마감되는 카드 (7일 이내)
    const dueSoonStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
        AND c.due_date IS NOT NULL
        AND c.due_date BETWEEN datetime('now') AND datetime('now', '+7 days')
        AND col.title NOT IN ('Done', 'Completed', '완료')
    `);
    const dueSoon = (dueSoonStmt.get(projectId) as any).count;

    // 완료된 카드 (Done, Completed, 완료 컬럼)
    const completedStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
        AND col.title IN ('Done', 'Completed', '완료')
    `);
    const completed = (completedStmt.get(projectId) as any).count;

    return {
      total,
      byColumn,
      byPriority,
      overdue,
      dueSoon,
      completed,
    };
  }

  /**
   * 프로젝트 진행률
   */
  private getProgress(projectId: string): DashboardStats['progress'] {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN col.title IN ('Done', 'Completed', '완료') THEN 1 ELSE 0 END) as completed
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
    `);

    const result = stmt.get(projectId) as any;
    const totalCards = result.total || 0;
    const completedCards = result.completed || 0;
    const percentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

    return {
      percentage,
      totalCards,
      completedCards,
    };
  }

  /**
   * 팀 활동 통계
   */
  private getTeamActivity(projectId: string): DashboardStats['teamActivity'] {
    const stmt = this.db.prepare(`
      SELECT
        u.id as user_id,
        u.name as user_name,
        COUNT(DISTINCT ca.card_id) as cards_assigned,
        COUNT(DISTINCT CASE WHEN col.title IN ('Done', 'Completed', '완료') THEN ca.card_id END) as cards_completed,
        COUNT(DISTINCT com.id) as comments_count
      FROM users u
      JOIN project_members pm ON u.id = pm.user_id
      LEFT JOIN card_assignees ca ON u.id = ca.user_id
      LEFT JOIN cards c ON ca.card_id = c.id
      LEFT JOIN columns col ON c.column_id = col.id
      LEFT JOIN boards b ON col.board_id = b.board_id AND b.project_id = ?
      LEFT JOIN comments com ON u.id = com.user_id
        AND com.card_id IN (
          SELECT c2.id FROM cards c2
          JOIN columns col2 ON c2.column_id = col2.id
          JOIN boards b2 ON col2.board_id = b2.board_id
          WHERE b2.project_id = ?
        )
      WHERE pm.project_id = ?
      GROUP BY u.id, u.name
      ORDER BY cards_assigned DESC
    `);

    const rows = stmt.all(projectId, projectId, projectId) as any[];

    return rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      cardsAssigned: row.cards_assigned || 0,
      cardsCompleted: row.cards_completed || 0,
      commentsCount: row.comments_count || 0,
    }));
  }

  /**
   * 최근 활동 (감사 로그 기반)
   */
  private getRecentActivity(projectId: string, limit: number = 20): DashboardStats['recentActivity'] {
    const stmt = this.db.prepare(`
      SELECT
        action,
        user_name,
        resource_type,
        resource_id,
        created_at
      FROM audit_logs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(projectId, limit) as any[];

    return rows.map(row => ({
      action: row.action,
      userName: row.user_name,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      timestamp: new Date(row.created_at),
    }));
  }

  /**
   * 시간별 추세 (최근 N일)
   */
  private getTrends(projectId: string, days: number = 30): DashboardStats['trends'] {
    const stmt = this.db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-' || ? || ' days')
        UNION ALL
        SELECT date(date, '+1 day')
        FROM dates
        WHERE date < date('now')
      )
      SELECT
        dates.date,
        COALESCE(created.count, 0) as cards_created,
        COALESCE(completed.count, 0) as cards_completed,
        COALESCE(active.count, 0) as cards_active
      FROM dates
      LEFT JOIN (
        SELECT date(c.created_at) as date, COUNT(*) as count
        FROM cards c
        JOIN columns col ON c.column_id = col.id
        JOIN boards b ON col.board_id = b.board_id
        WHERE b.project_id = ?
        GROUP BY date(c.created_at)
      ) created ON dates.date = created.date
      LEFT JOIN (
        SELECT date(al.created_at) as date, COUNT(*) as count
        FROM audit_logs al
        WHERE al.project_id = ?
          AND al.resource_type = 'card'
          AND al.action = 'update'
          AND al.changes LIKE '%Done%'
        GROUP BY date(al.created_at)
      ) completed ON dates.date = completed.date
      LEFT JOIN (
        SELECT date(c.updated_at) as date, COUNT(*) as count
        FROM cards c
        JOIN columns col ON c.column_id = col.id
        JOIN boards b ON col.board_id = b.board_id
        WHERE b.project_id = ?
          AND col.title NOT IN ('Done', 'Completed', '완료')
        GROUP BY date(c.updated_at)
      ) active ON dates.date = active.date
      ORDER BY dates.date
    `);

    const rows = stmt.all(days, projectId, projectId, projectId) as any[];

    return rows.map(row => ({
      date: row.date,
      cardsCreated: row.cards_created,
      cardsCompleted: row.cards_completed,
      cardsActive: row.cards_active,
    }));
  }
}
