// Founder / core / community classification.
//
// Loaded once at the top of each run into a Map<login, role>.
// `lookupRole(login)` is called for every author we encounter while ingesting;
// the matching row gets is_founder + role set, and the parent thread gets
// founder_involved=true if *any* comment/review author is a founder.
//
// "Marker, not filter" — we never skip ingesting non-founders. See
// ARCHITECTURE.md §6.

import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'founder' | 'core' | 'community';

export interface FoundersIndex {
  lookup(login: string | null | undefined): Role;
  isFounder(login: string | null | undefined): boolean;
}

export async function loadFoundersIndex(db: SupabaseClient): Promise<FoundersIndex> {
  const { data, error } = await db
    .from('contributors')
    .select('github_login, role');
  if (error) throw new Error(`load contributors: ${error.message}`);

  const byLogin = new Map<string, Role>();
  for (const r of data ?? []) {
    if (r.github_login) {
      byLogin.set(r.github_login.toLowerCase(), r.role as Role);
    }
  }

  return {
    lookup(login) {
      if (!login) return 'community';
      return byLogin.get(login.toLowerCase()) ?? 'community';
    },
    isFounder(login) {
      if (!login) return false;
      return byLogin.get(login.toLowerCase()) === 'founder';
    },
  };
}

/**
 * Decide whether *any* of the participants on a thread is a founder.
 * Includes the author + every comment/review author. Used to set
 * founder_involved on the parent issue / PR / discussion.
 */
export function anyFounder(
  index: FoundersIndex,
  ...logins: Array<string | null | undefined>
): boolean {
  return logins.some((l) => index.isFounder(l));
}
