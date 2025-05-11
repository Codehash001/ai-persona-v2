import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { isActive, name, systemPrompt } = body

    // If isActive is provided, update the active status
    if (typeof isActive === "boolean") {
      // If trying to deactivate, check if this would leave no active personas
      if (!isActive) {
        const activeCount = await prisma.persona.count({
          where: {
            isActive: true,
            id: { not: params.id }
          }
        })

        if (activeCount === 0) {
          return NextResponse.json(
            { error: "At least one persona must remain active" },
            { status: 400 }
          )
        }
      }

      // Update the persona's status
      const persona = await prisma.persona.update({
        where: { id: params.id },
        data: { isActive },
      })

      return NextResponse.json(persona)
    }

    // If name or systemPrompt is provided, update those fields
    if (name || systemPrompt) {
      const updateData: any = {}
      if (name) updateData.name = name
      if (systemPrompt) updateData.systemPrompt = systemPrompt

      const persona = await prisma.persona.update({
        where: { id: params.id },
        data: updateData,
      })
      return NextResponse.json(persona)
    }

    return NextResponse.json(
      { error: "No valid update fields provided" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Failed to update persona:", error)
    return NextResponse.json(
      { error: "Failed to update persona" },
      { status: 500 }
    )
  }
}
