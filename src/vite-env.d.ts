/// <reference types="vite/client" />

// Google Identity Services types
declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: { client_id: string; scope: string; prompt?: string; callback: (response: any) => void }) => {
                        requestAccessToken: () => void;
                    };
                };
            };
        };
    }
}
