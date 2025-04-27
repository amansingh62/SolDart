// Global type definitions

interface Window {
  openDirectMessage?: (userId: string, username: string, profileImage: string, initialMessage?: string) => void;
}
