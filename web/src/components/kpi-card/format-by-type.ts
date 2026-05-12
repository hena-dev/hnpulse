import { formatCount, formatPercent, formatRatio } from "../../lib/format/number.ts";
import type { KpiFormat } from "../../lib/kpi/catalog.ts";

export const formatByType = (value: number, format: KpiFormat, locale?: string): string => {
  switch (format) {
    case "count":
      return formatCount(value, locale);
    case "ratio":
      return formatRatio(value, locale);
    case "percent":
      return formatPercent(value, locale);
  }
};
