export interface Settings {
  id: string;
  temperature: number;
  maxTokens: number;
  rotationInterval: number;
  selectedPersonaId: string | null;
}
