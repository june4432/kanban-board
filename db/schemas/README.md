# Database Schema Documentation

This directory contains PostgreSQL schema files for the Kanban Board application.

## Files

- **00_full_schema.sql** - Complete database schema with all tables, indexes, and triggers
- **01_users_and_organizations.sql** - User and organization management tables
- **02_projects_and_boards.sql** - Project, board, and column tables
- **03_cards_and_tasks.sql** - Card, label, and task management tables
- **04_collaboration.sql** - Comments, attachments, and audit logs
- **schema_diagram.md** - Visual representation of table relationships

## Database Structure

### Core Tables (18 tables)

1. **users** - User accounts and profiles
2. **organizations** - Multi-tenant organization management
3. **organization_members** - Organization membership and roles
4. **organization_join_requests** - Organization join request workflow
5. **projects** - Projects within organizations
6. **project_members** - Project membership
7. **project_join_requests** - Project access requests
8. **boards** - Kanban boards (1:1 with projects)
9. **columns** - Board columns (To Do, In Progress, Done, etc.)
10. **cards** - Task cards within columns
11. **milestones** - Project milestones
12. **labels** - Card labels for categorization
13. **card_labels** - Many-to-many card-label relationship
14. **card_assignees** - Card assignee management
15. **comments** - Card comments with threading support
16. **attachments** - File attachments for cards
17. **audit_logs** - Comprehensive activity logging
18. **user_notification_settings** - Per-user notification preferences
19. **project_invitations** - Project invitation link management

## Key Features

### Multi-Tenancy
- Organization-based isolation
- Role-based access control (owner, admin, editor, viewer, member)
- Organization join request workflow

### Project Management
- Projects scoped to organizations
- Public/private project visibility
- Member roles and permissions
- Join request workflow

### Kanban Boards
- Columns with WIP limits
- Cards with priorities (low, medium, high, urgent)
- Card assignments to multiple users
- Labels and milestones
- Due dates and progress tracking

### Collaboration
- Comments with threading (parent-child relationships)
- Soft delete support for comments
- File attachments
- Real-time activity tracking
- Comprehensive audit logs

### Advanced Features
- Full-text search on cards (PostgreSQL GIN index)
- Automatic timestamp updates (triggers)
- JSON-based settings and changes storage
- Referential integrity with foreign keys
- Cascading deletes for data cleanup

## Connection Information

```env
DATABASE_TYPE=postgres
POSTGRES_HOST=june4432.ipdisk.co.kr
POSTGRES_PORT=5432
POSTGRES_DB=KANBANDB
POSTGRES_USER=KANBAN
POSTGRES_PASSWORD=kanban2025!
```

## Migration

To migrate from SQLite to PostgreSQL:

```bash
# 1. Ensure PostgreSQL connection is configured
npm run db:init:postgres

# 2. Run migration script
npm run migrate:to-postgres
```

## Schema Management

### Creating Tables

```bash
# Initialize database with full schema
psql -h june4432.ipdisk.co.kr -U KANBAN -d KANBANDB -f db/schemas/00_full_schema.sql
```

### Backup

```bash
# Backup schema only
pg_dump -h june4432.ipdisk.co.kr -U KANBAN -d KANBANDB --schema-only > backup_schema.sql

# Backup schema and data
pg_dump -h june4432.ipdisk.co.kr -U KANBAN -d KANBANDB > backup_full.sql
```

### Restore

```bash
psql -h june4432.ipdisk.co.kr -U KANBAN -d KANBANDB < backup_full.sql
```

## Index Strategy

- Primary keys on all tables
- Foreign key indexes for join performance
- Composite indexes for common queries
- Full-text search index on cards
- Unique indexes to prevent duplicates

## Security Considerations

- All passwords are bcrypt hashed
- Row Level Security (RLS) support (commented out, can be enabled)
- Audit logging for all critical operations
- IP address and user agent tracking
- Organization-based data isolation

## Performance Optimizations

- Connection pooling (20 max connections)
- Efficient indexes on frequently queried columns
- JSONB for flexible settings storage
- Prepared statement support
- Transaction support for data integrity

## Maintenance

### Regular Tasks

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim storage
VACUUM;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Support

For schema-related questions or issues, please contact the database administrator.
