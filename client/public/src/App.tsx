import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import UserDashboardPage from "@/pages/user";
import FilesPage from "@/pages/files";
import DocumentsPage from "@/pages/documents";
import ConvertPage from "@/pages/convert";
import SharedPage from "@/pages/shared";
import AnalyticsPage from "@/pages/analytics";
import SearchPage from "@/pages/search";
import AdminDashboard from "@/pages/admin/index";
import UserManagementPage from "@/pages/admin/users";
import AuditLogsPage from "@/pages/admin/audit";
import ActivityTrackingPage from "@/pages/admin/activity";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ORG_ADMIN" || user?.role === "MANAGER";
  if (!isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  return <Component />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRoutes() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/dashboard">
          <ProtectedRoute component={DashboardPage} />
        </Route>
        <Route path="/user">
          <ProtectedRoute component={UserDashboardPage} />
        </Route>
        <Route path="/files">
          <ProtectedRoute component={FilesPage} />
        </Route>
        <Route path="/documents">
          <ProtectedRoute component={DocumentsPage} />
        </Route>
        <Route path="/convert">
          <ProtectedRoute component={ConvertPage} />
        </Route>
        <Route path="/shared">
          <ProtectedRoute component={SharedPage} />
        </Route>
        <Route path="/analytics">
          <AdminRoute component={AnalyticsPage} />
        </Route>
        <Route path="/search">
          <AdminRoute component={SearchPage} />
        </Route>
        <Route path="/admin" nest>
          <Switch>
            <Route path="/">
              <AdminRoute component={AdminDashboard} />
            </Route>
            <Route path="/users">
              <AdminRoute component={UserManagementPage} />
            </Route>
            <Route path="/audit">
              <AdminRoute component={AuditLogsPage} />
            </Route>
            <Route path="/activity">
              <AdminRoute component={ActivityTrackingPage} />
            </Route>
            <Route path="/settings">
              <AdminRoute component={AdminDashboard} />
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </MainLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading UDAAN...</p>
        </div>
      </div>
    );
  }

  if (location === "/" && isAuthenticated) {
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ORG_ADMIN" || user?.role === "MANAGER";
    return <Redirect to={isAdmin ? "/admin" : "/user"} />;
  }

  if (location === "/" && !isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/:rest*">
        <AuthenticatedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
