import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const personas = await prisma.persona.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(personas)
  } catch (error) {
    console.error("Failed to fetch personas:", error)
    return NextResponse.json(
      { error: "Failed to fetch personas" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, systemPrompt } = body

    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: "Name and system prompt are required" },
        { status: 400 }
      )
    }

    const existingPersona = await prisma.persona.findUnique({
      where: { name },
    })

    if (existingPersona) {
      return NextResponse.json(
        { error: "A persona with this name already exists" },
        { status: 400 }
      )
    }

    const persona = await prisma.persona.create({
      data: {
        name,
        systemPrompt,
      },
    })

    return NextResponse.json(persona)
  } catch (error) {
    console.error("Failed to create persona:", error)
    return NextResponse.json(
      { error: "Failed to create persona" },
      { status: 500 }
    )
  }
}
