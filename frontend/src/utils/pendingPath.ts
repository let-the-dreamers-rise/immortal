// Where to take someone after they sign up from an invitation, so a person
// invited to a lineage lands on that lineage rather than on Today.
import { storage } from "./storage";

const KEY = "immortal_pending_path";
const ALLOWED = /^\/lineage\/lin_[A-Za-z0-9_]{1,40}$/;

export async function rememberPath(path: string) {
  if (ALLOWED.test(path)) await storage.setItem(KEY, path).catch(() => {});
}

/** The remembered path, once; it is cleared as it is read. */
export async function takePath(): Promise<string | null> {
  try {
    const path = await storage.getItem<string>(KEY, "");
    await storage.removeItem(KEY);
    return path && ALLOWED.test(path) ? path : null;
  } catch {
    return null;
  }
}
