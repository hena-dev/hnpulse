import type { HnApiClient } from "./types.ts";

const BASE_URL = "https://hacker-news.firebaseio.com/v0";

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`HN API request failed: ${response.status}`);
  return response.json();
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
