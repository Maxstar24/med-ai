import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';

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
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
      RETURNING id, name, email
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await sql`
      SELECT * FROM users WHERE email=${email}
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user');
  }
}

export async function getUserById(id: string) {
  try {
    const result = await sql`
      SELECT id, name, email FROM users WHERE id=${id}
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user');
  }
} 