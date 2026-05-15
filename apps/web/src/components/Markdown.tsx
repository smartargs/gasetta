import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

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

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkAtMentions]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
      components={{
        a: ({ href, children: c }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {c}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
