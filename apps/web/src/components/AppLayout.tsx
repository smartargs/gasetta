import { Outlet } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { TopBar } from './TopBar';

export function AppLayout() {
  const D = useGasettaV3();
  return (
    <div className="app">
      <TopBar updatedRelative={D.stats.updatedRelative} />
      <Outlet />
    </div>
  );
}
