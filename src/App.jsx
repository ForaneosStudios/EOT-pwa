import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/auth/AuthProvider.jsx';
import AppRouter from './app/router/AppRouter.jsx';

export default function App() {
  return <BrowserRouter><AuthProvider><AppRouter /></AuthProvider></BrowserRouter>;
}
