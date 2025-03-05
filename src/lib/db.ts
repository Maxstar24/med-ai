import { createClient } from '@vercel/postgres';
import bcrypt from 'bcrypt';

// Construct connection string from parameters
const CONNECTION_STRING = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}?sslmode=require`;

// Create a client instance
const db = createClient({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: true
  }
});

// Function to ensure database connection with retries
async function ensureConnection(retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting database connection (attempt ${i + 1}/${retries})...`);
      console.log('Using connection string:', CONNECTION_STRING.replace(/:[^:@]+@/, ':****@')); // Log connection string with password hidden
      await db.sql`SELECT 1`; // Simple query to test connection
      console.log('Database connection verified');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error('Failed to connect to database after multiple attempts');
      }
    }
  }
}

interface PostgresError extends Error {
  code?: string;
}

export async function createUser({ 
  name, 
  email, 
  password 
}: { 
  name: string; 
  email: string; 
  password: string; 
}) {
  try {
    // Ensure connection before proceeding
    await ensureConnection();
    
    console.log('Starting user creation process...');
    
    // Start transaction
    await db.sql`BEGIN`;
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Creating user record...');
    // First, create the user
    const userResult = await db.sql`
      INSERT INTO users (name, email, password) 
      VALUES (${name}, ${email}, ${hashedPassword}) 
      RETURNING id, name, email
    `;

    const user = userResult.rows[0];
    console.log('User record created:', { id: user.id, email: user.email });

    console.log('Creating profile record...');
    // Create profile
    await db.sql`
      INSERT INTO profiles (user_id) 
      VALUES (${user.id})
    `;

    console.log('Creating preferences record...');
    // Create preferences
    await db.sql`
      INSERT INTO preferences (user_id) 
      VALUES (${user.id})
    `;

    console.log('Committing transaction...');
    await db.sql`COMMIT`;

    console.log('User creation completed successfully');
    return user;
  } catch (error) {
    console.error('Error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as PostgresError).code,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Rollback transaction on error
    try {
      console.log('Rolling back transaction...');
      await db.sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }

    if ((error as PostgresError).code === '23505') { // Unique violation
      throw new Error('User with this email already exists');
    }
    throw new Error('Failed to create user: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function getUserByEmail(email: string) {
  try {
    await ensureConnection();
    console.log('Querying user by email:', email);
    const result = await db.sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    console.log('User query result:', result.rows.length ? 'User found' : 'No user found');
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function getUserById(id: string) {
  try {
    await ensureConnection();
    const result = await db.sql`
      SELECT id, name, email FROM users WHERE id = ${id}
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
} 