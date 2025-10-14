import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
}

export const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    prepare: false,
});

export default sql;