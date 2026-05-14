// Tiny client-side meta updater. Keeps `document.title` and the four meta
// tags that matter (description, og:title, og:description, twitter:title,
// twitter:description) in sync with whatever the current route wants.
//
// Caveat: crawlers that don't execute JS (Slack, default Twitter, etc.)
// will only see the initial markup in index.html — they won't pick up
// per-thread titles or descriptions. For real per-link previews we'd need
// SSR or a prerender pass. This hook is good enough for browser tabs,
// history, accessibility, and the JS-capable share targets (Discord,
// modern Twitter, etc.).

import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description?: string;
}

function setMeta(selector: string, value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

export function usePageMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="twitter:description"]', description);
    }
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[name="twitter:title"]', title);
    return () => {
      document.title = previousTitle;
    };
  }, [title, description]);
}
