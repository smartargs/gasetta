import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { FeedPage } from './pages/FeedPage';
import { ThreadPage } from './pages/ThreadPage';
import { ReposPage } from './pages/ReposPage';
import { RepoPage } from './pages/RepoPage';
import { FoundersPage } from './pages/FoundersPage';
import { VersionsPage } from './pages/VersionsPage';
import { ArchivePage } from './pages/ArchivePage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';

const errorElement = <NotFoundPage />;

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement,
    children: [
      { path: '/', element: <FeedPage /> },
      { path: '/threads/:id', element: <ThreadPage /> },
      { path: '/repos', element: <ReposPage /> },
      { path: '/repos/:name', element: <RepoPage /> },
      { path: '/founders', element: <FoundersPage /> },
      { path: '/versions', element: <VersionsPage /> },
      { path: '/archive', element: <ArchivePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
