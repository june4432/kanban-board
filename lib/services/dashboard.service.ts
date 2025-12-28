/**
 * Dashboard Service
 * 프로젝트 진행률 및 통계 데이터 제공
 * PostgreSQL 전용
 */

import { queryOne, queryAll } from '../postgres';

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
  /**
   * 프로젝트 대시보드 통계 조회
   */
  async getProjectDashboard(projectId: string): Promise<DashboardStats> {
    const [cardStats, progress, teamActivity, recentActivity, trends] = await Promise.all([
      this.getCardStats(projectId),
      this.getProgress(projectId),
      this.getTeamActivity(projectId),
      this.getRecentActivity(projectId, 20),
      this.getTrends(projectId, 30),
    ]);

    return {
      cardStats,
      progress,
      teamActivity,
      recentActivity,
      trends,
    };
  }

  /**
   * 카드 통계
   */
  private async getCardStats(projectId: string): Promise<DashboardStats['cardStats']> {
    // 전체 카드 수
    const totalResult = await queryOne(`
      SELECT COUNT(*) as total
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
    `, [projectId]);
    const total = Number(totalResult?.total || 0);

    // 컬럼별 카드 수
    const byColumnRows = await queryAll(`
      SELECT col.title, COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
      GROUP BY col.title
    `, [projectId]);

    const byColumn: Record<string, number> = {};
    byColumnRows.forEach(row => {
      byColumn[row.title] = Number(row.count);
    });

    // 우선순위별 카드 수
    const byPriorityRows = await queryAll(`
      SELECT c.priority, COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
      GROUP BY c.priority
    `, [projectId]);

    const byPriority: Record<string, number> = {};
    byPriorityRows.forEach(row => {
      byPriority[row.priority || 'medium'] = Number(row.count);
    });

    // 기한 초과 카드
    const overdueResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
        AND c.due_date IS NOT NULL
        AND c.due_date < NOW()
        AND col.title NOT IN ('Done', 'Completed', '완료')
    `, [projectId]);
    const overdue = Number(overdueResult?.count || 0);

    // 곧 마감되는 카드 (7일 이내)
    const dueSoonResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
        AND c.due_date IS NOT NULL
        AND c.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        AND col.title NOT IN ('Done', 'Completed', '완료')
    `, [projectId]);
    const dueSoon = Number(dueSoonResult?.count || 0);

    // 완료된 카드 (Done, Completed, 완료 컬럼)
    const completedResult = await queryOne(`
      SELECT COUNT(*) as count
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
        AND col.title IN ('Done', 'Completed', '완료')
    `, [projectId]);
    const completed = Number(completedResult?.count || 0);

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
  private async getProgress(projectId: string): Promise<DashboardStats['progress']> {
    const result = await queryOne(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN col.title IN ('Done', 'Completed', '완료') THEN 1 ELSE 0 END) as completed
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE b.project_id = $1
    `, [projectId]);

    const totalCards = Number(result?.total || 0);
    const completedCards = Number(result?.completed || 0);
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
  private async getTeamActivity(projectId: string): Promise<DashboardStats['teamActivity']> {
    const rows = await queryAll(`
      SELECT
        u.id as user_id,
        u.name as user_name,
        COUNT(DISTINCT ca.card_id) as cards_assigned,
        COUNT(DISTINCT CASE WHEN col.title IN ('Done', 'Completed', '완료') THEN ca.card_id END) as cards_completed,
        COUNT(DISTINCT cm.id) as comments_count
      FROM users u
      JOIN project_members pm ON u.id = pm.user_id
      LEFT JOIN card_assignees ca ON u.id = ca.user_id
      LEFT JOIN cards c ON ca.card_id = c.id
      LEFT JOIN columns col ON c.column_id = col.id
      LEFT JOIN boards b ON col.board_id = b.id AND b.project_id = $1
      LEFT JOIN comments cm ON u.id = cm.author_id
        AND cm.card_id IN (
          SELECT c2.id FROM cards c2
          JOIN columns col2 ON c2.column_id = col2.id
          JOIN boards b2 ON col2.board_id = b2.id
          WHERE b2.project_id = $2
        )
      WHERE pm.project_id = $3
      GROUP BY u.id, u.name
      ORDER BY cards_assigned DESC
    `, [projectId, projectId, projectId]);

    return rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      cardsAssigned: Number(row.cards_assigned || 0),
      cardsCompleted: Number(row.cards_completed || 0),
      commentsCount: Number(row.comments_count || 0),
    }));
  }

  /**
   * 최근 활동 (감사 로그 기반)
   */
  private async getRecentActivity(projectId: string, limit: number = 20): Promise<DashboardStats['recentActivity']> {
    const rows = await queryAll(`
      SELECT
        action,
        user_name,
        resource_type,
        resource_id,
        created_at
      FROM audit_logs
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [projectId, limit]);

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
  private async getTrends(projectId: string, days: number = 30): Promise<DashboardStats['trends']> {
    const rows = await queryAll(`
      WITH RECURSIVE dates(date) AS (
        SELECT CURRENT_DATE - ($1 || ' days')::interval
        UNION ALL
        SELECT date + INTERVAL '1 day'
        FROM dates
        WHERE date < CURRENT_DATE
      )
      SELECT
        to_char(dates.date, 'YYYY-MM-DD') as date,
        COALESCE(created.count, 0) as cards_created,
        COALESCE(completed.count, 0) as cards_completed,
        COALESCE(active.count, 0) as cards_active
      FROM dates
      LEFT JOIN (
        SELECT date(c.created_at) as date, COUNT(*) as count
        FROM cards c
        JOIN columns col ON c.column_id = col.id
        JOIN boards b ON col.board_id = b.id
        WHERE b.project_id = $2
        GROUP BY date(c.created_at)
      ) created ON date(dates.date) = created.date
      LEFT JOIN (
        SELECT date(al.created_at) as date, COUNT(*) as count
        FROM audit_logs al
        WHERE al.project_id = $3
          AND al.resource_type = 'card'
          AND al.action = 'update'
          AND al.changes::text LIKE '%Done%'
        GROUP BY date(al.created_at)
      ) completed ON date(dates.date) = completed.date
      LEFT JOIN (
        SELECT date(c.updated_at) as date, COUNT(*) as count
        FROM cards c
        JOIN columns col ON c.column_id = col.id
        JOIN boards b ON col.board_id = b.id
        WHERE b.project_id = $4
          AND col.title NOT IN ('Done', 'Completed', '완료')
        GROUP BY date(c.updated_at)
      ) active ON date(dates.date) = active.date
      ORDER BY dates.date
    `, [days, projectId, projectId, projectId]);

    return rows.map(row => ({
      date: row.date,
      cardsCreated: Number(row.cards_created || 0),
      cardsCompleted: Number(row.cards_completed || 0),
      cardsActive: Number(row.cards_active || 0),
    }));
  }
}
