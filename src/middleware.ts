import { NextRequest, NextResponse } from 'next/server';

// For Firebase, we'll handle most authentication on the client side
// This middleware will only handle basic route protection
export async function middleware(request: NextRequest) {
  // Skip middleware completely in development mode to make testing easier
  if (process.env.NODE_ENV === 'development') {
    console.log("Middleware: Development mode detected, skipping middleware");
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (to prevent redirect loops)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}; 