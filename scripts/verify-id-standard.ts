import { queryAll, closePool } from '@/lib/postgres';

interface ColumnRow {
  table_name: string;
  column_name: string;
}

const CORE_TABLES = ['projects', 'boards', 'columns', 'cards', 'users'];

async function main() {
  const rows = await queryAll<ColumnRow>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name, ordinal_position`,
    [CORE_TABLES]
  );

  const grouped = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!grouped.has(row.table_name)) {
      grouped.set(row.table_name, new Set());
    }
    grouped.get(row.table_name)!.add(row.column_name);
  }

  let hasIssue = false;
  for (const table of CORE_TABLES) {
    const cols = grouped.get(table) ?? new Set<string>();
    const hasId = cols.has('id');
    const hasLegacyPk =
      (table === 'projects' && cols.has('project_id')) ||
      (table === 'boards' && cols.has('board_id'));

    if (!hasId || hasLegacyPk) {
      hasIssue = true;
      console.log(
        `[ISSUE] ${table}: has_id=${hasId}, has_legacy_pk=${hasLegacyPk}, columns=${[...cols].join(',')}`
      );
    } else {
      console.log(`[OK] ${table}: id standard compliant`);
    }
  }

  if (hasIssue) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('verify-id-standard failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

