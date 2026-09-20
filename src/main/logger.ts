export function debugLog(scope: string, message: string, payload?: unknown) {
  const time = new Date().toISOString();
  if (payload === undefined) {
    console.log(`[${time}] [${scope}] ${message}`);
    return;
  }

  console.log(`[${time}] [${scope}] ${message}`, payload);
}

export function debugError(scope: string, message: string, error?: unknown) {
  const time = new Date().toISOString();
  console.error(`[${time}] [${scope}] ${message}`, error ?? "");
}
