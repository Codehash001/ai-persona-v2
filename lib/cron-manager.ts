import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CronManager {
  private static instance: CronManager;
  private currentInterval: number = 360; // Default 6 hours in minutes

  private constructor() {}

  public static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager();
    }
    return CronManager.instance;
  }

  private async getRotationInterval(): Promise<number> {
    try {
      const settings = await prisma.settings.findFirst();
      if (!settings) {
        return 360;
      }
      return settings.rotationInterval;
    } catch (error) {
      console.error('Error fetching rotation interval:', error);
      return 360;
    }
  }

  private async shouldRotatePersona(): Promise<boolean> {
    const settings = await prisma.settings.findFirst();
    if (!settings?.lastRotation) return true;

    const now = new Date();
    const lastRotation = new Date(settings.lastRotation);
    const timeSinceLastRotation = now.getTime() - lastRotation.getTime();
    const randomChance = Math.random();
    
    // Calculate minutes since last rotation
    const minutesSinceLastRotation = timeSinceLastRotation / (1000 * 60);
    const rotationInterval = settings.rotationInterval;
    
    // Calculate thresholds based on rotation interval
    const threshold1 = rotationInterval * 0.33; // 33% of interval
    const threshold2 = rotationInterval * 0.66; // 66% of interval
    const threshold3 = rotationInterval; // 100% of interval
    
    // Guaranteed rotation after full interval
    if (minutesSinceLastRotation >= threshold3) return true;
    
    // Probability increases in three stages
    if (minutesSinceLastRotation >= threshold2) {
      // Between 66% and 100% of interval: 70% chance
      return randomChance < 0.7;
    }
    
    if (minutesSinceLastRotation >= threshold1) {
      // Between 33% and 66% of interval: 40% chance
      return randomChance < 0.4;
    }
    
    // Before 33% of interval: 10% base chance
    return randomChance < 0.1;
  }

  public async checkAndRotatePersona() {
    try {
      if (!(await this.shouldRotatePersona())) {
        return false;
      }

      const personas = await prisma.persona.findMany({
        where: {
          isActive: true
        }
      });

      if (personas.length === 0) {
        console.log('No active personas found for rotation');
        return false;
      }

      const settings = await prisma.settings.findFirst();
      const availablePersonas = personas.filter(p => p.id !== settings?.selectedPersonaId);
      
      if (availablePersonas.length === 0) {
        console.log('No other personas available for rotation');
        return false;
      }

      const randomIndex = Math.floor(Math.random() * availablePersonas.length);
      const selectedPersona = availablePersonas[randomIndex];

      const now = new Date();
      await prisma.settings.update({
        where: {
          id: "1"
        },
        data: {
          selectedPersonaId: selectedPersona.id,
          lastRotation: now
        }
      });

      console.log(`Persona rotated successfully to: ${selectedPersona.name} at ${now.toISOString()}`);
      return true;
    } catch (error) {
      console.error('Error rotating persona:', error);
      return false;
    }
  }

  public async getCurrentInterval(): Promise<number> {
    return this.getRotationInterval();
  }

  public async getLastRotation(): Promise<Date | null> {
    const settings = await prisma.settings.findFirst();
    return settings?.lastRotation || null;
  }

  public async updateRotationInterval(minutes: number) {
    await prisma.settings.update({
      where: { id: "1" },
      data: { 
        rotationInterval: minutes,
        lastRotation: new Date() // Reset last rotation when interval changes
      }
    });
    this.currentInterval = minutes;
  }

  public async forceRotation() {
    console.log('Forcing immediate persona rotation');
    return this.checkAndRotatePersona();
  }

  public async startPersonaRotation() {
    try {
      const interval = await this.getRotationInterval();
      this.currentInterval = interval;
      
      // Initial rotation
      await this.checkAndRotatePersona();
      
      // Set up recurring rotation check
      setInterval(async () => {
        await this.checkAndRotatePersona();
      }, 1000 * 60); // Check every minute
      
      console.log(`Started persona rotation with interval of ${interval} minutes`);
    } catch (error) {
      console.error('Error starting persona rotation:', error);
    }
  }
}

export const cronManager = CronManager.getInstance();
