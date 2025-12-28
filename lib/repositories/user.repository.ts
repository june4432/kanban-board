import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types';
import { query, queryOne, queryAll } from '@/lib/postgres';

// Note: company_id is nullable - users can sign up without a company
// and create/join one through the onboarding flow

export class UserRepository {
  constructor() { }

  /**
   * Create a new user with hashed password
   */
  async create(data: {
    id?: string;
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
    companyId?: string | null;
    companyRole?: 'owner' | 'admin' | 'member';
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = data.id || uuidv4();
    // companyId can be null - user will create/join a company through onboarding
    const companyId = data.companyId || null;

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      data.name
    )}&background=3b82f6&color=fff`;

    await query(`
      INSERT INTO users (id, company_id, name, email, password_hash, avatar_url, company_role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [id, companyId, data.name, data.email, hashedPassword, avatar, data.companyRole || null]);

    return (await this.findById(id))!;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [id]);

    if (!row) return null;

    return this.mapToUser(row);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await queryOne('SELECT * FROM users WHERE email = $1', [email]);

    if (!row) return null;

    return this.mapToUser(row);
  }

  /**
   * Find user by email within a company
   */
  async findByEmailAndCompany(email: string, companyId: string): Promise<User | null> {
    const row = await queryOne(
      'SELECT * FROM users WHERE email = $1 AND company_id = $2',
      [email, companyId]
    );

    if (!row) return null;

    return this.mapToUser(row);
  }

  /**
   * Get all users (without passwords)
   */
  async findAll(): Promise<User[]> {
    const rows = await queryAll('SELECT * FROM users ORDER BY name');

    return rows.map((row: any) => this.mapToUser(row, false));
  }

  /**
   * Get all users in a company
   */
  async findByCompany(companyId: string): Promise<User[]> {
    const rows = await queryAll(
      'SELECT * FROM users WHERE company_id = $1 ORDER BY name',
      [companyId]
    );

    return rows.map((row: any) => this.mapToUser(row, false));
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<User & { companyRole?: string; status?: string }>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.avatar !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(data.avatar);
    }
    if (data.companyId !== undefined) {
      fields.push(`company_id = $${idx++}`);
      values.push(data.companyId);
    }
    if (data.companyRole !== undefined) {
      fields.push(`company_role = $${idx++}`);
      values.push(data.companyRole);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await query(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
    `, values);

    return this.findById(id);
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result as any).rowCount > 0;
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const row = await queryOne('SELECT * FROM users WHERE email = $1', [email]);

    if (!row || !row.password_hash) return null;

    const isValid = await bcrypt.compare(password, row.password_hash);

    if (!isValid) return null;

    return this.mapToUser(row, false);
  }

  /**
   * Change user password
   */
  async changePassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    return (result as any).rowCount > 0;
  }

  /**
   * Map database row to User type
   */
  private mapToUser(row: any, includePassword: boolean = false): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url || row.avatar,
      password: includePassword ? row.password_hash : undefined,
      role: row.company_role === 'owner' || row.company_role === 'admin' ? 'admin' : 'user',
      companyId: row.company_id,
      companyRole: row.company_role,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }
}
