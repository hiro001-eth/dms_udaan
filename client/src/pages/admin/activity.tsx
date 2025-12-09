import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Timer,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, UserActivity } from "@shared/schema";

interface UserActivitySummary {
  user: User;
  totalMinutesToday: number;
  totalMinutesWeek: number;
  sessionsToday: number;
  lastActive: Date | null;
  isOnline: boolean;
}

export default function ActivityTrackingPage() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");

  const { data: activityData, isLoading } = useQuery<UserActivitySummary[]>({
    queryKey: ["/api/admin/activity", timeRange],
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const totalActiveUsers = activityData?.filter((a) => a.isOnline).length ?? 0;
  const totalMinutesToday = activityData?.reduce((sum, a) => sum + a.totalMinutesToday, 0) ?? 0;
  const avgMinutesPerUser = activityData?.length 
    ? Math.round(totalMinutesToday / activityData.length) 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Activity Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor user working hours and session activity
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <SelectTrigger className="w-36" data-testid="select-time-range">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                <p className="text-3xl font-bold mt-2">{totalActiveUsers}</p>
                <p className="text-xs text-accent mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Online users
                </p>
              </div>
              <div className="p-3 rounded-lg gradient-bg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold mt-2">{formatDuration(totalMinutesToday)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeRange === "today" ? "Today" : timeRange === "week" ? "This week" : "This month"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-accent">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg per User</p>
                <p className="text-3xl font-bold mt-2">{formatDuration(avgMinutesPerUser)}</p>
                <p className="text-xs text-muted-foreground mt-1">Average activity</p>
              </div>
              <div className="p-3 rounded-lg bg-chart-3">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold mt-2">
                  {activityData?.reduce((sum, a) => sum + a.sessionsToday, 0) ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Login sessions</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>Individual user working time and session data</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : activityData?.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No activity data</h3>
              <p className="text-muted-foreground text-sm">
                User activity will appear here once users start using the system
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityData?.map((item, index) => {
                const maxMinutes = Math.max(...(activityData?.map((a) => a.totalMinutesToday) || [1]));
                const percentage = (item.totalMinutesToday / maxMinutes) * 100;

                return (
                  <motion.div
                    key={item.user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
                    data-testid={`activity-row-${item.user.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(item.user.firstName, item.user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      {item.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent border-2 border-background rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {item.user.firstName} {item.user.lastName}
                        </p>
                        {item.isOnline && (
                          <Badge variant="secondary" className="text-xs bg-accent/10 text-accent">
                            Online
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={percentage} className="h-2 flex-1" />
                        <span className="text-sm font-mono text-muted-foreground min-w-20 text-right">
                          {formatDuration(item.totalMinutesToday)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span>{item.sessionsToday} sessions</span>
                      </div>
                      {item.lastActive && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last active: {new Date(item.lastActive).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
