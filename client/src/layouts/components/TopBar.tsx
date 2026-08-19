import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import { Button } from '@client/src/components/ui/button';
import { SidebarTrigger } from '@client/src/components/ui/sidebar';
import { User, LogOut, Globe, Key } from 'lucide-react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useApiConfigStore } from '@client/src/stores/apiConfigStore';
import { useAuthStore } from '@client/src/stores/authStore';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '@client/src/api/auth';

export function TopBar() {
  const { t, lang, setLanguage } = useTranslation();
  const { preferred } = useApiConfigStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      logger.error('Logout failed', err);
    }
    logout();
    navigate('/login', { replace: true });
  };

  return (
      <header className="flex h-14 items-center justify-between border-b border-border/60 bg-card px-4 glass-topbar z-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <Key className="size-3.5" />
          <span className="font-mono">
            {preferred ? t('topbar.apiPersonal') : t('topbar.apiGlobal')}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(lang === 'zh' ? 'en' : 'zh')}
          className="font-mono text-xs"
        >
          <Globe className="size-4 mr-1" />
          {lang === 'zh' ? 'EN' : '中'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <User className="size-3.5" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {user?.displayName || user?.username || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              {user?.role === 'admin' ? t('topbar.roleAdmin') : t('topbar.roleUser')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="size-4 mr-2" />
              {t('topbar.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
