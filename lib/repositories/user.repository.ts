import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types';

export class UserRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new user with hashed password
   */
  async create(data: {
    id?: string;  // Optional: for migration purposes
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = data.id || uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, name, email, password, avatar, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      data.name
    )}&background=3b82f6&color=fff`;

    stmt.run(id, data.name, data.email, hashedPassword, avatar, data.role || 'user');

    return this.findById(id)!;
  }

  /**
   * Find user by ID
   */
  findById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapToUser(row);
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row) return null;

    return this.mapToUser(row);
  }

  /**
   * Get all users (without passwords)
   */
  findAll(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY name');
    const rows = stmt.all() as any[];

    return rows.map((row) => this.mapToUser(row, false));
  }

  /**
   * Update user
   */
  update(id: string, data: Partial<User>): User | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(data.avatar);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete user
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    // Need to get user with password for verification
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row || !row.password) return null;

    const isValid = await bcrypt.compare(password, row.password);

    if (!isValid) return null;

    // Return user without password
    return this.mapToUser(row, false);
  }

  /**
   * Change user password
   */
  async changePassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const stmt = this.db.prepare('UPDATE users SET password = ? WHERE id = ?');
    const result = stmt.run(hashedPassword, id);

    return result.changes > 0;
  }

  /**
   * Map database row to User type
   */
  private mapToUser(row: any, includePassword: boolean = false): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar,
      password: includePassword ? row.password : undefined,
      role: row.role,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }
}
