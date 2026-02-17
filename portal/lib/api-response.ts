import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function badRequest(message: string, code = "BAD_REQUEST", details?: unknown) {
  return NextResponse.json({ error: message, code, details }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
}

export function serverError(message = "Internal Server Error", details?: unknown) {
  return NextResponse.json({ error: message, code: "SERVER_ERROR", details }, { status: 500 });
}
