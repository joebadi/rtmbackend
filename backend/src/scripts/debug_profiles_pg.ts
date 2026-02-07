
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: "postgresql://rtmuser:RTMSecure2026!Pass@localhost:5432/rtm_production"
});

async function main() {
    console.log('--- Debugging Profiles via PG ---');
    try {
        const res = await pool.query(`
      SELECT "userId", "firstName", "country", "state", "showOnMap", "isActive", "isBanned", "latitude", "longitude"
      FROM profiles
    `);

        console.log(`Found ${res.rows.length} profiles:`);
        res.rows.forEach(p => console.log(p));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
