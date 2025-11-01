/**
 * Comment Repository
 *
 * 댓글 데이터 접근 계층
 * - 카드별 댓글 CRUD
 * - 대댓글 지원 (parent_id)
 * - Soft delete
 */

import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // 조인된 사용자 정보
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  // 대댓글
  replies?: Comment[];
}

export interface CreateCommentInput {
  cardId: string;
  userId: string;
  content: string;
  parentId?: string;
}

export class CommentRepository {
  constructor(private db: Database) {}

  /**
   * 새 댓글 생성
   */
  create(input: CreateCommentInput): Comment {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO comments (id, card_id, user_id, content, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.cardId, input.userId, input.content, input.parentId || null);

    const comment = this.findById(id);
    if (!comment) {
      throw new Error('Failed to create comment');
    }

    return comment;
  }

  /**
   * ID로 댓글 조회
   */
  findById(id: string): Comment | null {
    const stmt = this.db.prepare(`
      SELECT
        c.id,
        c.card_id,
        c.user_id,
        c.content,
        c.parent_id,
        c.created_at,
        c.updated_at,
        c.deleted_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToComment(row);
  }

  /**
   * 카드의 모든 댓글 조회 (대댓글 포함)
   */
  findByCardId(cardId: string): Comment[] {
    const stmt = this.db.prepare(`
      SELECT
        c.id,
        c.card_id,
        c.user_id,
        c.content,
        c.parent_id,
        c.created_at,
        c.updated_at,
        c.deleted_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.card_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `);

    const rows = stmt.all(cardId) as any[];
    const comments = rows.map(row => this.mapRowToComment(row));

    // 대댓글 구조화
    return this.buildCommentTree(comments);
  }

  /**
   * 댓글 수정
   */
  update(id: string, content: string): Comment | null {
    const stmt = this.db.prepare(`
      UPDATE comments
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(content, id);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * 댓글 소프트 삭제
   */
  softDelete(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE comments
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 댓글 하드 삭제 (실제 삭제)
   */
  hardDelete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM comments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 카드의 댓글 수 조회
   */
  countByCardId(cardId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE card_id = ? AND deleted_at IS NULL
    `);

    const result = stmt.get(cardId) as any;
    return result.count;
  }

  /**
   * 사용자의 모든 댓글 조회
   */
  findByUserId(userId: string, limit: number = 50): Comment[] {
    const stmt = this.db.prepare(`
      SELECT
        c.id,
        c.card_id,
        c.user_id,
        c.content,
        c.parent_id,
        c.created_at,
        c.updated_at,
        c.deleted_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit) as any[];
    return rows.map(row => this.mapRowToComment(row));
  }

  /**
   * Row를 Comment 객체로 매핑
   */
  private mapRowToComment(row: any): Comment {
    return {
      id: row.id,
      cardId: row.card_id,
      userId: row.user_id,
      content: row.content,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        avatar: row.user_avatar,
      },
      replies: [],
    };
  }

  /**
   * 플랫한 댓글 배열을 트리 구조로 변환
   */
  private buildCommentTree(comments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // 먼저 모든 댓글을 Map에 저장
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // 트리 구조 생성
    comments.forEach(comment => {
      if (comment.parentId) {
        // 대댓글인 경우 부모 댓글에 추가
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies!.push(comment);
        } else {
          // 부모를 찾을 수 없으면 루트로 처리
          rootComments.push(comment);
        }
      } else {
        // 최상위 댓글
        rootComments.push(comment);
      }
    });

    return rootComments;
  }
}
