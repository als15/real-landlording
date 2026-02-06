import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require admin authentication (the main admin app)
const adminRoutes = ['/', '/requests', '/vendors', '/applications', '/landlords', '/analytics'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check route types
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isVendorDashboardRoute = pathname.startsWith('/vendor/dashboard');
  const isLoginPage = pathname === '/login';
  const isAdminRoute = adminRoutes.includes(pathname) || pathname === '/admin' || pathname.startsWith('/admin/');

  // Protect landlord dashboard - must be logged in AND be a landlord
  if (isDashboardRoute) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify user is a landlord
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (!landlord) {
      // User is not a landlord, redirect to login with error
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('error', 'not_landlord');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect vendor dashboard - must be logged in AND be an active vendor
  if (isVendorDashboardRoute) {
    if (!user) {
      const loginUrl = new URL('/vendor/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify user is an active vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, status')
      .eq('email', user.email)
      .single();

    if (!vendor) {
      // User is not a vendor, redirect to vendor login with error
      const loginUrl = new URL('/vendor/login', request.url);
      loginUrl.searchParams.set('error', 'not_vendor');
      return NextResponse.redirect(loginUrl);
    }

    if (vendor.status !== 'active') {
      // Vendor is not active, redirect with pending status
      const loginUrl = new URL('/vendor/login', request.url);
      loginUrl.searchParams.set('error', 'vendor_not_active');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect old /admin routes to new routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const newPath = pathname.replace('/admin', '') || '/';
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Redirect old /admin/login to /login
  if (pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect admin routes (main app at root level)
  if (isAdminRoute && !isLoginPage) {
    // If not logged in, redirect to login
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    console.log('[Middleware] Admin check:', {
      userId: user.id,
      userEmail: user.email,
      adminUser,
      adminError: adminError?.message,
    });

    if (!adminUser) {
      // User is not an admin, redirect to login with error
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user is logged in admin and visits login page, redirect to dashboard
  if (isLoginPage && user) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (adminUser) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
