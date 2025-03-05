import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    const client = await clientPromise;
    const db = client.db('med-ai');

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      email: validatedData.email 
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create new user
    const result = await db.collection('users').insertOne({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: {
          id: result.insertedId.toString(),
          name: validatedData.name,
          email: validatedData.email,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
} 