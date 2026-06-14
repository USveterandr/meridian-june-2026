/**
 * Sweeps subscriptions whose `current_period_end` has passed, cancels them,
 * and reverts any role granted by the plan back to the user's role from
 * before they subscribed (only if it hasn't been changed since).
 */
export async function expireSubscriptions(db: D1Database): Promise<{ expired: number; downgraded: number }> {
  const now = new Date().toISOString();

  const { results } = await db
    .prepare(
      `SELECT s.id, s.user_id, s.previous_role, p.grants_role
       FROM subscriptions s JOIN plans p ON s.plan_id = p.id
       WHERE s.status IN ('trialing','active')
         AND s.current_period_end IS NOT NULL
         AND s.current_period_end < ?`
    )
    .bind(now)
    .all<{ id: number; user_id: number; previous_role: string | null; grants_role: string | null }>();

  const rows = results ?? [];
  let downgraded = 0;

  for (const row of rows) {
    await db.prepare(`UPDATE subscriptions SET status = 'canceled' WHERE id = ?`).bind(row.id).run();

    if (row.grants_role && row.previous_role) {
      const result = await db
        .prepare(`UPDATE users SET role = ? WHERE id = ? AND role = ?`)
        .bind(row.previous_role, row.user_id, row.grants_role)
        .run();
      if (result.meta.rows_written > 0) downgraded++;
    }
  }

  return { expired: rows.length, downgraded };
}
