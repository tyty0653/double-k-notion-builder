const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_CODE = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]);

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function isTransientReadError(error) {
  return TRANSIENT_STATUS.has(error?.status)
    || TRANSIENT_STATUS.has(error?.statusCode)
    || TRANSIENT_CODE.has(error?.code);
}

export async function withReadRetry(operation, {
  maxAttempts = 4,
  initialDelayMs = 250,
  maxDelayMs = 4000,
  sleep = defaultSleep,
  random = Math.random,
} = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts || !isTransientReadError(error)) throw error;
      const delay = Math.min(maxDelayMs, initialDelayMs * (2 ** (attempt - 1)));
      await sleep(Math.round(delay * (0.75 + random() * 0.5)));
    }
  }
  throw new Error("unreachable retry state");
}

export function runWrite(operation) {
  return operation();
}
