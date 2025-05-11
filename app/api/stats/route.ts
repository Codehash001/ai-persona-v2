import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addDays, format, subDays } from 'date-fns'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '7days'
    const conversationsRange = searchParams.get('conversationsRange') || '7days'

    // Calculate date ranges
    const getDaysFromRange = (range: string) => {
      switch (range) {
        case '14days':
          return 14
        case '30days':
          return 30
        default:
          return 7
      }
    }

    const messagesDaysAgo = subDays(new Date(), getDaysFromRange(timeRange))
    const conversationsDaysAgo = subDays(new Date(), getDaysFromRange(conversationsRange))

    // Get total conversations
    const totalConversations = await prisma.conversation.count()

    // Get unique users
    const totalUsers = await prisma.conversation.groupBy({
      by: ['username'],
      _count: true
    }).then(groups => groups.length)

    // Get total messages
    const totalMessages = await prisma.message.count()

    // Get active personas
    const activePersonas = await prisma.persona.count({
      where: {
        isActive: true
      }
    })

    // Get messages by date for the selected time range
    const messagesByDate = await prisma.message.groupBy({
      by: ['createdAt'],
      _count: true,
      where: {
        createdAt: {
          gte: messagesDaysAgo
        }
      }
    })

    // Create an array of dates for the selected range
    const daysInRange = getDaysFromRange(timeRange)
    const dateRange = Array.from({ length: daysInRange }, (_, i) => {
      const date = subDays(new Date(), i)
      return format(date, 'MM/dd')
    }).reverse()

    // Format messages by date and fill in missing days with 0
    const messageCountByDate = messagesByDate.reduce((acc, entry) => {
      const date = format(entry.createdAt, 'MM/dd')
      acc[date] = entry._count
      return acc
    }, {} as Record<string, number>)

    const formattedMessagesByDate = dateRange.map(date => ({
      date,
      count: messageCountByDate[date] || 0
    }))

    // Get messages per conversation for the selected time range
    const conversationMessages = await prisma.conversation.findMany({
      take: 10,
      where: {
        createdAt: {
          gte: conversationsDaysAgo
        }
      },
      orderBy: {
        messages: {
          _count: 'desc'
        }
      },
      select: {
        username: true,
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    const formattedMessagesPerConversation = conversationMessages.map((conv, index) => ({
      conversation: `Conv ${index + 1} (${conv.username})`,
      messages: conv._count.messages
    }))

    // Get persona usage
    const personaUsage = await prisma.message.groupBy({
      by: [Prisma.MessageScalarFieldEnum.conversationId],
      _count: true,
      where: {
        conversation: {
          personaId: {
            not: null
          }
        }
      }
    })

    const conversationPersonas = await prisma.conversation.findMany({
      where: {
        id: {
          in: personaUsage.map(p => p.conversationId)
        }
      },
      select: {
        id: true,
        personaId: true,
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    const personaCounts = conversationPersonas.reduce((acc, conv) => {
      if (conv.personaId) {
        acc[conv.personaId] = (acc[conv.personaId] || 0) + conv._count.messages
      }
      return acc
    }, {} as Record<string, number>)

    const personas = await prisma.persona.findMany({
      where: {
        id: {
          in: Object.keys(personaCounts)
        }
      }
    })

    const formattedPersonaUsage = personas.map(persona => ({
      name: persona.name,
      usage: personaCounts[persona.id]
    }))

    return NextResponse.json({
      totalConversations,
      totalUsers,
      totalMessages,
      activePersonas,
      messagesByDate: formattedMessagesByDate,
      personaUsage: formattedPersonaUsage,
      messagesPerConversation: formattedMessagesPerConversation
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
