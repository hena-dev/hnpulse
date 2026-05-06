const sqlEscape = (s: string): string => s.replace(/'/g, "''");
const stripTrailingSemi = (s: string): string => s.replace(/;\s*$/, "");

export interface JsonExportArgs {
  innerSql: string;
  outputPath: string;
}

export const buildJsonExportSql = (args: JsonExportArgs): string =>
  `COPY (${stripTrailingSemi(args.innerSql)}) TO '${sqlEscape(args.outputPath)}' (FORMAT JSON, ARRAY true);`;

export interface NdjsonToParquetArgs {
  ndjsonPath: string;
  parquetPath: string;
}

export const buildNdjsonToParquetSql = (args: NdjsonToParquetArgs): string =>
  `COPY (
    SELECT * FROM read_json_auto('${sqlEscape(args.ndjsonPath)}', format='newline_delimited')
  ) TO '${sqlEscape(args.parquetPath)}' (FORMAT PARQUET, COMPRESSION 'zstd');`;
