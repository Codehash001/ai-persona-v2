import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Remove the admin token cookie
    cookies().delete('admin_token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout failed:", error)
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    )
  }
}
