import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileText,
  Folder,
  HardDrive,
  Share2,
  Upload,
  Download,
  RefreshCw,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalDocuments: number;
    totalFolders: number;
    storageUsedMB: number;
    activeShares: number;
  };
  activityLast7Days: { date: string; uploads: number; conversions: number; downloads: number }[];
  topUsers: { id: string; username: string; actionsCount: number }[];
  fileTypeDistribution: { mimeType: string; count: number }[];
  recentActivity: {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }[];
}

const COLORS = ["#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6", "#ef4444"];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  description?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend.positive ? "text-green-500" : "text-red-500"}`}>
                <TrendingUp className={`h-3 w-3 ${!trend.positive && "rotate-180"}`} />
                {trend.value}% from last week
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMimeType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "text/plain": "Text",
    "text/csv": "CSV",
  };
  return typeMap[mimeType] || mimeType.split("/").pop()?.toUpperCase() || "Unknown";
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  switch (action) {
    case "UPLOAD":
    case "CREATE":
      return "default";
    case "DELETE":
      return "destructive";
    case "CONVERT":
    case "DOWNLOAD":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load analytics data</p>
      </div>
    );
  }

  const { overview, activityLast7Days, fileTypeDistribution, recentActivity } = data || {
    overview: { totalUsers: 0, totalDocuments: 0, totalFolders: 0, storageUsedMB: 0, activeShares: 0 },
    activityLast7Days: [],
    fileTypeDistribution: [],
    recentActivity: [],
  };

  const chartData = activityLast7Days.map((day) => ({
    ...day,
    date: format(new Date(day.date), "MMM d"),
  }));

  const pieData = fileTypeDistribution.map((item) => ({
    name: formatMimeType(item.mimeType),
    value: item.count,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor system usage and performance metrics</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Real-time
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Users" value={overview.totalUsers} icon={Users} />
        <StatCard title="Documents" value={overview.totalDocuments} icon={FileText} />
        <StatCard title="Folders" value={overview.totalFolders} icon={Folder} />
        <StatCard
          title="Storage Used"
          value={`${overview.storageUsedMB} MB`}
          icon={HardDrive}
          description="Total file storage"
        />
        <StatCard title="Active Shares" value={overview.activeShares} icon={Share2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activity (Last 7 Days)
            </CardTitle>
            <CardDescription>Daily uploads, conversions, and downloads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="convertGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    stroke="#8b5cf6"
                    fill="url(#uploadGradient)"
                    strokeWidth={2}
                    name="Uploads"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke="#ec4899"
                    fill="url(#convertGradient)"
                    strokeWidth={2}
                    name="Conversions"
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke="#14b8a6"
                    fill="url(#downloadGradient)"
                    strokeWidth={2}
                    name="Downloads"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-muted-foreground">Uploads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-sm text-muted-foreground">Conversions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <span className="text-sm text-muted-foreground">Downloads</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              File Type Distribution
            </CardTitle>
            <CardDescription>Documents by file type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No documents yet
                </div>
              )}
            </div>
            {pieData.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system events and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  data-testid={`activity-log-${log.id}`}
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    {log.action === "UPLOAD" && <Upload className="h-4 w-4 text-primary" />}
                    {log.action === "DOWNLOAD" && <Download className="h-4 w-4 text-primary" />}
                    {log.action === "CONVERT" && <RefreshCw className="h-4 w-4 text-primary" />}
                    {!["UPLOAD", "DOWNLOAD", "CONVERT"].includes(log.action) && (
                      <Activity className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                        {log.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{log.entityType}</span>
                    </div>
                    {log.metadata && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {JSON.stringify(log.metadata).substring(0, 60)}...
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
