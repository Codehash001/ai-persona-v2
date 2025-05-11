import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron-manager";

export async function POST(req: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('Authorization');
    if (process.env.VERCEL && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await cronManager.forceRotation();
    
    return NextResponse.json({
      status: "success",
      message: "Persona rotation triggered successfully"
    });
  } catch (error) {
    console.error("Error triggering rotation:", error);
    return NextResponse.json(
      { error: "Failed to trigger rotation" },
      { status: 500 }
    );
  }
}

// Also allow GET requests for manual testing
export async function GET(req: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('Authorization');
    if (process.env.VERCEL && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await cronManager.forceRotation();
    
    return NextResponse.json({
      status: "success",
      message: "Persona rotation triggered successfully"
    });
  } catch (error) {
    console.error("Error triggering rotation:", error);
    return NextResponse.json(
      { error: "Failed to trigger rotation" },
      { status: 500 }
    );
  }
}
