import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { startDate, endDate } = await req.json()

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      };
    }

    // First delete messages
    await prisma.message.deleteMany({
      where: {
        conversation: {
          ...dateFilter
        }
      }
    });

    // Then delete persona changes
    await prisma.personaChange.deleteMany({
      where: {
        conversation: {
          ...dateFilter
        }
      }
    });

    // Finally delete conversations
    await prisma.conversation.deleteMany({
      where: dateFilter
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear data:", error)
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    )
  }
}
