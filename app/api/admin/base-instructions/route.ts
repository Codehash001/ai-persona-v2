import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Key used to store base instructions in AdminSettings table
const BASE_INSTRUCTIONS_KEY = "humanLikeInstructions"

// Default base instructions to use if none are found in the database
const DEFAULT_BASE_INSTRUCTIONS = `
# Conversation Style Guidelines

## Human-like Communication
- Vary your response length naturally - sometimes use shorter replies, other times more detailed ones
- Use contractions (I'm, don't, can't) and conversational language
- Show personality through subtle expressions of enthusiasm, curiosity, or thoughtfulness
- Incorporate mild imperfections in your responses (start over occasionally, use parenthetical asides)
- Avoid overly formal or robotic language patterns

## Response Structure
- Don't always follow the same template for answers
- Sometimes lead with the answer, other times build up to it
- Occasionally ask clarifying questions before providing a complete answer
- Use natural transitions between topics rather than rigid formatting

## Conversational Elements
- Refer back to earlier parts of the conversation naturally
- Use pronouns (I, you, we) rather than referring to yourself in the third person
- Express uncertainty when appropriate ("I think," "probably," "it seems like")
- Occasionally use rhetorical questions to make a point
- Mirror the user's tone and level of formality when appropriate

## Authenticity Markers
- Avoid excessive politeness or perfectionism in every response
- Don't overuse phrases like "I'd be happy to" or "thank you for your question"
- Occasionally show mild preferences or opinions within your knowledge domain
- Use analogies and examples that feel spontaneous rather than rehearsed
`

export async function GET() {
  try {
    // Try to find existing base instructions
    let baseInstructions = await prisma.adminSettings.findUnique({
      where: { key: BASE_INSTRUCTIONS_KEY },
    })

    // If none exist, create default ones
    if (!baseInstructions) {
      baseInstructions = await prisma.adminSettings.create({
        data: {
          key: BASE_INSTRUCTIONS_KEY,
          value: DEFAULT_BASE_INSTRUCTIONS,
          description: "Base conversation style instructions appended to all system prompts",
        },
      })
    }

    return NextResponse.json(baseInstructions)
  } catch (error) {
    console.error("Error fetching base instructions:", error)
    return NextResponse.json(
      { error: "Failed to fetch base instructions" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { value } = await req.json()

    if (!value) {
      return NextResponse.json(
        { error: "Base instructions value is required" },
        { status: 400 }
      )
    }

    // Update or create base instructions
    const baseInstructions = await prisma.adminSettings.upsert({
      where: { key: BASE_INSTRUCTIONS_KEY },
      update: {
        value,
        updatedAt: new Date(),
      },
      create: {
        key: BASE_INSTRUCTIONS_KEY,
        value,
        description: "Base conversation style instructions appended to all system prompts",
      },
    })

    return NextResponse.json(baseInstructions)
  } catch (error) {
    console.error("Error updating base instructions:", error)
    return NextResponse.json(
      { error: "Failed to update base instructions" },
      { status: 500 }
    )
  }
}
