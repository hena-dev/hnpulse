/**
 * Minimal interface around the DuckDB CLI.  Real implementation in
 * `real-runner.ts` (excluded from coverage).
 */
export interface DuckdbRunner {
  /**
   * Executes one or more SQL statements.  Stdout is captured and returned
   * verbatim.  Throws if the process exits non-zero.
   */
  execute(sql: string): Promise<string>;
  /** Convenience: COPY a query to a JSON file and return the parsed array. */
  queryJson<T = Record<string, unknown>>(sql: string): Promise<readonly T[]>;
}
