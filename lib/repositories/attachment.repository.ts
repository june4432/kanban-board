/**
 * Attachment Repository
 * 파일 첨부 데이터 관리
 */

import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface Attachment {
  id: string;
  cardId: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  createdAt: Date;
  // 추가 정보 (JOIN)
  userName?: string;
  userAvatar?: string;
}

export interface AttachmentCreateInput {
  cardId: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

export class AttachmentRepository {
  constructor(private db: Database) {}

  /**
   * 파일 첨부 생성
   */
  create(input: AttachmentCreateInput): Attachment {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO attachments (
        id, card_id, user_id, filename, original_name,
        mime_type, size, storage_path, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.cardId,
      input.userId,
      input.filename,
      input.originalName,
      input.mimeType,
      input.size,
      input.storagePath,
      now
    );

    return this.findById(id)!;
  }

  /**
   * ID로 첨부파일 조회
   */
  findById(id: string): Attachment | null {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM attachments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `);

    const row = stmt.get(id) as any;
    return row ? this.mapRowToAttachment(row) : null;
  }

  /**
   * 카드의 모든 첨부파일 조회
   */
  findByCardId(cardId: string): Attachment[] {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM attachments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.card_id = ?
      ORDER BY a.created_at DESC
    `);

    const rows = stmt.all(cardId) as any[];
    return rows.map(row => this.mapRowToAttachment(row));
  }

  /**
   * 사용자가 업로드한 모든 첨부파일 조회
   */
  findByUserId(userId: string, limit: number = 50): Attachment[] {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM attachments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit) as any[];
    return rows.map(row => this.mapRowToAttachment(row));
  }

  /**
   * 첨부파일 삭제
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM attachments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 카드의 첨부파일 개수 조회
   */
  countByCardId(cardId: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM attachments WHERE card_id = ?');
    const result = stmt.get(cardId) as any;
    return result.count;
  }

  /**
   * 카드의 총 첨부파일 크기 (bytes)
   */
  getTotalSizeByCardId(cardId: string): number {
    const stmt = this.db.prepare('SELECT SUM(size) as total FROM attachments WHERE card_id = ?');
    const result = stmt.get(cardId) as any;
    return result.total || 0;
  }

  /**
   * 프로젝트의 총 저장 공간 사용량 (bytes)
   */
  getTotalSizeByProjectId(projectId: string): number {
    const stmt = this.db.prepare(`
      SELECT SUM(a.size) as total
      FROM attachments a
      JOIN cards c ON a.card_id = c.id
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = ?
    `);

    const result = stmt.get(projectId) as any;
    return result.total || 0;
  }

  /**
   * Row를 Attachment로 매핑
   */
  private mapRowToAttachment(row: any): Attachment {
    return {
      id: row.id,
      cardId: row.card_id,
      userId: row.user_id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      storagePath: row.storage_path,
      createdAt: new Date(row.created_at),
      userName: row.user_name,
      userAvatar: row.user_avatar,
    };
  }
}
