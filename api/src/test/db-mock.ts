import { DatabaseSync } from 'node:sqlite';

export class MockD1PreparedStatement {
  constructor(private stmt: any, private params: unknown[] = []) {}

  bind(...params: unknown[]): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.stmt, params);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const row = this.stmt.get(...this.params);
    if (!row) return null;
    if (colName !== undefined) {
      return (row as any)[colName] ?? null;
    }
    return row as T;
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
    const results = this.stmt.all(...this.params);
    // Remove prototype wrappers so results behave like raw JSON objects
    const cleanResults = results.map((row: any) => ({ ...row }));
    return {
      results: cleanResults,
      success: true,
    };
  }

  async run(): Promise<{ success: boolean; meta: { rows_written: number; last_row_id: number } }> {
    const result = this.stmt.run(...this.params);
    return {
      success: true,
      meta: {
        rows_written: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

export class MockD1Database {
  constructor(private db: DatabaseSync) {}

  prepare(sql: string): MockD1PreparedStatement {
    // Hono/D1 allows binding values with prepare() in some APIs, but Meridian uses .bind().
    // We just prepare the SQLite statement.
    const stmt = this.db.prepare(sql);
    return new MockD1PreparedStatement(stmt);
  }
}
