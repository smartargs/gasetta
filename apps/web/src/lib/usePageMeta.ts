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
