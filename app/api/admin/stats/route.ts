import { prisma } from "@/lib/prisma"
import { NextResponse, NextRequest } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminToken = cookies().get('admin_token')?.value
    if (adminToken !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7days'

    // Calculate date range
    const startDate = new Date()
    switch (timeRange) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '14days':
        startDate.setDate(startDate.getDate() - 14)
        break
      case '30days':
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }

    // Set start date to beginning of day and end date to end of day
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    // Get total conversations
    const totalConversations = await prisma.conversation.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Get total users (unique users from conversations)
    const totalUsers = await prisma.conversation.groupBy({
      by: ['username'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
    }).then(result => result.length)

    // Get total messages
    const totalMessages = await prisma.message.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Get active personas
    const activePersonas = await prisma.persona.count({
      where: {
        isActive: true
      }
    })

    // Get messages by date
    const messagesByDate = await prisma.message.groupBy({
      by: ['createdAt'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    }).then(results => {
      // Create a map to store counts by date
      const countsByDate = new Map()
      
      // Initialize all dates in the range with 0
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        countsByDate.set(dateKey, 0)
      }

      // Fill in actual counts
      results.forEach(result => {
        const dateKey = result.createdAt.toISOString().split('T')[0]
        countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + result._count)
      })

      // Convert map to array of objects and ensure integer values
      return Array.from(countsByDate.entries())
        .map(([date, count]) => ({
          date,
          count: Math.round(Number(count))
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })

    // Get persona usage
    const personaUsage = await prisma.message.groupBy({
      by: ['personaId'],
      _count: true,
      where: {
        role: 'assistant',
        personaId: { not: null },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }).then(async results => {
      const personas = await prisma.persona.findMany({
        where: {
          id: {
            in: results.map(r => r.personaId).filter(Boolean) as string[]
          }
        }
      })
      
      return results
        .map(result => ({
          name: personas.find(p => p.id === result.personaId)?.name || 'Unknown',
          usage: Math.round(Number(result._count))
        }))
        .sort((a, b) => b.usage - a.usage) // Sort by usage in descending order
    })

    return NextResponse.json({
      totalConversations,
      totalUsers,
      totalMessages,
      activePersonas,
      messagesByDate,
      personaUsage,
      messagesPerConversation: []
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}
