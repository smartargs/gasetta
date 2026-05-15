import ReactMarkdown from 'react-markdown';
import { Link as RouterLink } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const GITHUB_ORG = 'neo-project';

const markdownSanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'del',
    's',
    'sub',
    'sup',
    'kbd',
    'mark',
    'details',
    'summary',
    'ins',
    'u',
  ],
};

type MdNode = {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: MdNode[];
};

const MENTION_RE = /@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}))/g;
const ISSUE_REF_RE =
  /(?<![A-Za-z0-9_])(?:([A-Za-z0-9][-A-Za-z0-9]*)\/)?([A-Za-z0-9][-A-Za-z0-9._]*)?#(\d{1,7})(?!\d)/g;

export type ResolveIssueRef = (repo: string, num: number) => string | null;

function linkifyMentions(node: MdNode): void {
  if (!node.children) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const value = child.value;
      let lastIndex = 0;
      let matched = false;
      MENTION_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = MENTION_RE.exec(value)) !== null) {
        matched = true;
        if (m.index > lastIndex) {
          next.push({ type: 'text', value: value.slice(lastIndex, m.index) });
        }
        next.push({
          type: 'link',
          url: `https://github.com/${m[1]}`,
          title: null,
          children: [{ type: 'text', value: m[0] }],
        });
        lastIndex = MENTION_RE.lastIndex;
      }
      if (matched) {
        if (lastIndex < value.length) {
          next.push({ type: 'text', value: value.slice(lastIndex) });
        }
      } else {
        next.push(child);
      }
    } else {
      if (child.type !== 'inlineCode' && child.type !== 'code' && child.type !== 'link') {
        linkifyMentions(child);
      }
      next.push(child);
    }
  }
  node.children = next;
}

function remarkAtMentions() {
  return (tree: MdNode) => linkifyMentions(tree);
}

function makeIssueRefVisitor(defaultRepo: string | undefined, resolve: ResolveIssueRef | undefined) {
  function visit(node: MdNode): void {
    if (!node.children) return;
    const next: MdNode[] = [];
    for (const child of node.children) {
      if (child.type === 'text' && typeof child.value === 'string') {
        const value = child.value;
        let lastIndex = 0;
        let matched = false;
        ISSUE_REF_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = ISSUE_REF_RE.exec(value)) !== null) {
          const owner = m[1];
          const repoCap = m[2];
          const num = Number(m[3]);
          const label = m[0];
          let repo: string | null = null;
          let org = GITHUB_ORG;
          if (owner && repoCap) {
            org = owner;
            repo = repoCap;
          } else if (repoCap) {
            repo = repoCap;
          } else {
            repo = defaultRepo ?? null;
          }
          if (!repo) {
            ISSUE_REF_RE.lastIndex = m.index + label.length;
            continue;
          }
          matched = true;
          if (m.index > lastIndex) {
            next.push({ type: 'text', value: value.slice(lastIndex, m.index) });
          }
          let url: string | null = null;
          if (org === GITHUB_ORG && resolve) {
            url = resolve(repo, num);
          }
          if (!url) url = `https://github.com/${org}/${repo}/issues/${num}`;
          next.push({
            type: 'link',
            url,
            title: null,
            children: [{ type: 'text', value: label }],
          });
          lastIndex = ISSUE_REF_RE.lastIndex;
        }
        if (matched) {
          if (lastIndex < value.length) {
            next.push({ type: 'text', value: value.slice(lastIndex) });
          }
        } else {
          next.push(child);
        }
      } else {
        if (child.type !== 'inlineCode' && child.type !== 'code' && child.type !== 'link') {
          visit(child);
        }
        next.push(child);
      }
    }
    node.children = next;
  }
  return visit;
}

function remarkIssueRefs(defaultRepo: string | undefined, resolve: ResolveIssueRef | undefined) {
  const visit = makeIssueRefVisitor(defaultRepo, resolve);
  return () => (tree: MdNode) => visit(tree);
}

interface MarkdownProps {
  children: string;
  repo?: string;
  resolveIssueRef?: ResolveIssueRef;
}

export function Markdown({ children, repo, resolveIssueRef }: MarkdownProps) {
  const issueRefPlugin = remarkIssueRefs(repo, resolveIssueRef);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkAtMentions, issueRefPlugin]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
      components={{
        a: ({ href, children: c }) => {
          if (href && href.startsWith('/')) {
            return <RouterLink to={href}>{c}</RouterLink>;
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {c}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
