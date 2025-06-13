import { sql } from '../config/db.js';

// Function to check if a table exists
export async function tableExists(tableName) {
    try {
        const result = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ${tableName}
            );
        `;
        return result[0].exists;
    } catch (error) {
        console.error(`Error checking table ${tableName}:`, error);
        return false;
    }
}