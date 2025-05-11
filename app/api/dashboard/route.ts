import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get total conversations
    const totalConversations = await prisma.conversation.count()

    // Get total messages
    const totalMessages = await prisma.message.count()

    // Get active personas count
    const activePersonas = await prisma.persona.count({
      where: { isActive: true }
    })

    // Get total personas
    const totalPersonas = await prisma.persona.count()

    // Get messages in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const messagesLast24Hours = await prisma.message.count({
      where: {
        createdAt: {
          gte: last24Hours
        }
      }
    })

    // Get average messages per conversation
    const avgMessagesPerConversation = totalConversations > 0 
      ? Math.round((totalMessages / totalConversations) * 10) / 10
      : 0

    // Get conversation distribution by hour
    const conversationsByHour = await prisma.conversation.groupBy({
      by: ['createdAt'],
      _count: true,
      orderBy: {
        createdAt: 'desc'
      },
      take: 24
    })

    return NextResponse.json({
      totalConversations,
      totalMessages,
      activePersonas,
      totalPersonas,
      messagesLast24Hours,
      avgMessagesPerConversation,
      conversationsByHour
    })
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}
