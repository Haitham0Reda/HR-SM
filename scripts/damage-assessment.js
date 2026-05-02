/**
 * EMERGENCY: Damage assessment after premature MongoDB deletion.
 * Lists every table in both PostgreSQL databases with its row count,
 * so we can determine whether any data was migrated before MongoDB was deleted.
 *
 * USAGE: node scripts/damage-assessment.js
 */

import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

async function assessDb(label, url) {
    console.log(`\n=== ${label} (${url.replace(/:[^:@]+@/, ':****@')}) ===\n`);
    const sequelize = new Sequelize(url, {
        dialect: 'postgres',
        logging: false,
        pool: { max: 1, min: 0, acquire: 5000, idle: 1000 }
    });

    try {
        await sequelize.authenticate();
        const [tables] = await sequelize.query(`
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
        `);

        if (tables.length === 0) {
            console.log('⚠️  NO USER TABLES FOUND IN THIS DATABASE');
            return { label, tables: 0, totalRows: 0, details: [] };
        }

        console.log(`Found ${tables.length} table(s). Counting rows...\n`);
        const details = [];
        let totalRows = 0;

        for (const t of tables) {
            const qualified = `"${t.table_schema}"."${t.table_name}"`;
            try {
                const [rows] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM ${qualified}`);
                const c = rows[0].c;
                totalRows += c;
                details.push({ table: `${t.table_schema}.${t.table_name}`, count: c });
                const flag = c === 0 ? ' ⚠️  EMPTY' : '';
                console.log(`  ${String(c).padStart(8)}  ${t.table_schema}.${t.table_name}${flag}`);
            } catch (err) {
                details.push({ table: `${t.table_schema}.${t.table_name}`, error: err.message });
                console.log(`  ERROR    ${t.table_schema}.${t.table_name}  → ${err.message}`);
            }
        }

        console.log(`\n  TOTAL ROWS in ${label}: ${totalRows}`);
        return { label, tables: tables.length, totalRows, details };
    } catch (err) {
        console.log(`✗ Failed to connect: ${err.message}`);
        return { label, error: err.message };
    } finally {
        await sequelize.close();
    }
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  POSTGRESQL DAMAGE ASSESSMENT                        ║');
    console.log('║  Counting rows in every table to assess data loss    ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    const main = await assessDb('Main App DB (HR-SM)', process.env.MAIN_DATABASE_URL);
    const license = await assessDb('License DB (License)', process.env.LICENSE_DATABASE_URL);

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  SUMMARY                                             ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`Main App DB:  ${main.tables ?? 0} tables, ${main.totalRows ?? 0} rows total`);
    console.log(`License DB:   ${license.tables ?? 0} tables, ${license.totalRows ?? 0} rows total`);

    const grandTotal = (main.totalRows ?? 0) + (license.totalRows ?? 0);
    console.log(`\nGrand total rows across both DBs: ${grandTotal}`);

    if (grandTotal === 0) {
        console.log('\n🔴 CRITICAL: Both databases are empty. MongoDB data appears to be unrecovered.');
    } else if (grandTotal < 100) {
        console.log('\n🟡 WARNING: Very low row count. Likely only seed data, not production data.');
    } else {
        console.log('\n🟢 Data is present. Inspect counts above to confirm completeness against expected production volume.');
    }
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
