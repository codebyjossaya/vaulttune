import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'



// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  console.log("Middleware triggered for path: ", request.nextUrl.pathname);
  const token = request.cookies.get('auth_token')?.value
  const pathname = request.nextUrl.pathname

  if (!token && pathname !== '/app/login') {
    return NextResponse.redirect(new URL('/app/login', request.url))
  }
  console.log(`${request.nextUrl.origin}/api/auth/session`);
  const data = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${token}`
    }
  });

  if (pathname !== '/app/login' && pathname !== '/app' && data) {
    if (!data.ok) {
      return NextResponse.redirect(new URL('/app/login', request.url));
    }
    return NextResponse.next();
  } else {
    return data.ok ? NextResponse.redirect(new URL('/app/dashboard', request.url)) : NextResponse.next();
  }
}


 
// See "Matching Paths" below to learn more
export const config = {
  matcher: '/app/:path*',
}