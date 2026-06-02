import { NextResponse, type NextRequest } from 'next/server'
import { getSessionEmailFromRequest } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/registro')
  const isApiRoute = pathname.startsWith('/api')

  if (isApiRoute) return NextResponse.next({ request })

  const email = await getSessionEmailFromRequest(request)

  if (!email && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (email && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
