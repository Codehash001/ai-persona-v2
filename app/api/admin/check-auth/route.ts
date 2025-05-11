import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const adminToken = cookies().get('admin_token')?.value

  if (adminToken === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false }, { status: 401 })
}
