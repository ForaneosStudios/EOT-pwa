import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/auth/AuthProvider.jsx';
import AppRouter from './app/router/AppRouter.jsx';
import { OutboxProvider } from './app/offline/OutboxProvider.jsx';
import { LiveUpdatesProvider } from './app/live/LiveUpdatesProvider.jsx';
import PwaStatus from './components/pwa/PwaStatus.jsx';

export default function App() {
  return <BrowserRouter><AuthProvider><OutboxProvider><LiveUpdatesProvider><PwaStatus><AppRouter /></PwaStatus></LiveUpdatesProvider></OutboxProvider></AuthProvider></BrowserRouter>;
}
