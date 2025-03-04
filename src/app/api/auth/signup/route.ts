import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/db";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    console.log('Processing signup request...');
    const body = await request.json();
    console.log('Request body received:', { email: body.email, name: body.name });

    const validatedData = signupSchema.parse(body);
    console.log('Data validation passed');

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create new user
    console.log('Creating new user...');
    const user = await createUser(validatedData);
    console.log('User created successfully:', { id: user.id, email: user.email });

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof z.ZodError) {
      const errorMessage = error.errors[0].message;
      console.log('Validation error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'User with this email already exists') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
} 