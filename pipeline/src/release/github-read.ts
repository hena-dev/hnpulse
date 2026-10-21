// Retry individual read requests so a transient GitHub failure does not restart
// pagination. Keep mutations out of this wrapper: uploads use one-shot streams.
export const retryGitHubRead = async <T>(read: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (attempt >= 3 || typeof status !== "number" || status < 500 || status >= 600) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    }
  }
};
