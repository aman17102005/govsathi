import express, { type Express } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Config } from './config';
import { loadCorpus } from './data';
import { LlmAuthError, LlmConfigError, LlmQuotaError, LlmUnsupportedError, redact, type AiProvider } from './llm';
import { RateLimiter, looksSensitive } from './security';
import { makeIndex, parseRequest, runSearch, type Deps } from './search';
import { PROVIDER_IDS, PROVIDER_INFO, createProvider, readProviderHeaders, suggestFor, type ProviderFactory } from './ai/registry';

export interface AppOptions {
  config: Config;
  webDist?: string;
  /** Test seam: build a provider from the citizen's settings. Defaults to the real adapters. */
  makeProvider?: ProviderFactory;
  today?: () => string;
}

export async function createApp(opts: AppOptions): Promise<{ app: Express; deps: Deps }> {
  const { config } = opts;
  const root = config.rootDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const corpus = loadCorpus(root);
  const make = opts.makeProvider ?? createProvider;
  const deps: Deps = { corpus, index: makeIndex(corpus), cache: new Map(), today: opts.today };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  const onRender = Boolean(process.env.RENDER);
  app.use(
    helmet({
      // Only force https upgrades where https exists; on plain-http localhost Safari would rewrite asset URLs and the page would be blank.
      contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': onRender ? [] : null, 'connect-src': ["'self'"] } },
      strictTransportSecurity: onRender,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  // Keys travel in headers; responses carrying them must never be cached anywhere.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  const limiter = new RateLimiter(config.perMinuteLimit);
  const checkLimiter = new RateLimiter(config.aiCheckPerMinuteLimit);

  // API errors are machine-readable codes only; the client renders localized text.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', schemes: corpus.schemes.length, sharedAiKey: false });
  });

  app.get('/api/ai/providers', (_req, res) => {
    res.json({ providers: PROVIDER_IDS.map((id) => ({ id, ...PROVIDER_INFO[id] })) });
  });

  /** Lists the models available to the citizen's own key. Doubles as the key check (listing models is free). */
  app.post('/api/ai/models', async (req, res) => {
    if (!checkLimiter.allow(req.ip ?? 'unknown')) return void res.status(429).json({ error: { code: 'rate_limited' } });
    const cfg = readProviderHeaders(req.headers, false);
    if (!cfg.ok || !cfg.config) return void res.status(400).json({ error: { code: 'invalid_ai_config' } });
    const secrets = [cfg.config.apiKey];
    try {
      const provider = make(cfg.config);
      const models = await provider.listModels();
      res.json({ models: models.slice(0, 300), suggested: suggestFor(cfg.config.provider, models) });
    } catch (e) {
      if (e instanceof LlmUnsupportedError) return void res.json({ models: [], unsupported: true });
      const code = e instanceof LlmAuthError ? 'ai_invalid_key' : e instanceof LlmQuotaError ? 'ai_quota' : e instanceof LlmConfigError ? 'ai_model' : 'ai_unavailable';
      console.error('ai models check failed:', e instanceof Error ? e.name : 'error', redact((e as Error).message ?? '', secrets));
      res.status(code === 'ai_quota' ? 429 : code === 'ai_unavailable' ? 502 : 400).json({ error: { code } });
    }
  });

  app.post('/api/search', async (req, res) => {
    if (!limiter.allow(req.ip ?? 'unknown')) return void res.status(429).json({ error: { code: 'rate_limited' } });
    const parsed = parseRequest(req.body);
    if ('error' in parsed) return void res.status(400).json({ error: { code: parsed.error } });
    if (looksSensitive(parsed.query)) return void res.status(400).json({ error: { code: 'sensitive_input' } });
    const cfg = readProviderHeaders(req.headers);
    if (!cfg.ok) return void res.status(400).json({ error: { code: cfg.code } });
    let provider: AiProvider | undefined;
    try {
      provider = cfg.config ? make(cfg.config) : undefined;
      res.json(await runSearch(deps, parsed, provider));
    } catch (e) {
      console.error('search failed:', e instanceof Error ? e.name : 'error', redact((e as Error).message ?? '', cfg.config ? [cfg.config.apiKey] : []));
      res.status(500).json({ error: { code: 'search_failed' } });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'not_found' } });
  });

  const webDist = opts.webDist;
  if (webDist && fs.existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }
  return { app, deps };
}
