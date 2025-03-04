import { createClient } from '@vercel/postgres';
import bcrypt from 'bcrypt';

// Create a client instance
const db = createClient({
  connectionString: process.env.POSTGRES_URL // Using pooled connection for better performance
});

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
    console.log('Starting user creation process...');
    
    // Start transaction
    await db.query('BEGIN');
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Creating user record...');
    // First, create the user
    const userResult = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const user = userResult.rows[0];
    console.log('User record created:', { id: user.id, email: user.email });

    console.log('Creating profile record...');
    // Create profile
    await db.query(
      'INSERT INTO profiles (user_id) VALUES ($1)',
      [user.id]
    );

    console.log('Creating preferences record...');
    // Create preferences
    await db.query(
      'INSERT INTO preferences (user_id) VALUES ($1)',
      [user.id]
    );

    console.log('Committing transaction...');
    await db.query('COMMIT');

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
      await db.query('ROLLBACK');
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
    console.log('Querying user by email:', email);
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    console.log('User query result:', result.rows.length ? 'User found' : 'No user found');
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function getUserById(id: string) {
  try {
    const result = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
} 