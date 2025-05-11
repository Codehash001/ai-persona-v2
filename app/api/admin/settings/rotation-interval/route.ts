import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "1" }
    });

    return NextResponse.json({ 
      rotationInterval: settings?.rotationInterval ?? 360 
    });
  } catch (error) {
    console.error('Error fetching rotation interval:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rotation interval' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { minutes } = await request.json();

    if (typeof minutes !== 'number' || minutes < 1) {
      return NextResponse.json(
        { error: 'Invalid rotation interval. Must be a positive number.' },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.upsert({
      where: { id: "1" },
      update: { rotationInterval: minutes },
      create: {
        rotationInterval: minutes,
        temperature: 0.7,
        maxTokens: 1000
      }
    });

    return NextResponse.json({ 
      message: 'Rotation interval updated successfully',
      rotationInterval: settings.rotationInterval
    });
  } catch (error) {
    console.error('Error updating rotation interval:', error);
    return NextResponse.json(
      { error: 'Failed to update rotation interval' },
      { status: 500 }
    );
  }
}
