import type { HnApiClient } from "./types.ts";

const BASE_URL = "https://hacker-news.firebaseio.com/v0";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJsonOnce = async (path: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HN API request failed: ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJson = async (path: string): Promise<unknown> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchJsonOnce(path);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
      await delay(250 * attempt);
    }
  }
  throw lastError;
};

export const createRealHnApiClient = (): HnApiClient => ({
  async maxItem() {
    const raw = await fetchJson("/maxitem.json");
    if (typeof raw !== "number" || !Number.isInteger(raw)) {
      throw new Error("HN API returned invalid maxitem");
    }
    return raw;
  },
  async item(id) {
    return fetchJson(`/item/${id}.json`);
  },
});
