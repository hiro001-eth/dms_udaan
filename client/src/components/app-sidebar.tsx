import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  RefreshCw,
  Users,
  Activity,
  Share2,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/app_logo-removebg-preview_(1)_1765298325671.png";

const userMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "STAFF", "VIEWER"] },
  { title: "My Files", url: "/files", icon: FolderOpen, roles: ["SUPER_ADMIN"] },
  { title: "Documents", url: "/documents", icon: FileText, roles: ["SUPER_ADMIN"] },
  { title: "Convert Files", url: "/convert", icon: RefreshCw, roles: ["SUPER_ADMIN"] },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["SUPER_ADMIN"] },
  { title: "Shared with Me", url: "/shared", icon: Share2, roles: ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "STAFF", "VIEWER"] },
];

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"] },
  { title: "User Management", url: "/admin/users", icon: Users, roles: ["SUPER_ADMIN"] },
  { title: "Audit Logs", url: "/admin/audit", icon: Activity, roles: ["SUPER_ADMIN", "ORG_ADMIN"] },
  { title: "Activity Tracking", url: "/admin/activity", icon: Shield, roles: ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"] },
  { title: "Settings", url: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN", "ORG_ADMIN"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ORG_ADMIN" || user?.role === "MANAGER";
  const menuItems = location.startsWith("/admin") 
    ? adminMenuItems.filter(item => item.roles.includes(user?.role || ""))
    : userMenuItems.filter(item => item.roles.includes(user?.role || ""));

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src={logoUrl} alt="UDAAN Logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold gradient-text">UDAAN</h1>
            <p className="text-xs text-muted-foreground">Data Management</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            {location.startsWith("/admin") ? "Administration" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/dashboard" && item.url !== "/admin" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      data-active={isActive}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && !location.startsWith("/admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin" data-testid="link-admin-panel">
                      <Shield className="h-5 w-5" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {location.startsWith("/admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              User Area
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard" data-testid="link-user-dashboard">
                      <FolderOpen className="h-5 w-5" />
                      <span>My Files</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user ? getInitials(user.firstName, user.lastName) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user ? `${user.firstName} ${user.lastName}` : "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
