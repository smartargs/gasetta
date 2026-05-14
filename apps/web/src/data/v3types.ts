// v3 data shape — the flat list-of-threads model the new design consumes.
// Lives alongside the legacy types.ts (which the old loader still references
// during transition). After cleanup we can fold this into types.ts.

import type { FounderRecord, ItemType, Sentiment, SummaryStatus } from '../components/atoms';

export type Version = 'N3' | 'N4';
export type Momentum = 'surging' | 'active' | 'quiet' | 'dormant';

export interface CommitRow {
  sha: string;
  msg: string;
  author: string;
}

export interface Thread {
  id: string;
  type: ItemType;
  repo: string;
  number?: number;
  title: string;
  summary: string;
  state?: 'open' | 'closed' | 'draft' | 'changes-requested';
  consensusChip?: string | null;
  sentiment?: Sentiment | null;
  comments?: number;
  participants?: number;
  version?: Version | null;
  when: string;
  founder?: string | null;
  founderQuote?: string | null;
  summaryStatus?: SummaryStatus;
  keyPoints?: string[];
  decisions?: string[];
  isMerged?: boolean;
  isAnswered?: boolean;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  baseRef?: string;
  importance?: number;
  newCommentsSince?: number;
  // release-only
  tag?: string;
  // commit-rollup-only
  commits?: CommitRow[];
}

export interface RepoSummary {
  name: string;
  desc: string;
  stars: number;
  momentum: Momentum;
}

export interface TopContributor {
  login: string;
  name: string;
  initials: string;
  count: number;
  founder: boolean;
}

export interface ResolvedRow {
  id: string;
  title: string;
  outcome: 'Merged' | 'Resolved' | 'Decided' | 'Closed';
  when: string;
  daysAgo: number;
  repo: string;
  number?: number;
  oneLiner?: string;
  founder: boolean;
  founderLogin?: string;
}

export interface FounderActivityItem {
  login: string;
  threadId: string;
  where: string;
  whereTitle: string;
  quote: string;
  when: string;
}

export interface LiveStats {
  openIssues: number;
  openPRs: number;
  founderCommentsWeek: number;
  releasesMonth: number;
  n4Share: number;
  updatedRelative: string;
}

export interface VersionActivityBucket {
  total: number;
  issues: number;
  prs: number;
  discussions: number;
  releases: number;
}

export interface VersionActivity {
  windowLabel: string;
  n3: VersionActivityBucket;
  n4: VersionActivityBucket;
}

export interface N4Feature {
  title: string;
  oneLiner: string;
  status: string;
  repo: string;
  threadId: string;
}

export interface GasettaV3 {
  threads: Thread[];
  repos: RepoSummary[];
  topContributors: TopContributor[];
  recentlyResolved: ResolvedRow[];
  founderActivity: FounderActivityItem[];
  stats: LiveStats;
  founders: Record<string, FounderRecord>;
  versionActivity: VersionActivity;
  n4Features: N4Feature[];
}
