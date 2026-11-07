import { useEffect } from 'react';
import { ThemeConfig } from './theme/ThemeConfig';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DEFAULT_SITE_NAME, resolveSiteName } from './utils/siteName';

function App() {
  useEffect(() => {
    document.title = DEFAULT_SITE_NAME;
    try {
      const saved = localStorage.getItem('beilo_general_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const siteName = resolveSiteName(settings.siteName);
        document.title = siteName;
        if (settings.siteName !== siteName) {
          localStorage.setItem('beilo_general_settings', JSON.stringify({ ...settings, siteName }));
        }
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <ThemeConfig>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </ThemeConfig>
  );
}

export default App;
