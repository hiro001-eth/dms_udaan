import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  FileText, 
  FolderOpen, 
  Upload, 
  Clock, 
  TrendingUp,
  Share2,
  RefreshCw,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import type { Document, AuditLog } from "@shared/schema";

interface DashboardStats {
  totalDocuments: number;
  totalFolders: number;
  recentUploads: number;
  sharedItems: number;
}

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
  trend, 
  color 
}: { 
  title: string; 
  value: number | string; 
  icon: typeof FileText; 
  trend?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-visible">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
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

function QuickAction({ 
  title, 
  description, 
  icon: Icon, 
  href,
  color
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

function RecentDocumentRow({ document }: { document: Document }) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "bg-destructive";
    if (mimeType.includes("image")) return "bg-accent";
    if (mimeType.includes("word") || mimeType.includes("document")) return "bg-primary";
    return "bg-muted";
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover-elevate cursor-pointer" data-testid={`doc-row-${document.id}`}>
      <div className={`p-2 rounded-lg ${getFileIcon(document.mimeType)}`}>
        <FileText className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{document.title}</p>
        <p className="text-xs text-muted-foreground">
          {(document.sizeBytes / 1024).toFixed(1)} KB
        </p>
      </div>
      <Badge variant="secondary" className="text-xs">
        {document.status}
      </Badge>
    </div>
  );
}

function ActivityRow({ log }: { log: AuditLog }) {
  const getActionColor = (action: string) => {
    switch (action) {
      case "UPLOAD": return "text-accent";
      case "DOWNLOAD": return "text-primary";
      case "DELETE": return "text-destructive";
      case "SHARE": return "text-chart-3";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="flex items-start gap-3 p-3" data-testid={`activity-${log.id}`}>
      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={`font-medium ${getActionColor(log.action)}`}>{log.action}</span>
          {" "}on {log.entityType.toLowerCase()}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(log.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentDocs, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", { limit: 5 }],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit/logs", { limit: 8 }],
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
          <h1 className="text-3xl font-bold" data-testid="text-welcome">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your documents today.
          </p>
        </div>
        <Link href="/files">
          <Button className="gradient-bg text-white" data-testid="button-upload-new">
            <Plus className="h-4 w-4 mr-2" />
            Upload New
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
              title="Total Documents"
              value={stats?.totalDocuments ?? 0}
              icon={FileText}
              trend="+12% this week"
              color="gradient-bg"
            />
            <StatCard
              title="Folders"
              value={stats?.totalFolders ?? 0}
              icon={FolderOpen}
              color="bg-accent"
            />
            <StatCard
              title="Recent Uploads"
              value={stats?.recentUploads ?? 0}
              icon={Upload}
              trend="Last 7 days"
              color="bg-chart-3"
            />
            <StatCard
              title="Shared Items"
              value={stats?.sharedItems ?? 0}
              icon={Share2}
              color="bg-destructive"
            />
          </>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          title="Upload Files"
          description="Add new documents"
          icon={Upload}
          href="/files"
          color="gradient-bg"
        />
        <QuickAction
          title="Convert Files"
          description="PDF, DOCX, JPG..."
          icon={RefreshCw}
          href="/convert"
          color="bg-accent"
        />
        <QuickAction
          title="Create Folder"
          description="Organize your files"
          icon={FolderOpen}
          href="/files"
          color="bg-chart-3"
        />
        <QuickAction
          title="Share Files"
          description="Generate share codes"
          icon={Share2}
          href="/shared"
          color="bg-destructive"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg">Recent Documents</CardTitle>
                <CardDescription>Your latest uploaded files</CardDescription>
              </div>
              <Link href="/documents">
                <Button variant="ghost" size="sm" data-testid="link-view-all-docs">
                  View All
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {docsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : recentDocs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents yet</p>
                <Link href="/files">
                  <Button variant="link" className="mt-2">Upload your first file</Button>
                </Link>
              </div>
            ) : (
              recentDocs?.map((doc) => (
                <RecentDocumentRow key={doc.id} document={doc} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Your action history</CardDescription>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {activityLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-2 w-2 rounded-full mt-2" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : recentActivity?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              recentActivity?.slice(0, 8).map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
