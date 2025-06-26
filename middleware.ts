import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/packages',
  '/packages/(.*)',
  '/about',
  '/contact',
  '/api/contact',
  '/api/newsletter',
  '/api/webhooks/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/bookings(.*)',
  '/profile(.*)',
  '/api/bookings(.*)',
  '/api/user(.*)'
]);

// Get client IP address
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return req.ip || 'unknown';
}

// Basic vulnerability scanning
function checkForSuspiciousActivity(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const url = req.url;
  
  const suspiciousPatterns = [
    /bot|crawler|spider/i,
    /sqlmap|nikto|nmap/i,
    /<script|javascript:|vbscript:/i,
    /union.*select|drop.*table|insert.*into/i
  ];
  
  return suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || pattern.test(url)
  );
}

export default clerkMiddleware((auth, req) => {
  // Security headers
  const response = NextResponse.next();
  
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.clerk.dev https://*.clerk.accounts.dev",
    "frame-src https://js.stripe.com https://checkout.stripe.com https://*.clerk.accounts.dev",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Check for suspicious activity
  if (checkForSuspiciousActivity(req)) {
    console.warn('Suspicious activity detected:', {
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent'),
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    // Block suspicious requests
    return new Response('Forbidden', { status: 403 });
  }
  
  // Handle authentication for protected routes
  if (isProtectedRoute(req) && !auth().userId) {
    return auth().redirectToSignIn();
  }
  
  // Redirect authenticated users away from auth pages
  if (auth().userId && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};