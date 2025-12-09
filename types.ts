export enum AppMode {
  NONE = 'NONE',
  WITH_PHOTO = 'WITH_PHOTO',
  NO_PHOTO = 'NO_PHOTO'
}

export interface GeneratedImage {
  id: string;
  url: string; // Base64 data URL
  description: string;
}

export interface AppState {
  step: number;
  mode: AppMode;
  userName: string;
  userPhoto: string | null; // Base64
  generatedMessage: string;
  generatedImages: GeneratedImage[];
  selectedImageIndex: number | null;
  isGenerating: boolean;
  loadingMessage: string;
  error: string | null;
}