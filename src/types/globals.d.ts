// Central global type declarations for third-party browser APIs
// Only define here, import in component files via /// <reference types="..." />
// or let TypeScript pick it up automatically as a .d.ts ambient module.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            nonce?: string;
          }) => void;
          renderButton: (parent: HTMLElement | null, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export {};
