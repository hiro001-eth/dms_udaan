import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  FolderOpen,
  Shield,
  Download,
  Upload,
  Trash2,
  Share2,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AuditLog, User as UserType } from "@shared/schema";

const actionIcons: Record<string, typeof Activity> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  UPLOAD: Upload,
  DOWNLOAD: Download,
  DELETE: Trash2,
  SHARE: Share2,
  CONVERT: RefreshCw,
  CREATE_USER: User,
  UPDATE_USER: User,
  CREATE_FOLDER: FolderOpen,
  DELETE_FOLDER: FolderOpen,
  UPDATE_METADATA: FileText,
  RESTORE: RefreshCw,
  PERMISSION_CHANGE: Shield,
};

const actionColors: Record<string, string> = {
  LOGIN: "text-accent bg-accent/10",
  LOGOUT: "text-muted-foreground bg-muted",
  UPLOAD: "text-primary bg-primary/10",
  DOWNLOAD: "text-chart-4 bg-chart-4/10",
  DELETE: "text-destructive bg-destructive/10",
  SHARE: "text-chart-3 bg-chart-3/10",
  CONVERT: "text-primary bg-primary/10",
  CREATE_USER: "text-accent bg-accent/10",
  UPDATE_USER: "text-chart-3 bg-chart-3/10",
  CREATE_FOLDER: "text-chart-3 bg-chart-3/10",
  DELETE_FOLDER: "text-destructive bg-destructive/10",
  UPDATE_METADATA: "text-primary bg-primary/10",
  RESTORE: "text-accent bg-accent/10",
  PERMISSION_CHANGE: "text-chart-3 bg-chart-3/10",
};

interface AuditLogWithUser extends AuditLog {
  user?: UserType;
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs, isLoading, refetch } = useQuery<AuditLogWithUser[]>({
    queryKey: ["/api/audit/logs"],
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionIcon = (action: string) => {
    return actionIcons[action] || Activity;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || "text-muted-foreground bg-muted";
  };

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const uniqueActions = Array.from(new Set(logs?.map((l) => l.action) || []));
  const uniqueEntities = Array.from(new Set(logs?.map((l) => l.entityType) || []));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all system activities and user actions
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-logs">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-logs"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40" data-testid="select-action-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40" data-testid="select-entity-filter">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {filteredLogs?.length ?? 0} entries
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border-l-2 border-muted">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-2">No logs found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || actionFilter !== "all" || entityFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Activity logs will appear here"}
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-1">
                  {filteredLogs?.map((log, index) => {
                    const ActionIcon = getActionIcon(log.action);
                    const colorClass = getActionColor(log.action);

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="relative pl-12 pr-4 py-4 hover:bg-muted/30 rounded-lg transition-colors"
                        data-testid={`log-entry-${log.id}`}
                      >
                        <div className={`absolute left-2 top-4 p-2 rounded-full ${colorClass}`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.action.replace("_", " ")}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {log.entityType}
                              </Badge>
                              {log.entityId && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{log.entityId.slice(0, 8)}
                                </span>
                              )}
                            </div>

                            <p className="text-sm">
                              <span className="font-medium">
                                {log.action.replace("_", " ").toLowerCase()}
                              </span>
                              {" on "}
                              <span className="text-muted-foreground">
                                {log.entityType.toLowerCase()}
                              </span>
                            </p>

                            {log.metadata && typeof log.metadata === "object" && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono overflow-hidden">
                                {String(JSON.stringify(log.metadata, null, 2)).slice(0, 100)}
                                {String(JSON.stringify(log.metadata)).length > 100 ? "..." : null}
                              </div>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              {formatTimestamp(log.createdAt)}
                            </p>
                            {log.ipAddress && (
                              <p className="text-xs text-muted-foreground mt-1">
                                IP: {log.ipAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
