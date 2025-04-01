import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not signed in and trying to access protected route, redirect to login
  if (!session && !req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // If signed in but accessing auth pages, redirect to dashboard
  if (session && req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // For company-specific routes
  if (req.nextUrl.pathname.startsWith('/company/')) {
    // Get company slug from URL
    const companySlug = req.nextUrl.pathname.split('/')[2];

    // Check if user has access to this company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single();

    if (!company) {
      return NextResponse.redirect(new URL('/404', req.url));
    }

    const { data: companyUser } = await supabase
      .from('company_users')
      .select('role')
      .eq('company_id', company.id)
      .eq('user_id', session?.user?.id)
      .single();

    if (!companyUser) {
      return NextResponse.redirect(new URL('/403', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/company/:path*',
    '/auth/:path*',
  ],
} 