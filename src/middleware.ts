import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.com",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    // Detected location for visitors who have not signed up: Vercel's
    // country header, kept in a cookie so client pages can price in the
    // visitor's currency. Signed-in users always use their account
    // country instead; this cookie never overrides that.
    const detected = request.headers.get("x-vercel-ip-country");
    if (detected && request.cookies.get("afropitch_country")?.value !== detected) {
        response.cookies.set("afropitch_country", detected, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
        });
    }

    // Protected Routes Logic
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!session) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/portal'
            redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
            return NextResponse.redirect(redirectUrl)
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!api/|_next/static|_next/image|favicon.ico).*)',
    ],
}
