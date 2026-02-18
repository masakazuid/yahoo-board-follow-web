import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Private"' },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER || "";
  const pass = process.env.BASIC_AUTH_PASS || "";

  // 設定がなければロックしない（保険）
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  const b64 = auth.slice("Basic ".length);
  const [u, p] = Buffer.from(b64, "base64").toString("utf-8").split(":");

  if (u !== user || p !== pass) return unauthorized();
  return NextResponse.next();
}

// 静的ファイルは除外
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
