import { NextResponse } from "next/server"
import { openai } from '@ai-sdk/openai';
import { generateText} from 'ai';
import { prisma } from "@/lib/prisma"
import { cronManager } from "@/lib/cron-manager"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, username, conversationId } = await req.json()
    const userMessage = messages[messages.length - 1].content

    // Get current settings from the settings table
    const settings = await prisma.settings.findUnique({
      where: { id: "1" },
      include: {
        selectedPersona: true
      }
    });

    // If no persona is selected, get a random active persona
    if (!settings?.selectedPersonaId) {
      const activePersonas = await prisma.persona.findMany({
        where: {
          isActive: true
        }
      });

      if (activePersonas.length > 0) {
        const randomPersona = activePersonas[Math.floor(Math.random() * activePersonas.length)];
        await prisma.settings.update({
          where: { id: "1" },
          data: {
            selectedPersonaId: randomPersona.id
          }
        });
        console.log('Selected random persona:', randomPersona.name);
      }
    }

    // Try to rotate persona before processing the message
    await cronManager.checkAndRotatePersona();

    // Refresh settings in case persona was rotated or randomly selected
    const updatedSettings = await prisma.settings.findUnique({
      where: { id: "1" },
      include: {
        selectedPersona: true
      }
    });

    console.log("Settings:", updatedSettings)

    // Default settings if none exist
    let temperature = 0.7
    let maxTokens = 1000
    let systemPrompt = "You are a helpful assistant."
    let modelName = "gpt-4o" // Default model

    // Use settings from database if they exist
    if (updatedSettings) {
      temperature = updatedSettings.temperature
      maxTokens = updatedSettings.maxTokens
      modelName = updatedSettings.modelName
      
      // Use the selected persona's system prompt if available
      if (updatedSettings.selectedPersona) {
        systemPrompt = updatedSettings.selectedPersona.systemPrompt
        console.log('Using persona:', updatedSettings.selectedPersona.name)
      }
    }

    let conversation
    if (!conversationId) {
      // Create new conversation with persona
      conversation = await prisma.conversation.create({
        data: {
          username: username || "Anonymous",
          personaId: updatedSettings?.selectedPersonaId || null
        },
        include: {
          messages: {
            include: {
              persona: true
            }
          },
          persona: true,
          personaChanges: {
            include: {
              fromPersona: true,
              toPersona: true
            },
            orderBy: {
              timestamp: 'desc'
            }
          }
        }
      })

      // Use the conversation's persona's system prompt
      if (conversation.persona) {
        systemPrompt = conversation.persona.systemPrompt;
        console.log('Using conversation persona:', conversation.persona.name);
      } else {
        // Fallback to default system prompt
        systemPrompt = "You are a helpful assistant.";
        console.log('Using default system prompt (no persona)');
      }
    } else {
      // Get existing conversation
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            include: {
              persona: true
            }
          },
          persona: true,
          personaChanges: {
            include: {
              fromPersona: true,
              toPersona: true
            },
            orderBy: {
              timestamp: 'desc'
            }
          }
        }
      })
      
      if (!conversation) {
        throw new Error("Conversation not found")
      }

      // Use the conversation's persona's system prompt
      if (conversation.persona) {
        systemPrompt = conversation.persona.systemPrompt;
        console.log('Using conversation persona:', conversation.persona.name);
      } else {
        // Fallback to default system prompt
        systemPrompt = "You are a helpful assistant.";
        console.log('Using default system prompt (no persona)');
      }

      // Update conversation's persona if it changed due to rotation
      if (updatedSettings?.selectedPersonaId !== conversation.personaId) {
        // Record the persona change
        if (updatedSettings?.selectedPersonaId) {
          await prisma.personaChange.create({
            data: {
              conversation: {
                connect: {
                  id: conversation.id
                }
              },
              fromPersona: conversation.personaId ? {
                connect: {
                  id: conversation.personaId
                }
              } : undefined,
              toPersona: {
                connect: {
                  id: updatedSettings.selectedPersonaId
                }
              }
            }
          });
        }

        // Update the conversation with new persona
        conversation = await prisma.conversation.update({
          where: { id: conversationId },
          data: { 
            personaId: updatedSettings?.selectedPersonaId || null,
          },
          include: {
            messages: {
              include: {
                persona: true
              }
            },
            persona: true,
            personaChanges: {
              include: {
                fromPersona: true,
                toPersona: true
              },
              orderBy: {
                timestamp: 'desc'
              }
            }
          }
        });

        // Use the conversation's current persona's system prompt
        if (conversation.persona) {
          systemPrompt = conversation.persona.systemPrompt;
          console.log('Using conversation persona:', conversation.persona.name);
        } else {
          // Fallback to default system prompt
          systemPrompt = "You are a helpful assistant.";
          console.log('Using default system prompt (no persona)');
        }
        console.log('Updated conversation persona:', updatedSettings?.selectedPersona ? `to ${updatedSettings.selectedPersona.name}` : 'removed persona');
      }
    }

    // Get all persona changes for this conversation
    const personaChanges = await prisma.personaChange.findMany({
      where: {
        conversationId: conversation.id
      },
      include: {
        fromPersona: true,
        toPersona: true
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Save user message with current persona
    const newUserMessage = await prisma.message.create({
      data: {
        content: userMessage,
        role: "user",
        conversation: {
          connect: {
            id: conversation.id
          }
        },
        ...(updatedSettings?.selectedPersonaId && {
          persona: {
            connect: {
              id: updatedSettings.selectedPersonaId
            }
          }
        })
      },
      include: {
        persona: true
      }
    });

    // Construct messages array with persona-specific system prompts
    const conversationMessages = conversation.messages.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));

    // Add the new user message
    conversationMessages.push({
      role: newUserMessage.role as "user" | "assistant" | "system",
      content: newUserMessage.content
    });

    console.log('Using model:', modelName); // Log the model being used

    const result = await generateText({
      model: openai(modelName), // Use the model from settings
      system: systemPrompt,
      messages: conversationMessages,
      temperature,
      maxTokens
    });

    // Extract the text content from the result
    const responseText = typeof result === 'string' ? result : result.text || '';

    // Save assistant message with current persona
    const assistantMessage = await prisma.message.create({
      data: {
        content: responseText,
        role: "assistant",
        conversation: {
          connect: {
            id: conversation.id
          }
        },
        ...(updatedSettings?.selectedPersonaId && {
          persona: {
            connect: {
              id: updatedSettings.selectedPersonaId
            }
          }
        })
      },
      include: {
        persona: true
      }
    });

    return NextResponse.json({
      role: "assistant",
      content: responseText,
      conversationId: conversation.id,
      persona: assistantMessage.persona,
      personaChanges: personaChanges.map(change => ({
        timestamp: change.timestamp,
        from: change.fromPersona?.name || 'none',
        to: change.toPersona.name
      }))
    })

  } catch (error) {
    console.error("Error in chat:", error)
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    )
  }
}
