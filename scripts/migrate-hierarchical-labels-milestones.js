#!/usr/bin/env node
/**
 * Migration Script: Add Hierarchical Labels and Milestones
 * Run with: node scripts/migrate-hierarchical-labels-milestones.js
 */

// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('🚀 Starting migration: Add Hierarchical Labels and Milestones');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, '../lib/migrations/20251121_add_hierarchical_labels_milestones.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await pool.query(migrationSQL);

        console.log('✅ Migration completed successfully!');

        // Verify migration
        console.log('\n📊 Verifying migration...');

        const labelScopeCount = await pool.query(`
      SELECT scope, COUNT(*) as count 
      FROM labels 
      GROUP BY scope
    `);

        console.log('Labels by scope:');
        labelScopeCount.rows.forEach(row => {
            console.log(`  - ${row.scope}: ${row.count}`);
        });

        const milestoneScopeCount = await pool.query(`
      SELECT scope, COUNT(*) as count 
      FROM milestones 
      GROUP BY scope
    `);

        console.log('\nMilestones by scope:');
        milestoneScopeCount.rows.forEach(row => {
            console.log(`  - ${row.scope}: ${row.count}`);
        });

        // Check for NULL values
        const nullLabels = await pool.query(`
      SELECT COUNT(*) as count 
      FROM labels 
      WHERE scope IS NULL OR scope_id IS NULL
    `);

        const nullMilestones = await pool.query(`
      SELECT COUNT(*) as count 
      FROM milestones 
      WHERE scope IS NULL OR scope_id IS NULL
    `);

        console.log(`\n✓ Labels with NULL scope/scope_id: ${nullLabels.rows[0].count}`);
        console.log(`✓ Milestones with NULL scope/scope_id: ${nullMilestones.rows[0].count}`);

        if (nullLabels.rows[0].count === '0' && nullMilestones.rows[0].count === '0') {
            console.log('\n🎉 Migration verified successfully! All records have valid scope data.');
        } else {
            console.warn('\n⚠️  Warning: Some records have NULL scope data.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
