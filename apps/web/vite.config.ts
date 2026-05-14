import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Hard-dedupe: stop Vite's pre-bundler from inlining a second React copy
    // into deps like @tanstack/react-query. Without this, hooks called by
    // those libs run against a different React instance than the app tree
    // and useEffect returns null.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', '@supabase/supabase-js'],
  },
});
