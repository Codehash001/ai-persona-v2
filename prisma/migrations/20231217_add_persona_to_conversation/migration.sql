-- Add persona relation to conversation
ALTER TABLE "Conversation" ADD COLUMN "personaId" TEXT REFERENCES "Persona"(id);
