export const formatMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{([a-z]+)\}/g, (match, key: string) => String(values[key] ?? match));
