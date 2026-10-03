export interface Config {
  port: number;
  /** Requests per minute per client for /api/search. */
  perMinuteLimit: number;
  /** Requests per minute per client for the key-checking endpoint (stricter: it can be used to test stolen keys). */
  aiCheckPerMinuteLimit: number;
  rootDir?: string;
}

/**
 * There is intentionally NO API-key setting here. GovSathi ships no AI key: each citizen may supply their own, per
 * request, from their browser. Nothing on the server stores it.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    perMinuteLimit: Number(env.SEARCH_PER_MINUTE ?? 20),
    aiCheckPerMinuteLimit: Number(env.AI_CHECK_PER_MINUTE ?? 6),
    rootDir: env.GOVSATHI_ROOT,
  };
}
