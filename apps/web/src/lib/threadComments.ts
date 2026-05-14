// Per-thread raw-comments fetch. Lazy — only the ThreadPage uses it.

import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { ItemType } from '../components/atoms';
import { FOUNDERS } from './v3Loader';

export interface RawComment {
  login: string;
  name: string;
  initials: string;
  when: string;
  body: string;
  role: 'founder' | 'core' | 'community';
  founder: boolean;
  isAnswer?: boolean;
  upvotes?: number;
}

function relTime(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = ms / 60_000;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}

function displayLogin(login: string | null): { name: string; initials: string } {
  if (!login) return { name: 'Unknown', initials: '??' };
  const f = FOUNDERS[login];
  if (f) return { name: f.name, initials: f.initials };
  return { name: login, initials: login.slice(0, 2).toUpperCase() };
}

function commentsTableFor(type: ItemType): {
  table: 'issue_comments' | 'pr_comments' | 'discussion_comments';
  parentTable: 'issues' | 'pull_requests' | 'discussions';
  parentFk: 'issue_id' | 'pr_id' | 'discussion_id';
} | null {
  if (type === 'issue') {
    return { table: 'issue_comments', parentTable: 'issues', parentFk: 'issue_id' };
  }
  if (type === 'pr') {
    return { table: 'pr_comments', parentTable: 'pull_requests', parentFk: 'pr_id' };
  }
  if (type === 'discussion') {
    return { table: 'discussion_comments', parentTable: 'discussions', parentFk: 'discussion_id' };
  }
  return null;
}

export async function fetchThreadComments(
  repo: string,
  type: ItemType,
  number: number,
): Promise<RawComment[]> {
  const map = commentsTableFor(type);
  if (!map) return [];

  // Two-step: repo → parent → comments. Could be one join via PostgREST,
  // but the two-step is cheaper and easier to type-check.
  const repoRow = await supabase
    .from('repos')
    .select('id')
    .eq('name', repo)
    .maybeSingle<{ id: number }>();
  if (repoRow.error || !repoRow.data) return [];

  const parent = await supabase
    .from(map.parentTable)
    .select('id')
    .eq('repo_id', repoRow.data.id)
    .eq('number', number)
    .maybeSingle<{ id: number }>();
  if (parent.error || !parent.data) return [];

  const selectCols =
    type === 'discussion'
      ? 'author_login, body, created_at_gh, role, is_answer, upvotes'
      : 'author_login, body, created_at_gh, role';

  const commentsRes = await supabase
    .from(map.table)
    .select(selectCols)
    .eq(map.parentFk, parent.data.id)
    .order('created_at_gh', { ascending: true })
    .returns<
      Array<{
        author_login: string | null;
        body: string;
        created_at_gh: string | null;
        role: 'founder' | 'core' | 'community' | null;
        is_answer?: boolean;
        upvotes?: number;
      }>
    >();
  if (commentsRes.error) {
    console.warn(`fetchThreadComments(${repo}/${type}/${number}):`, commentsRes.error.message);
    return [];
  }

  return (commentsRes.data ?? []).map((c) => {
    const { name, initials } = displayLogin(c.author_login);
    const role = c.role ?? 'community';
    return {
      login: c.author_login ?? 'unknown',
      name,
      initials,
      when: relTime(c.created_at_gh),
      body: c.body,
      role,
      founder: role === 'founder',
      isAnswer: c.is_answer,
      upvotes: c.upvotes,
    };
  });
}

export function useThreadComments(
  repo: string | null | undefined,
  type: ItemType | undefined,
  number: number | undefined,
) {
  return useQuery({
    queryKey: ['thread-comments', repo, type, number],
    queryFn: () =>
      repo && type && number != null ? fetchThreadComments(repo, type, number) : [],
    enabled: !!repo && !!type && number != null,
    staleTime: 60_000,
  });
}
