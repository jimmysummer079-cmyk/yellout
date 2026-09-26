import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (…/yellout) */
export const REPO_ROOT = path.resolve(here, '../../../');

export function resolveFromRoot(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(REPO_ROOT, p);
}
