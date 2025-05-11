import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get all available personas
    const personas = await prisma.persona.findMany({
      where: {
        isActive: true // Only consider active personas
      }
    });

    if (personas.length === 0) {
      return NextResponse.json({ message: 'No active personas found' }, { status: 404 });
    }

    // Randomly select a persona
    const randomIndex = Math.floor(Math.random() * personas.length);
    const selectedPersona = personas[randomIndex];

    // Update the settings to use the new selected persona
    await prisma.settings.update({
      where: {
        id: "1"  // Default settings ID
      },
      data: {
        selectedPersonaId: selectedPersona.id
      }
    });

    return NextResponse.json({
      message: 'Persona rotated successfully',
      currentPersona: selectedPersona
    });
  } catch (error) {
    console.error('Error rotating persona:', error);
    return NextResponse.json({ error: 'Failed to rotate persona' }, { status: 500 });
  }
}
