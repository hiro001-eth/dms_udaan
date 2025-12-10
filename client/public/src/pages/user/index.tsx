import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  FileText,
  Upload,
  Share2,
  Clock,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { AuditLog, ShareCode } from "@shared/schema";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
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
  color,
}: {
  title: string;
  value: number | string;
  icon: typeof FileText;
  color: string;
}) {
  return (
    <Card className="relative overflow-visible">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  title,
  description,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: typeof Upload;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover-elevate cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityRow({ log }: { log: AuditLog }) {
  return (
    <div className="flex items-start gap-3 p-3 border-b last:border-b-0" data-testid={`user-activity-${log.id}`}>
      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {log.action}
          {log.entityType && (
            <span className="text-muted-foreground font-normal"> on {log.entityType.toLowerCase()}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(log.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const { user } = useAuth();

  const {
    data: logs,
    isLoading: logsLoading,
  } = useQuery<AuditLog[]>({
    queryKey: ["user-audit-logs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) params.set("userId", user.id);
      params.set("limit", "100");
      const res = await apiRequest("GET", `/api/audit/logs?${params.toString()}`);
      return res.json();
    },
  });

  const {
    data: shares,
    isLoading: sharesLoading,
  } = useQuery<ShareCode[]>({
    queryKey: ["user-share-codes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shares/created");
      return res.json();
    },
  });

  const totalUploads = logs?.filter((l) => l.action === "UPLOAD").length ?? 0;
  const totalDownloads = logs?.filter((l) => l.action === "DOWNLOAD" || l.action === "BATCH_DOWNLOAD").length ?? 0;
  const totalConversions =
    logs?.filter((l) =>
      [
        "CONVERT",
        "MERGE",
        "SPLIT",
        "COMPRESS",
        "ROTATE",
        "WATERMARK",
        "BATCH_CONVERT",
        "BATCH_RESIZE",
        "BATCH_WATERMARK",
        "BATCH_ROTATE",
        "BATCH_PAGE_NUMBERS",
      ].includes(l.action as string),
    ).length ?? 0;
  const activeShares = shares?.filter((s) => s.isActive).length ?? 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">
            My Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Personal activity and file stats for {user?.firstName} {user?.lastName}.
          </p>
        </div>
        <Link href="/files">
          <Button className="gradient-bg text-white">
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {logsLoading || sharesLoading ? (
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
              title="My Uploads"
              value={totalUploads}
              icon={Upload}
              color="gradient-bg"
            />
            <StatCard
              title="My Downloads"
              value={totalDownloads}
              icon={FileText}
              color="bg-accent"
            />
            <StatCard
              title="Conversions"
              value={totalConversions}
              icon={RefreshCw}
              color="bg-chart-3"
            />
            <StatCard
              title="Active Shares"
              value={activeShares}
              icon={Share2}
              color="bg-destructive"
            />
          </>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Your latest actions in UDAAN</CardDescription>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              {logsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : !logs || logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No recent activity yet</p>
                </div>
              ) : (
                logs.slice(0, 10).map((log) => <ActivityRow key={log.id} log={log} />)
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">My Share Links</CardTitle>
              <CardDescription>Links you've generated to share files or folders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sharesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : !shares || shares.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Share2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No share links created yet</p>
                  <p className="text-xs">Create a share link from the My Files page.</p>
                </div>
              ) : (
                shares.slice(0, 6).map((share) => (
                  <div key={share.id} className="flex items-center gap-3 p-2 rounded-lg hover-elevate">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Share2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{share.code}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {share.permission} · {share.expiresAt ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}` : "No expiry"}
                      </p>
                    </div>
                    <Badge variant={share.isActive ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                      {share.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <motion.div variants={itemVariants} className="grid gap-3">
            <QuickAction
              title="Upload Files"
              description="Add new documents to your workspace"
              icon={Upload}
              href="/files"
              color="gradient-bg"
            />
            <QuickAction
              title="View Shared With Me"
              description="Access files others shared with you"
              icon={Share2}
              href="/shared"
              color="bg-accent"
            />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
