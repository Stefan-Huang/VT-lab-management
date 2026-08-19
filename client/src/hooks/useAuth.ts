import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@client/src/stores/authStore';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getMe } from '@client/src/api/auth';

const PUBLIC_PATHS = ['/login'];

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      try {
        const result = await getMe();
        if (result?.user) {
          setUser(result.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        logger.debug('Auth check failed', err);
        setUser(null);
      }
    }
    checkAuth();
  }, [setUser]);

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));
    if (!user && !isPublic) {
      navigate('/login', { replace: true });
    } else if (user && location.pathname === '/login') {
      navigate('/materials', { replace: true });
    }
  }, [user, isLoading, location.pathname, navigate]);

  return { user, isLoading, logout };
}
