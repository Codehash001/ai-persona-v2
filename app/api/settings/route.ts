import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cronManager } from "@/lib/cron-manager"

export async function GET() {
  try {
    // Get settings or create default if none exist
    const settings = await prisma.settings.findUnique({
      where: { id: "1" },
      include: {
        selectedPersona: true
      }
    });

    // Get exit chat modal text from AdminSettings
    const exitChatModalText = await prisma.adminSettings.findUnique({
      where: { key: "exitChatModalText" }
    });

    if (!settings) {
      // Create default settings
      const defaultSettings = await prisma.settings.create({
        data: {
          temperature: 0.7,
          maxTokens: 1000,
          rotationInterval: 360,
          modelName: "gpt-4o"
        },
        include: {
          selectedPersona: true
        }
      });

      // Initialize rotation with default interval
      await cronManager.updateRotationInterval(360);

      // Create default exit chat modal text if it doesn't exist
      if (!exitChatModalText) {
        await prisma.adminSettings.create({
          data: {
            key: "exitChatModalText",
            value: "Thank you for participating in this research study. Your conversation will be recorded for research purposes.",
            description: "Text displayed in the exit chat confirmation modal"
          }
        });
      }

      return NextResponse.json({
        ...defaultSettings,
        exitChatModalText: exitChatModalText?.value || "Thank you for participating in this research study. Your conversation will be recorded for research purposes."
      });
    }

    return NextResponse.json({
      ...settings,
      exitChatModalText: exitChatModalText?.value || "Thank you for participating in this research study. Your conversation will be recorded for research purposes."
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { temperature, maxTokens, selectedPersonaId, rotationInterval, modelName, exitChatModalText } = body

    // Validate the input
    if (typeof temperature !== "number" || temperature < 0 || temperature > 2) {
      return NextResponse.json(
        { error: "Temperature must be between 0 and 2" },
        { status: 400 }
      )
    }

    if (typeof maxTokens !== "number" || maxTokens < 1) {
      return NextResponse.json(
        { error: "Max tokens must be a positive number" },
        { status: 400 }
      )
    }

    if (typeof rotationInterval !== "number" || rotationInterval < 1) {
      return NextResponse.json(
        { error: "Rotation interval must be a positive number" },
        { status: 400 }
      )
    }

    if (typeof modelName !== "string" || !modelName) {
      return NextResponse.json(
        { error: "Model name must be provided" },
        { status: 400 }
      )
    }

    // Update main settings
    const updatedSettings = await prisma.settings.upsert({
      where: { id: "1" },
      update: {
        temperature,
        maxTokens,
        rotationInterval,
        modelName,
        selectedPersonaId: selectedPersonaId || null
      },
      create: {
        id: "1",
        temperature,
        maxTokens,
        rotationInterval,
        modelName,
        selectedPersonaId: selectedPersonaId || null
      },
      include: {
        selectedPersona: true
      }
    })

    // Update exit chat modal text if provided
    if (exitChatModalText !== undefined) {
      await prisma.adminSettings.upsert({
        where: { key: "exitChatModalText" },
        update: {
          value: exitChatModalText,
          updatedAt: new Date()
        },
        create: {
          key: "exitChatModalText",
          value: exitChatModalText,
          description: "Text displayed in the exit chat confirmation modal"
        }
      })
    }

    // Get the updated exit chat modal text
    const exitChatModalTextSetting = await prisma.adminSettings.findUnique({
      where: { key: "exitChatModalText" }
    })

    // Always update the rotation interval when settings are updated
    console.log(`Updating rotation interval to ${rotationInterval} minutes`);
    await cronManager.updateRotationInterval(rotationInterval);

    return NextResponse.json({
      ...updatedSettings,
      exitChatModalText: exitChatModalTextSetting?.value
    })
  } catch (error) {
    console.error("Failed to update settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
