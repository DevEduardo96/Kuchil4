import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Definir rotas que precisam de autenticação
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/checkout(.*)",
  "/account(.*)",
]);

// Definir rotas públicas explicitamente
const isPublicRoute = createRouteMatcher([
  "/",
  "/products(.*)",
  "/about",
  "/contact",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/studio(.*)",
  "/api/webhooks(.*)", // Para webhooks do Stripe/Clerk
]);

export default clerkMiddleware((auth, req) => {
  const { nextUrl } = req;
  
  try {
    // Sempre permitir arquivos estáticos e Next.js internals
    if (
      nextUrl.pathname.startsWith("/_next") ||
      nextUrl.pathname.includes("/api/") ||
      nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf)$/)
    ) {
      return NextResponse.next();
    }

    // Permitir rotas públicas
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }

    // Proteger rotas que precisam de autenticação
    if (isProtectedRoute(req)) {
      auth().protect();
    }

    return NextResponse.next();
    
  } catch (error) {
    console.error("Middleware error:", error);
    
    // Se não for uma rota de API, redirecionar para home
    if (!nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // Para rotas de API, retornar erro 500
    return new NextResponse("Internal Server Error", { status: 500 });
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};