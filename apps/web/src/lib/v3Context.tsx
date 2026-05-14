import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadGasettaV3, V3_FALLBACK } from './v3Loader';
import type { GasettaV3 } from '../data/v3types';

const Ctx = createContext<GasettaV3>(V3_FALLBACK);

export function V3Provider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['gasetta-v3'],
    queryFn: loadGasettaV3,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return <Ctx.Provider value={data ?? V3_FALLBACK}>{children}</Ctx.Provider>;
}

export function useGasettaV3(): GasettaV3 {
  return useContext(Ctx);
}
