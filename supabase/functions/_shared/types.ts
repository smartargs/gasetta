export interface GhUser {
  login: string;
  id: number;
  type?: string;
}

export interface GhRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  archived: boolean;
  fork: boolean;
  pushed_at: string | null;
  updated_at: string | null;
}

export interface GhCommitAuthor {
  name?: string;
  email?: string;
  date?: string;
}

export interface GhCommit {
  sha: string;
  node_id: string;
  html_url: string;
  author: GhUser | null; // resolved GitHub user (nullable for non-user commits)
  committer: GhUser | null;
  commit: {
    message: string;
    author: GhCommitAuthor;
    committer?: GhCommitAuthor;
  };
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface GhRelease {
  id: number;
  node_id: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  author: GhUser | null;
}

export interface GhLabel {
  name: string;
  color?: string;
  description?: string | null;
}

// /repos/:owner/:repo/issues returns BOTH issues and PRs. The PR ones have a
// `pull_request` key with the PR URL set. We split into two lists at ingest.
export interface GhIssueOrPr {
  id: number;
  node_id: string;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  state_reason: string | null;
  user: GhUser | null;
  labels: GhLabel[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  pull_request?: {
    url: string;
    merged_at: string | null;
  };
}

// Detail fetch for PRs (extra fields not on the /issues list response).
export interface GhPullDetail {
  id: number;
  node_id: string;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: GhUser | null;
  labels: GhLabel[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merged: boolean;
  draft: boolean;
  base: { ref: string };
  head: { ref: string };
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
  requested_reviewers?: GhUser[];
}

export interface GhIssueComment {
  id: number;
  node_id: string;
  user: GhUser | null;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GhReview {
  id: number;
  node_id: string;
  user: GhUser | null;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  body: string | null;
  submitted_at: string | null;
}

export interface GhReviewComment {
  id: number;
  node_id: string;
  user: GhUser | null;
  body: string;
  path: string;
  position: number | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

// GraphQL — Discussions live here only.
export interface GqlDiscussion {
  id: string; // node_id
  number: number;
  title: string;
  body: string;
  url: string;
  upvoteCount: number;
  isAnswered: boolean | null;
  answerChosenAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { name: string };
  author: { login: string } | null;
  comments: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    totalCount: number;
    nodes: GqlDiscussionComment[];
  };
}

export interface GqlDiscussionComment {
  id: string;
  body: string;
  url: string;
  upvoteCount: number;
  isAnswer: boolean;
  createdAt: string;
  updatedAt: string;
  author: { login: string } | null;
  // Replies are flattened by depth=1 in our query; nested replies fetched in a follow-up if needed.
  replies?: {
    nodes: GqlDiscussionComment[];
  };
}
