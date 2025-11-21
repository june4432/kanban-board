
import 'dotenv/config';
import { query } from '@/lib/postgres';

async function migrate() {
    console.log('Starting migration: Add Full-text Search...');

    try {
        // 1. Add search_vector column if it doesn't exist
        console.log('Adding search_vector column...');
        await query(`
      ALTER TABLE cards 
      ADD COLUMN IF NOT EXISTS search_vector tsvector;
    `);

        // 2. Create function for updating search_vector
        console.log('Creating search trigger function...');
        await query(`
      CREATE OR REPLACE FUNCTION cards_search_trigger() RETURNS trigger AS $$
      begin
        new.search_vector :=
          setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
        return new;
      end
      $$ LANGUAGE plpgsql;
    `);

        // 3. Create trigger
        console.log('Creating trigger...');
        await query(`
      DROP TRIGGER IF EXISTS tsvectorupdate ON cards;
      CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
      ON cards FOR EACH ROW EXECUTE FUNCTION cards_search_trigger();
    `);

        // 4. Create GIN index
        console.log('Creating GIN index...');
        await query(`
      CREATE INDEX IF NOT EXISTS idx_cards_search ON cards USING GIN(search_vector);
    `);

        // 5. Update existing rows
        console.log('Updating existing rows...');
        await query(`
      UPDATE cards 
      SET search_vector = 
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B');
    `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
