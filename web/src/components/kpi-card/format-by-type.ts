import { formatCount, formatPercent, formatRatio } from "../../lib/format/number.ts";
import type { KpiFormat } from "../../lib/kpi/catalog.ts";

export const formatByType = (value: number, format: KpiFormat): string => {
  switch (format) {
    case "count":
      return formatCount(value);
    case "ratio":
      return formatRatio(value);
    case "percent":
      return formatPercent(value);
  }
};
