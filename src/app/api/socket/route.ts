import { NextResponse } from "next/server";

// Socket.io is handled by custom server
// This route is just for status checking
export async function GET() {
  return NextResponse.json({
    message: "Socket.io is handled by custom server.ts",
    status: "See server.ts for implementation",
  });
}
