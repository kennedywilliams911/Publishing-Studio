import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Authentication is owned by the backend API.
  // The backend session cookie belongs to the Render domain and therefore
  // cannot be read by this Vercel-hosted frontend proxy.
  //
  // Do not attempt to validate pastor_session here.
  // Client-side API requests use credentials: "include", and the backend
  // independently authorizes protected operations.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};