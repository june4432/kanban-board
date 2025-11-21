/**
 * Attachment Repository
 * 파일 첨부 데이터 관리
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '@/lib/postgres';

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
  constructor(_db?: any) { }

  /**
   * 파일 첨부 생성
   */
  async create(input: AttachmentCreateInput): Promise<Attachment> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await query(`
      INSERT INTO attachments (
        id, card_id, user_id, filename, original_name,
        mime_type, size, storage_path, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id,
      input.cardId,
      input.userId,
      input.filename,
      input.originalName,
      input.mimeType,
      input.size,
      input.storagePath,
      now
    ]);

    return (await this.findById(id))!;
  }

  /**
   * ID로 첨부파일 조회
   */
  async findById(id: string): Promise<Attachment | null> {
    const row = await queryOne(`
      SELECT
        a.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM attachments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [id]);

    return row ? this.mapRowToAttachment(row) : null;
  }

  /**
   * 카드의 모든 첨부파일 조회
   */
  async findByCardId(cardId: string): Promise<Attachment[]> {
    const rows = await queryAll(`
      SELECT
        a.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM attachments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.card_id = $1
      ORDER BY a.created_at DESC
    `, [cardId]);

    return rows.map((row: any) => this.mapRowToAttachment(row));
  }

  /**
   * 사용자가 업로드한 모든 첨부파일 조회
   */
  async findByUserId(userId: string, limit: number = 50): Promise<Attachment[]> {
    const rows = await queryAll(`
      SELECT
        a.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM attachments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map((row: any) => this.mapRowToAttachment(row));
  }

  /**
   * 첨부파일 삭제
   */
  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM attachments WHERE id = $1', [id]);
    return (result as any).rowCount > 0;
  }

  /**
   * 카드의 첨부파일 개수 조회
   */
  async countByCardId(cardId: string): Promise<number> {
    const result = await queryOne('SELECT COUNT(*) as count FROM attachments WHERE card_id = $1', [cardId]);
    return result?.count || 0;
  }

  /**
   * 카드의 총 첨부파일 크기 (bytes)
   */
  async getTotalSizeByCardId(cardId: string): Promise<number> {
    const result = await queryOne('SELECT SUM(size) as total FROM attachments WHERE card_id = $1', [cardId]);
    return result?.total || 0;
  }

  /**
   * 프로젝트의 총 저장 공간 사용량 (bytes)
   */
  async getTotalSizeByProjectId(projectId: string): Promise<number> {
    const result = await queryOne(`
      SELECT SUM(a.size) as total
      FROM attachments a
      JOIN cards c ON a.card_id = c.id
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.board_id
      WHERE b.project_id = $1
    `, [projectId]);

    return result?.total || 0;
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
