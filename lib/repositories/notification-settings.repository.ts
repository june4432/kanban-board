/**
 * Notification Settings Repository
 * 사용자 알림 설정 관리
 */

import { Database } from 'better-sqlite3';

export interface NotificationSettings {
  id: number;
  userId: string;
  projectId?: string | null;
  // 알림 타입별 설정
  cardCreated: boolean;
  cardUpdated: boolean;
  cardDeleted: boolean;
  cardAssigned: boolean;
  cardDueSoon: boolean;
  commentCreated: boolean;
  commentMentioned: boolean;
  projectInvited: boolean;
  projectUpdated: boolean;
  // 전체 음소거
  muted: boolean;
  // 전송 방법
  emailEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettingsInput {
  cardCreated?: boolean;
  cardUpdated?: boolean;
  cardDeleted?: boolean;
  cardAssigned?: boolean;
  cardDueSoon?: boolean;
  commentCreated?: boolean;
  commentMentioned?: boolean;
  projectInvited?: boolean;
  projectUpdated?: boolean;
  muted?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
}

export class NotificationSettingsRepository {
  constructor(private db: Database) {}

  /**
   * 사용자의 전역 알림 설정 조회 (기본값 반환)
   */
  getGlobalSettings(userId: string): NotificationSettings {
    const stmt = this.db.prepare(`
      SELECT * FROM user_notification_settings
      WHERE user_id = ? AND project_id IS NULL
    `);

    const row = stmt.get(userId) as any;

    if (row) {
      return this.mapRowToSettings(row);
    }

    // 기본 설정 생성
    return this.createDefaultSettings(userId);
  }

  /**
   * 프로젝트별 알림 설정 조회 (전역 설정 상속)
   */
  getProjectSettings(userId: string, projectId: string): NotificationSettings {
    const stmt = this.db.prepare(`
      SELECT * FROM user_notification_settings
      WHERE user_id = ? AND project_id = ?
    `);

    const row = stmt.get(userId, projectId) as any;

    if (row) {
      return this.mapRowToSettings(row);
    }

    // 프로젝트 설정이 없으면 전역 설정 반환
    return this.getGlobalSettings(userId);
  }

  /**
   * 사용자의 모든 프로젝트 알림 설정 조회
   */
  getAllProjectSettings(userId: string): NotificationSettings[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_notification_settings
      WHERE user_id = ? AND project_id IS NOT NULL
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.mapRowToSettings(row));
  }

  /**
   * 전역 알림 설정 업데이트
   */
  updateGlobalSettings(userId: string, input: NotificationSettingsInput): NotificationSettings {
    const existing = this.db.prepare(`
      SELECT id FROM user_notification_settings
      WHERE user_id = ? AND project_id IS NULL
    `).get(userId) as any;

    if (existing) {
      return this.updateSettings(existing.id, input);
    } else {
      return this.createSettings(userId, null, input);
    }
  }

  /**
   * 프로젝트별 알림 설정 업데이트
   */
  updateProjectSettings(
    userId: string,
    projectId: string,
    input: NotificationSettingsInput
  ): NotificationSettings {
    const existing = this.db.prepare(`
      SELECT id FROM user_notification_settings
      WHERE user_id = ? AND project_id = ?
    `).get(userId, projectId) as any;

    if (existing) {
      return this.updateSettings(existing.id, input);
    } else {
      return this.createSettings(userId, projectId, input);
    }
  }

  /**
   * 프로젝트 음소거/음소거 해제
   */
  toggleProjectMute(userId: string, projectId: string): NotificationSettings {
    const settings = this.getProjectSettings(userId, projectId);
    return this.updateProjectSettings(userId, projectId, { muted: !settings.muted });
  }

  /**
   * 알림 설정 삭제 (프로젝트별만 가능, 전역은 기본값으로 리셋)
   */
  deleteProjectSettings(userId: string, projectId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM user_notification_settings
      WHERE user_id = ? AND project_id = ?
    `);

    const result = stmt.run(userId, projectId);
    return result.changes > 0;
  }

  /**
   * 특정 이벤트에 대한 알림 활성화 여부 확인
   */
  shouldNotify(
    userId: string,
    projectId: string | null,
    eventType: keyof NotificationSettingsInput
  ): boolean {
    const settings = projectId
      ? this.getProjectSettings(userId, projectId)
      : this.getGlobalSettings(userId);

    if (settings.muted) {
      return false;
    }

    return settings[eventType as keyof NotificationSettings] as boolean;
  }

  /**
   * 기본 알림 설정 생성
   */
  private createDefaultSettings(userId: string): NotificationSettings {
    return this.createSettings(userId, null, {});
  }

  /**
   * 알림 설정 생성
   */
  private createSettings(
    userId: string,
    projectId: string | null,
    input: NotificationSettingsInput
  ): NotificationSettings {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO user_notification_settings (
        user_id, project_id,
        card_created, card_updated, card_deleted, card_assigned, card_due_soon,
        comment_created, comment_mentioned,
        project_invited, project_updated,
        muted, email_enabled, in_app_enabled,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      projectId,
      input.cardCreated ?? 1,
      input.cardUpdated ?? 1,
      input.cardDeleted ?? 1,
      input.cardAssigned ?? 1,
      input.cardDueSoon ?? 1,
      input.commentCreated ?? 1,
      input.commentMentioned ?? 1,
      input.projectInvited ?? 1,
      input.projectUpdated ?? 0,
      input.muted ?? 0,
      input.emailEnabled ?? 1,
      input.inAppEnabled ?? 1,
      now,
      now
    );

    return projectId
      ? this.getProjectSettings(userId, projectId)
      : this.getGlobalSettings(userId);
  }

  /**
   * 알림 설정 업데이트
   */
  private updateSettings(id: number, input: NotificationSettingsInput): NotificationSettings {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        // camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${snakeKey} = ?`);
        values.push(value ? 1 : 0);
      }
    });

    if (updates.length === 0) {
      // 변경사항 없음
      const stmt = this.db.prepare('SELECT * FROM user_notification_settings WHERE id = ?');
      const row = stmt.get(id) as any;
      return this.mapRowToSettings(row);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE user_notification_settings
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updatedRow = this.db.prepare('SELECT * FROM user_notification_settings WHERE id = ?').get(id) as any;
    return this.mapRowToSettings(updatedRow);
  }

  /**
   * Row를 NotificationSettings로 매핑
   */
  private mapRowToSettings(row: any): NotificationSettings {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      cardCreated: Boolean(row.card_created),
      cardUpdated: Boolean(row.card_updated),
      cardDeleted: Boolean(row.card_deleted),
      cardAssigned: Boolean(row.card_assigned),
      cardDueSoon: Boolean(row.card_due_soon),
      commentCreated: Boolean(row.comment_created),
      commentMentioned: Boolean(row.comment_mentioned),
      projectInvited: Boolean(row.project_invited),
      projectUpdated: Boolean(row.project_updated),
      muted: Boolean(row.muted),
      emailEnabled: Boolean(row.email_enabled),
      inAppEnabled: Boolean(row.in_app_enabled),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
