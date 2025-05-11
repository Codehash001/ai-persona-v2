import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron-manager";

export async function POST() {
  try {
    await cronManager.forceRotation();
    
    return NextResponse.json({
      status: "success",
      message: "Persona rotation triggered successfully"
    });
  } catch (error) {
    console.error("Error forcing persona rotation:", error);
    return NextResponse.json(
      { error: "Failed to force persona rotation" },
      { status: 500 }
    );
  }
}
