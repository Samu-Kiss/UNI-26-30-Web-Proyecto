interface Window {
  __MYT_CONFIG__?: {
    backendUrl?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    environment?: string;
    release?: string;
    sentryDsn?: string;
    tracesSampleRate?: number;
  };
}
