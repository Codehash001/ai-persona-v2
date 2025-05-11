import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron-manager";
import { prisma } from "@/lib/prisma";

// Track initialization across API route invocations
let isInitialized = false;

export async function POST() {
  try {
    if (isInitialized) {
      return NextResponse.json({
        status: "success",
        message: "Rotation already initialized"
      });
    }

    // Get current settings
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json({
        status: "error",
        message: "No settings found"
      });
    }

    console.log(`Initializing rotation with interval: ${settings.rotationInterval} minutes`);
    await cronManager.startPersonaRotation();
    isInitialized = true;

    return NextResponse.json({
      status: "success",
      message: "Persona rotation initialized successfully",
      interval: settings.rotationInterval
    });
  } catch (error) {
    console.error("Error initializing persona rotation:", error);
    return NextResponse.json(
      { error: "Failed to initialize persona rotation" },
      { status: 500 }
    );
  }
}
