import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/auth/AuthProvider.jsx';
import AppRouter from './app/router/AppRouter.jsx';
import { OutboxProvider } from './app/offline/OutboxProvider.jsx';
import PwaStatus from './components/pwa/PwaStatus.jsx';

export default function App() {
  return <BrowserRouter><AuthProvider><OutboxProvider><PwaStatus><AppRouter /></PwaStatus></OutboxProvider></AuthProvider></BrowserRouter>;
}
