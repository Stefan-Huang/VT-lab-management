import { SidebarProvider, SidebarInset } from '@client/src/components/ui/sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './components/AppSidebar';
import { TopBar } from './components/TopBar';
import { useAuth } from '@client/src/hooks/useAuth';
import { useTranslation } from '@client/src/stores/i18nStore';

export function AppLayout() {
  const { isLoading } = useAuth();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <SidebarProvider className="global-app-bg min-h-screen">
      <div className="bg-orb-2" />
      <div className="bg-shape bg-shape-1" />
      <div className="bg-shape bg-shape-2" />
      <div className="bg-shape bg-shape-3" />
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-[1400px] page-fade-in" key={pathname}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
