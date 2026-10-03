import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { loadConfig } from './config';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const webDist = process.env.WEB_DIST ?? path.resolve(here, '../../web/dist');

const { app, deps } = await createApp({ config, webDist });
app.listen(config.port, () => {
  console.log(
    `GovSathi listening on :${config.port} | schemes: ${deps.corpus.schemes.length} | AI: bring-your-own-key (no shared key)`,
  );
});
