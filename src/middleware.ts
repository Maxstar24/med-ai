import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Handle callback URLs in development
    if (process.env.NODE_ENV === 'development') {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
      if (callbackUrl?.includes('med-ai-app.ondigitalocean.app')) {
        const url = req.nextUrl.clone();
        url.searchParams.set(
          'callbackUrl', 
          callbackUrl.replace('https://med-ai-app.ondigitalocean.app', 'http://localhost:3000')
        );
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/chat/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
    "/api/protected/:path*",
  ],
}; 