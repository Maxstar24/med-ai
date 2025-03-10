import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes and auth-related routes
  if (pathname.startsWith('/api/') || pathname.includes('/auth/')) {
    console.log("Middleware: Skipping for API or auth route:", pathname);
    return NextResponse.next();
  }
  
  // Get the token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  // Check if the user is authenticated
  const isAuthenticated = !!token;
  console.log("Middleware: Authentication status for", pathname, ":", isAuthenticated);
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  );
  
  // If the route is public, allow access
  if (isPublicRoute) {
    // If the user is authenticated and trying to access login/signup, redirect to dashboard
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      console.log("Middleware: Authenticated user trying to access login/signup, redirecting to dashboard");
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log("Middleware: Public route, allowing access:", pathname);
    return NextResponse.next();
  }
  
  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!isAuthenticated) {
    console.log("Middleware: Unauthenticated user trying to access protected route, redirecting to login");
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // Allow access to all other routes for authenticated users
  console.log("Middleware: Authenticated user accessing protected route, allowing access");
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