import { describe, expect, it } from "vitest";
import { buildJsonExportSql, buildNdjsonToParquetSql } from "./sql-templates.ts";

describe("buildJsonExportSql", () => {
  it("wraps the inner select in COPY ... TO ... (FORMAT JSON, ARRAY true)", () => {
    const out = buildJsonExportSql({
      innerSql: "SELECT 1 AS x",
      outputPath: "/tmp/out.json",
    });
    expect(out).toContain("COPY (SELECT 1 AS x) TO '/tmp/out.json'");
    expect(out).toContain("FORMAT JSON");
    expect(out).toContain("ARRAY true");
  });

  it("strips a trailing semicolon from the inner SQL", () => {
    const out = buildJsonExportSql({ innerSql: "SELECT 1;", outputPath: "/x.json" });
    expect(out).toContain("(SELECT 1)");
  });

  it("escapes single quotes in the output path", () => {
    const out = buildJsonExportSql({ innerSql: "SELECT 1", outputPath: "/tmp/o'ut.json" });
    expect(out).toContain("/tmp/o''ut.json");
  });
});

describe("buildNdjsonToParquetSql", () => {
  it("reads NDJSON and writes parquet with zstd compression", () => {
    const out = buildNdjsonToParquetSql({
      ndjsonPath: "/tmp/in.ndjson",
      parquetPath: "/tmp/out.parquet",
    });
    expect(out).toContain("read_json_auto('/tmp/in.ndjson'");
    expect(out).toContain("'/tmp/out.parquet'");
    expect(out).toContain("FORMAT PARQUET");
    expect(out).toContain("COMPRESSION");
  });

  it("escapes single quotes in both paths", () => {
    const out = buildNdjsonToParquetSql({
      ndjsonPath: "/a'.ndjson",
      parquetPath: "/b'.parquet",
    });
    expect(out).toContain("/a''.ndjson");
    expect(out).toContain("/b''.parquet");
  });
});
