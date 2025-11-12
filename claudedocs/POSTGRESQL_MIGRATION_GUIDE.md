# PostgreSQL Migration Guide

This guide explains how to migrate the Kanban Board system from SQLite to PostgreSQL.

## Overview

The migration involves:
1. Setting up PostgreSQL database
2. Running the schema migration
3. Migrating data from SQLite to PostgreSQL
4. Switching the application to use PostgreSQL
5. Testing and validation

## Prerequisites

### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

**Docker (Recommended for development):**
```bash
docker run --name kanban-postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=kanban \
  -p 5432:5432 \
  -d postgres:15
```

## Step-by-Step Migration

### Step 1: Configure PostgreSQL Connection

1. **Copy environment variables:**
```bash
cp .env.example .env
```

2. **Update `.env` file with PostgreSQL settings:**
```bash
# Database Configuration
DATABASE_TYPE=postgres

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=kanban
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
```

**Security Note:** Use a strong, unique password for production environments.

### Step 2: Create PostgreSQL Database

**Using psql:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database (if not using Docker)
CREATE DATABASE kanban;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE kanban TO postgres;

# Exit psql
\q
```

**Using Docker:**
The database is automatically created by the Docker container.

### Step 3: Initialize PostgreSQL Schema

Run the schema initialization:
```bash
npm run db:init:postgres
```

This will:
- Create all required tables
- Set up indexes for performance
- Create triggers for automatic timestamp updates
- Enable UUID and crypto extensions

### Step 4: Run Data Migration

**Important:** Backup your SQLite database before migration:
```bash
cp data/kanban.db data/kanban.db.backup
```

Run the migration script:
```bash
npm run migrate:to-postgres
```

The script will:
1. Connect to both SQLite and PostgreSQL databases
2. Create PostgreSQL schema from `lib/schema.postgres.sql`
3. Migrate all data within a transaction:
   - Users
   - Organizations
   - Organization Members
   - Projects
   - Project Members
   - Boards
   - Columns
   - Cards
   - Card Assignees
   - Labels
   - Card Labels
   - Comments
   - Attachments
   - Audit Logs
4. Validate data integrity by comparing counts

**Expected Output:**
```
🚀 Starting SQLite → PostgreSQL migration...

📝 Step 1: Creating PostgreSQL schema...
✅ PostgreSQL schema created

📂 Step 2: Connecting to SQLite database...
✅ SQLite connected

🔄 Step 3: Migrating data...
  👥 Migrating users...
  ✓ Migrated 3 users
  🏢 Migrating organizations...
  ✓ Migrated 3 organizations
  ... (other tables)

✅ All data migrated successfully!

🔍 Step 4: Validating migration...
  Users: 3 (SQLite: 3)
  Projects: 4 (SQLite: 4)
  Cards: 12 (SQLite: 12)

✅ Validation passed!

📊 Migration Summary:
──────────────────────────────────────────────────
  users                    :          3
  organizations            :          3
  organizationMembers      :          4
  projects                 :          4
  projectMembers           :          5
  boards                   :          4
  columns                  :         16
  cards                    :         12
  labels                   :          8
  comments                 :          5
  attachments              :          2
  auditLogs                :         42
──────────────────────────────────────────────────

✨ Migration completed successfully!

💡 Next steps:
  1. Update DATABASE_TYPE=postgres in .env
  2. Configure PostgreSQL connection settings
  3. Test application with PostgreSQL
  4. Backup SQLite database for rollback
```

### Step 5: Update Application Configuration

1. **Update `.env` to use PostgreSQL:**
```bash
# Change from sqlite to postgres
DATABASE_TYPE=postgres
```

2. **Verify PostgreSQL connection:**
```bash
npm run db:init:postgres
```

### Step 6: Test the Application

1. **Start the development server:**
```bash
npm run dev
```

2. **Verify functionality:**
   - [ ] User authentication works
   - [ ] Projects load correctly
   - [ ] Cards can be created and moved
   - [ ] Comments and attachments work
   - [ ] Organization features function properly
   - [ ] API endpoints respond correctly

3. **Check database connections:**
   - Monitor PostgreSQL logs for queries
   - Verify connection pooling is working
   - Check for any error messages

## PostgreSQL-Specific Features

After migration, you can leverage PostgreSQL's advanced features:

### Full-Text Search

The schema includes a GIN index for full-text search on cards:

```sql
-- Search cards by title or description
SELECT * FROM cards
WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
      @@ to_tsquery('english', 'bug & fix');
