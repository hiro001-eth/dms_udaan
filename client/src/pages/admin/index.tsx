import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Users, 
  FileText, 
  FolderOpen, 
  Activity, 
  TrendingUp,
  Shield,
  Clock,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { User, AuditLog } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  totalFolders: number;
  storageUsedMB: number;
  recentLogins: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color,
  description 
}: { 
  title: string; 
  value: number | string; 
  icon: typeof Users; 
  trend?: string;
  color: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-accent" />
                <span className="text-xs text-accent">{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserRow({ user }: { user: User }) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover-elevate">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
          {getInitials(user.firstName, user.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <Badge variant={user.isActive ? "default" : "secondary"}>
        {user.isActive ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

function ActivityRow({ log }: { log: AuditLog }) {
  const getActionColor = (action: string) => {
    switch (action) {
      case "LOGIN": return "text-accent";
      case "UPLOAD": return "text-primary";
      case "DELETE": return "text-destructive";
      case "SHARE": return "text-chart-3";
      case "CREATE_USER": return "text-chart-4";
      default: return "text-muted-foreground";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN": return Shield;
      case "DELETE": return AlertTriangle;
      default: return Activity;
    }
  };

  const ActionIcon = getActionIcon(log.action);

  return (
    <div className="flex items-start gap-3 p-3">
      <div className={`p-1.5 rounded-full ${getActionColor(log.action)} bg-current/10`}>
        <ActionIcon className={`h-3 w-3 ${getActionColor(log.action)}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={`font-medium ${getActionColor(log.action)}`}>{log.action}</span>
          {" "}{log.entityType.toLowerCase()}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(log.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: recentUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit/logs"],
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor system activity and manage users
          </p>
        </div>
        <Link href="/admin/users">
          <Button className="gradient-bg text-white" data-testid="button-manage-users">
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={Users}
              trend={`${stats?.activeUsers ?? 0} active`}
              color="gradient-bg"
            />
            <StatCard
              title="Documents"
              value={stats?.totalDocuments ?? 0}
              icon={FileText}
              color="bg-accent"
            />
            <StatCard
              title="Folders"
              value={stats?.totalFolders ?? 0}
              icon={FolderOpen}
              color="bg-chart-3"
            />
            <StatCard
              title="Storage Used"
              value={`${stats?.storageUsedMB ?? 0} MB`}
              icon={Activity}
              color="bg-destructive"
            />
          </>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg">Recent Users</CardTitle>
                <CardDescription>Latest user accounts</CardDescription>
              </div>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" data-testid="link-all-users">
                  View All
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {usersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            ) : recentUsers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users yet</p>
              </div>
            ) : (
              recentUsers?.map((user) => (
                <UserRow key={user.id} user={user} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>System audit logs</CardDescription>
              </div>
              <Link href="/admin/audit">
                <Button variant="ghost" size="sm" data-testid="link-all-activity">
                  View All
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {activityLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : recentActivity?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity?.slice(0, 8).map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Link href="/admin/users">
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">User Management</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin/audit">
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-accent" />
                    <p className="font-medium text-sm">Audit Logs</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin/activity">
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-chart-3" />
                    <p className="font-medium text-sm">Activity Tracking</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin/settings">
                <Card className="hover-elevate cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="font-medium text-sm">Security Settings</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
