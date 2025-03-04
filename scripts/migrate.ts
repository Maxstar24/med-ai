import { config } from 'dotenv';
import { Client } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
config();

async function migrate() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');

    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Execute the schema
    await client.query(schemaContent);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Always close the connection
    await client.end();
  }
}

migrate(); 