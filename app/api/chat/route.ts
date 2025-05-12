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

    // Fetch human-like conversation instructions from AdminSettings
    const BASE_INSTRUCTIONS_KEY = "humanLikeInstructions";
    
    // Default instructions in case none are found in the database
    const DEFAULT_HUMAN_LIKE_INSTRUCTIONS = `
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
`;
    
    // Try to get instructions from the database
    const baseInstructionsSettings = await prisma.adminSettings.findUnique({
      where: { key: BASE_INSTRUCTIONS_KEY }
    });
    
    // Use the instructions from the database or fall back to default
    const humanLikeInstructions = baseInstructionsSettings?.value || DEFAULT_HUMAN_LIKE_INSTRUCTIONS;

    // Combine the original system prompt with human-like instructions
    const enhancedSystemPrompt = systemPrompt + humanLikeInstructions;
    
    console.log('Enhanced system prompt with human-like instructions');
    
    const result = await generateText({
      model: openai(modelName), // Use the model from settings
      system: enhancedSystemPrompt,
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
