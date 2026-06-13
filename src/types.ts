export interface Idea {
  id: string;
  title: string;
  author: string;
  category: string;
  excitement: number; // 1 to 5
  date: string;
  link: string;
  description: string;
  imagePath?: string; // Path to saved image (upload or drawing)
  reactions: Record<string, string[]>; // Map of emoji -> list of kid names who reacted
}

export interface KidProfile {
  id: string;
  name: string;
  avatar: string; // Emoji representing the kid
  color: string;  // CSS color/gradient
}

export interface ParentSettings {
  localSyncPath: string;      // Absolute directory path where markdown files will be written
  googleAppsScriptUrl: string; // Direct URL to Google Apps Script Web App
  syncMode: 'local' | 'cloud' | 'both';
}

export interface AppState {
  ideas: Idea[];
  profiles: KidProfile[];
  currentKid: KidProfile | null;
  settings: ParentSettings;
}
