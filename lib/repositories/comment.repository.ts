/**
 * Comment Repository
 *
 * 댓글 데이터 접근 계층
 * - 카드별 댓글 CRUD
 * - 대댓글 지원 (parent_id)
 * - Soft delete
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryAll } from '@/lib/postgres';

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
  constructor() { }

  /**
   * 새 댓글 생성
   */
  async create(input: CreateCommentInput): Promise<Comment> {
    const id = uuidv4();

    await query(`
      INSERT INTO comments (id, card_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, input.cardId, input.userId, input.content, input.parentId || null]);

    const comment = await this.findById(id);
    if (!comment) {
      throw new Error('Failed to create comment');
    }

    return comment;
  }

  /**
   * ID로 댓글 조회
   */
  async findById(id: string): Promise<Comment | null> {
    const row = await queryOne(`
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
      WHERE c.id = $1 AND c.deleted_at IS NULL
    `, [id]);

    if (!row) return null;

    return this.mapRowToComment(row);
  }

  /**
   * 카드의 모든 댓글 조회 (대댓글 포함)
   */
  async findByCardId(cardId: string): Promise<Comment[]> {
    const rows = await queryAll(`
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
      WHERE c.card_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `, [cardId]);

    const comments = rows.map((row: any) => this.mapRowToComment(row));

    // 대댓글 구조화
    return this.buildCommentTree(comments);
  }

  /**
   * 댓글 수정
   */
  async update(id: string, content: string): Promise<Comment | null> {
    const result = await query(`
      UPDATE comments
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
    `, [content, id]);

    if ((result as any).rowCount === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * 댓글 소프트 삭제
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await query(`
      UPDATE comments
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    return (result as any).rowCount > 0;
  }

  /**
   * 댓글 하드 삭제 (실제 삭제)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM comments WHERE id = $1', [id]);
    return (result as any).rowCount > 0;
  }

  /**
   * 카드의 댓글 수 조회
   */
  async countByCardId(cardId: string): Promise<number> {
    const result = await queryOne(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE card_id = $1 AND deleted_at IS NULL
    `, [cardId]);

    return result?.count || 0;
  }

  /**
   * 사용자의 모든 댓글 조회
   */
  async findByUserId(userId: string, limit: number = 50): Promise<Comment[]> {
    const rows = await queryAll(`
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
      WHERE c.user_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map((row: any) => this.mapRowToComment(row));
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
