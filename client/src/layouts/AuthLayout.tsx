import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@client/src/components/ui/button';
import { Globe } from 'lucide-react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useEffect } from 'react';
import { useAuthStore } from '@client/src/stores/authStore';

export function AuthLayout() {
  const { t, lang, setLanguage } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/materials', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen flex-col auth-bg">
      <div className="bg-orb-2" />
      <div className="bg-shape bg-shape-1" />
      <div className="bg-shape bg-shape-2" />
      <div className="bg-shape bg-shape-3" />
      <div className="flex justify-end p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(lang === 'zh' ? 'en' : 'zh')}
          className="font-mono text-xs"
        >
          <Globe className="size-4 mr-1" />
           {lang === 'zh' ? t('auth.switchToEn') : t('auth.switchToZh')}
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <Outlet />
      </div>
    </div>
  );
}
