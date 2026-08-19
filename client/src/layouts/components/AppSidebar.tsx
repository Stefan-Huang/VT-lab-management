import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@client/src/components/ui/sidebar';
import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  FlaskConical,
  FileText,
  Settings,
  Beaker,
} from 'lucide-react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { Image } from '@client/src/components/ui/image';

const navItems = [
  { path: '/materials', icon: Package, labelKey: 'nav.materials' },
  { path: '/purchase', icon: ShoppingCart, labelKey: 'nav.purchase' },
  { path: '/research', icon: FlaskConical, labelKey: 'nav.research' },
  { path: '/protocols', icon: FileText, labelKey: 'nav.protocols' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <Sidebar collapsible="icon" className="border-border glass-sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/materials">
                <div className="flex aspect-square size-9 items-center justify-center rounded-md overflow-hidden bg-primary/10 shrink-0">
                  <Image
                    src="https://aka.doubaocdn.com/s/veJvWcV9YW"
                    alt="VT Lab Logo"
                    className="size-9 object-cover"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold text-foreground" style={{ color: '#1a365d' }}>
                    VT Lab
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.path || pathname.startsWith(item.path + '/')}
                  >
                    <Link to={item.path}>
                      <item.icon className="size-4" />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="text-xs text-muted-foreground px-2 py-2 group-data-[collapsible=icon]:hidden">
              v1.0.0
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
