import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createConsentRequestToken() {
  return randomBytes(32).toString("base64url");
}

export function hashConsentRequestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function validConsentRequestToken(token: string) {
  return /^[A-Za-z0-9_-]{40,80}$/.test(token);
}
