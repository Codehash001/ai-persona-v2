import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron-manager";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get current settings from database
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json({
        status: "error",
        message: "No settings found"
      });
    }

    const now = new Date();
    const lastRotation = await cronManager.getLastRotation();
    
    let nextRotationTime: string;
    if (lastRotation) {
      const nextRotation = new Date(lastRotation.getTime() + settings.rotationInterval * 60 * 1000);
      const timeUntilNextRotation = nextRotation.getTime() - now.getTime();
      const minutesUntilNext = Math.floor(timeUntilNextRotation / (60 * 1000));
      nextRotationTime = `${minutesUntilNext} minutes`;
    } else {
      nextRotationTime = "Unknown - no rotation has occurred yet";
    }
    
    return NextResponse.json({
      status: "active",
      currentInterval: settings.rotationInterval,
      lastRotation: lastRotation?.toISOString() || "Never",
      nextRotationIn: nextRotationTime,
      currentTime: now.toISOString(),
      message: "Rotation system is active"
    });
  } catch (error) {
    console.error("Error getting rotation status:", error);
    return NextResponse.json(
      { error: "Failed to get rotation status" },
      { status: 500 }
    );
  }
}
