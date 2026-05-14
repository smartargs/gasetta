import { Outlet } from 'react-router-dom';
import { useGasettaV3 } from '../lib/v3Context';
import { TopBar } from './TopBar';
import { Footer } from './Footer';

export function AppLayout() {
  const D = useGasettaV3();
  return (
    <div className="app">
      <TopBar updatedRelative={D.stats.updatedRelative} />
      <Outlet />
      <Footer />
    </div>
  );
}
