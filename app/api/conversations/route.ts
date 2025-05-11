import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')

    let whereClause: any = {}

    // Add date filters
    if (startDate || endDate) {
      whereClause.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) })
      }
    }

    // Add search filter
    if (search) {
      whereClause.username = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.conversation.count({
      where: whereClause,
    })

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            persona: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        personaChanges: {
          orderBy: {
            timestamp: 'asc',
          },
          include: {
            fromPersona: {
              select: {
                id: true,
                name: true,
              },
            },
            toPersona: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Transform the data to include persona info and persona changes
    const transformedConversations = conversations.map(conversation => ({
      ...conversation,
      messages: conversation.messages.map(message => ({
        ...message,
        conversation: undefined // Remove nested conversation data
      })),
      personaChanges: conversation.personaChanges.map(change => ({
        timestamp: change.timestamp,
        from: change.fromPersona?.name || 'none',
        to: change.toPersona.name
      }))
    }));

    return NextResponse.json({
      conversations: transformedConversations,
      pagination: {
        total: totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
        page,
        pageSize,
      }
    })
  } catch (error) {
    console.error("Failed to fetch conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

// Export conversation as JSON or CSV
export async function POST(req: NextRequest) {
  try {
    const { conversationId, format, startDate, endDate } = await req.json()

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      };
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        ...dateFilter
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            persona: true,
          },
          where: dateFilter
        },
        personaChanges: {
          orderBy: {
            timestamp: "asc",
          },
          where: dateFilter
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    let data
    let contentType
    let filename

    if (format === "json") {
      data = JSON.stringify(conversation, null, 2)
      contentType = "application/json"
      filename = `conversation-${conversationId}.json`
    } else {
      // CSV format
      const headers = ["timestamp", "role", "content", "persona"]
      const rows = conversation.messages.map((msg) => [
        new Date(msg.createdAt).toLocaleString(), 
        msg.role,
        msg.content.replace(/"/g, '""').replace(/\n/g, ' '),
        msg.persona?.name || "",
      ])
      data = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n")
      contentType = "text/csv"
      filename = `conversation-${conversationId}.csv`
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export failed:", error)
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    )
  }
}
