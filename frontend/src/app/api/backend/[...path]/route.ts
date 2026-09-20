import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SESSION_COOKIE = "pastor_session";

async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/api\/backend/, "");
  const search = request.nextUrl.search;

  const url = `${BACKEND_URL}${path}${search}`;

  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const backendResponse = await fetch(url, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseBody = await backendResponse.arrayBuffer();

  const responseHeaders = new Headers();

  const responseContentType = backendResponse.headers.get("content-type");

  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  const setCookies =
    typeof backendResponse.headers.getSetCookie === "function"
      ? backendResponse.headers.getSetCookie()
      : [];

  const response = new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: responseHeaders,
  });

  for (const setCookie of setCookies) {
    if (setCookie.includes(`${SESSION_COOKIE}=`)) {
      response.headers.append("set-cookie", setCookie);
    }
  }

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