```

### JSONB Queries

Organizations and audit logs use JSONB for flexible data:

```sql
-- Query organization settings
SELECT * FROM organizations
WHERE settings->>'feature_flags' LIKE '%advanced%';

-- Query audit log changes
SELECT * FROM audit_logs
WHERE changes @> '{"action": "update"}';
```

### Connection Pooling

PostgreSQL uses connection pooling for better performance:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

Configuration in `lib/postgres.ts`

## Rollback Procedure

If you need to rollback to SQLite:

1. **Stop the application**

2. **Update `.env`:**
```bash
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/kanban.db
```

3. **Restore SQLite backup (if needed):**
```bash
cp data/kanban.db.backup data/kanban.db
```

4. **Restart the application:**
```bash
npm run dev
```

## Troubleshooting

### Connection Errors

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check if PostgreSQL is listening on port 5432: `lsof -i :5432`
- Verify connection settings in `.env`

### Migration Failures

**Problem:** Migration script fails midway

**Solution:**
- Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-15-main.log`
- Verify schema.postgres.sql is valid
- Drop and recreate database:
```bash
psql -U postgres -c "DROP DATABASE kanban;"
psql -U postgres -c "CREATE DATABASE kanban;"
npm run migrate:to-postgres
```

### Data Inconsistencies

**Problem:** Row counts don't match after migration

**Solution:**
- Re-run migration (it's idempotent)
- Check for constraint violations in PostgreSQL logs
- Manually verify critical data:
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM cards;
```

### Performance Issues

**Problem:** Queries are slower than SQLite

**Solution:**
- Run ANALYZE to update statistics: `ANALYZE;`
- Check if indexes are being used: `EXPLAIN ANALYZE SELECT ...`
- Increase connection pool size in `lib/postgres.ts`
- Consider adding additional indexes for frequently queried columns

## Performance Optimization

After migration, consider these optimizations:

### 1. Vacuum and Analyze

Run regularly to maintain performance:
```sql
VACUUM ANALYZE;
```

### 2. Index Optimization

Monitor slow queries and add indexes:
```sql
-- Example: Add index for card search by project
CREATE INDEX idx_cards_project ON cards(column_id);
```

### 3. Connection Pooling Tuning

Adjust pool size based on load in `lib/postgres.ts`:
```typescript
max: 50, // Increase for high traffic
idleTimeoutMillis: 10000, // Reduce for more aggressive cleanup
```

### 4. Query Optimization

Use EXPLAIN ANALYZE to optimize slow queries:
```sql
EXPLAIN ANALYZE
SELECT * FROM cards
WHERE column_id IN (SELECT id FROM columns WHERE board_id = 'board123');
```

## Monitoring

### Database Health Check

The application includes a health check endpoint:
```typescript
// In your API route
import { healthCheck } from '@/lib/postgres';

const isHealthy = await healthCheck();
```

### Connection Pool Monitoring

Monitor pool statistics:
```typescript
const pool = getPool();
console.log('Total connections:', pool.totalCount);
console.log('Idle connections:', pool.idleCount);
console.log('Waiting requests:', pool.waitingCount);
```

### Query Performance

Enable query logging in development:
```typescript
// In lib/postgres.ts
console.log('Executed query', {
  text,
  duration,
  rows: result.rowCount
});
```

## Security Considerations

### 1. Connection Security

For production, use SSL connections:
```typescript
// In lib/postgres.ts
const pool = new Pool({
  ...config,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  }
});
```

### 2. Row Level Security (RLS)

Enable RLS for multi-tenant isolation:
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON projects
  USING (organization_id = current_setting('app.current_org_id')::varchar);
```

### 3. Password Management

Never commit `.env` files. Use environment-specific configuration:
- Development: `.env.local`
- Staging: Environment variables
- Production: Secrets management service (AWS Secrets Manager, Vault, etc.)

## Next Steps

After successful migration:

1. **Monitor Performance:**
   - Set up query performance monitoring
   - Track connection pool usage
   - Monitor database size and growth

2. **Optimize Queries:**
   - Identify slow queries
   - Add appropriate indexes
   - Use EXPLAIN ANALYZE for optimization

3. **Backup Strategy:**
   - Set up automated PostgreSQL backups
   - Test restore procedures
   - Document backup retention policy

4. **Scale Preparation:**
   - Plan for read replicas if needed
   - Consider connection pooling at application level (PgBouncer)
   - Implement caching strategy (Redis) for frequently accessed data

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg (node-postgres) Documentation](https://node-postgres.com/)
- [PostgreSQL Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
