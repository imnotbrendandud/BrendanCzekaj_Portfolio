/**
 * Saves the block editor's document to src/content/portfolio.json.
 *
 * DEV ONLY. The `.dev.ts` extension is registered in next.config.ts for the
 * development server alone, so this route doesn't exist in `next build` and
 * never ships in the static export.
 */

import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as prettier from 'prettier';
import { ContentError, validatePortfolio } from '@/content/validate';

const FILE = path.join(process.cwd(), 'src/content/portfolio.json');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Writes run one at a time, in arrival order, so fast typing can't interleave. */
let queue: Promise<unknown> = Promise.resolve();

export async function POST(request: Request) {
  // Only the page itself may write. A browser always sends Origin on a POST, so
  // this stops any other site from scripting your dev server, and requiring a
  // JSON body forces a CORS preflight that this route never answers.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (
    !origin ||
    !host ||
    new URL(origin).host !== host ||
    !LOCAL_HOSTS.has(new URL(origin).hostname)
  ) {
    return Response.json({ error: 'Edits are only accepted from localhost.' }, { status: 403 });
  }
  if (request.headers.get('content-type') !== 'application/json') {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Malformed JSON.' }, { status: 400 });
  }

  // The same validation the site runs when it loads the file: whatever the
  // page sends, only a document the site can render is ever written.
  let content;
  try {
    content = validatePortfolio((body as { content?: unknown } | null)?.content);
  } catch (error) {
    const message = error instanceof ContentError ? error.message : 'Invalid content.';
    return Response.json({ error: message }, { status: 422 });
  }

  const job = queue.then(() => write(content));
  queue = job.catch(() => {});
  try {
    await job;
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function write(content: unknown) {
  const options = await prettier.resolveConfig(FILE);
  // Indented input matters: Prettier keeps an object expanded only if it already
  // spans lines, so compact JSON would collapse small objects and turn a
  // one-word edit into a diff across the whole file.
  const formatted = await prettier.format(JSON.stringify(content, null, 2), {
    ...options,
    filepath: FILE,
  });

  // Unchanged: skip the write, and the hot reload it would trigger.
  if (formatted === (await readFile(FILE, 'utf8').catch(() => ''))) return;

  // Write beside the file, then swap it in, so a crash can't leave half a file.
  const temp = `${FILE}.tmp`;
  await writeFile(temp, formatted);
  await rename(temp, FILE);
}
