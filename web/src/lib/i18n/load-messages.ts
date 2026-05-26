import type { Locale } from "./config.ts";
import type { Messages } from "./messages.ts";

const messageLoaders = {
  en: async () => (await import("./messages/en.json")).default,
  zh: async () => (await import("./messages/zh.json")).default,
  es: async () => (await import("./messages/es.json")).default,
  hi: async () => (await import("./messages/hi.json")).default,
  ar: async () => (await import("./messages/ar.json")).default,
  pt: async () => (await import("./messages/pt.json")).default,
  id: async () => (await import("./messages/id.json")).default,
  ja: async () => (await import("./messages/ja.json")).default,
  ru: async () => (await import("./messages/ru.json")).default,
  fr: async () => (await import("./messages/fr.json")).default,
  de: async () => (await import("./messages/de.json")).default,
  ko: async () => (await import("./messages/ko.json")).default,
  tr: async () => (await import("./messages/tr.json")).default,
  vi: async () => (await import("./messages/vi.json")).default,
  it: async () => (await import("./messages/it.json")).default,
  pl: async () => (await import("./messages/pl.json")).default,
  nl: async () => (await import("./messages/nl.json")).default,
  th: async () => (await import("./messages/th.json")).default,
  fa: async () => (await import("./messages/fa.json")).default,
  uk: async () => (await import("./messages/uk.json")).default,
  "zh-tw": async () => (await import("./messages/zh-tw.json")).default,
} satisfies Record<Locale, () => Promise<Messages>>;

export const loadMessages = (locale: Locale): Promise<Messages> => messageLoaders[locale]();
