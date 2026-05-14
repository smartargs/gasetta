import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadGasettaV3, V3_FALLBACK } from './v3Loader';
import type { GasettaV3 } from '../data/v3types';

const Ctx = createContext<GasettaV3>(V3_FALLBACK);
// Separate context for fetch status so pages can distinguish "not found"
// from "still loading". Without this, a hard-refresh on /threads/foo
// briefly renders the empty fallback and the consumer flashes "Thread
// not found" before the real data arrives.
const LoadingCtx = createContext<boolean>(true);

export function V3Provider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['gasetta-v3'],
    queryFn: loadGasettaV3,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return (
    <Ctx.Provider value={data ?? V3_FALLBACK}>
      <LoadingCtx.Provider value={isLoading}>{children}</LoadingCtx.Provider>
    </Ctx.Provider>
  );
}

export function useGasettaV3(): GasettaV3 {
  return useContext(Ctx);
}

export function useGasettaLoading(): boolean {
  return useContext(LoadingCtx);
}
