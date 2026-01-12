import { useEffect, useState, type ChangeEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Shield,
  Activity as ActivityIcon,
  Filter,
  ArrowUpDown,
  Download,
  Info,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  // Only allow creation of non-admin roles from this form so accounts get access
  // to the user dashboard but not the admin area.
  role: z.enum(["STAFF", "VIEWER"]),
  isActive: z.boolean().default(true),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "username" | "role" | "lastLogin">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/users/${id}/force-logout`);
    },
    onSuccess: () => {
      toast({ title: "User sessions terminated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to terminate sessions",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "STAFF",
      isActive: true,
    },
  });

  const { isValid } = form.formState;
  const watchFirstName = form.watch("firstName");
  const watchLastName = form.watch("lastName");
  const watchPassword = form.watch("password");

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateDialog(false);
      form.reset({
        email: "",
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "STAFF",
        isActive: true,
      });
      setPasswordStrength("weak");
      setUsernameSuggestions([]);
      toast({ title: "User created successfully" });
    },
    onError: (error) => {
      let description = error instanceof Error ? error.message : "Unknown error";
      if (error instanceof Error) {
        const match = error.message.match(/^(\d+):\s*(.*)$/);
        if (match) {
          const statusCode = Number(match[1]);
          const bodyText = match[2];
          try {
            const parsed = JSON.parse(bodyText);
            if (parsed && typeof parsed.message === "string") {
              description = parsed.message;
              if (statusCode === 409) {
                const lower = parsed.message.toLowerCase();
                if (lower.includes("email")) {
                  form.setError("email", { type: "server", message: parsed.message });
                }
                if (lower.includes("username")) {
                  form.setError("username", { type: "server", message: parsed.message });
                }
              }
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
      toast({
        title: "Failed to create user",
        description,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/users/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User status updated" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted" });
    },
  });

  const filteredUsers = users
    ?.filter((user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    ?.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !user.isActive) return false;
      if (statusFilter === "INACTIVE" && user.isActive) return false;
      return true;
    });

  const sortedUsers = filteredUsers
    ? [...filteredUsers].sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          cmp = nameA.localeCompare(nameB);
        } else if (sortBy === "username") {
          cmp = a.username.toLowerCase().localeCompare(b.username.toLowerCase());
        } else if (sortBy === "role") {
          cmp = a.role.localeCompare(b.role);
        } else if (sortBy === "lastLogin") {
          const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          cmp = timeA - timeB;
        }
        return sortDirection === "asc" ? cmp : -cmp;
      })
    : [];

  const pageSize = 10;
  const totalUsers = filteredUsers?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = sortedUsers?.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  useEffect(() => {
    const value = watchPassword || "";
    if (!value) {
      setPasswordStrength("weak");
      return;
    }
    let score = 0;
    if (value.length >= 6) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    if (score >= 3 && value.length >= 8) setPasswordStrength("strong");
    else if (score >= 2) setPasswordStrength("medium");
    else setPasswordStrength("weak");
  }, [watchPassword]);

  useEffect(() => {
    const first = (watchFirstName || "").trim().toLowerCase();
    const last = (watchLastName || "").trim().toLowerCase();
    if (!first && !last) {
      setUsernameSuggestions([]);
      return;
    }
    const set = new Set<string>();
    if (first && last) {
      set.add(`${first}.${last}`);
      set.add(`${first}${last}`);
      set.add(`${first}_${last}`);
      set.add(`${first.charAt(0)}${last}`);
    } else if (first) {
      set.add(first);
    } else if (last) {
      set.add(last);
    }
    setUsernameSuggestions(Array.from(set).slice(0, 4));
  }, [watchFirstName, watchLastName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, users]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "bg-destructive text-destructive-foreground";
      case "ORG_ADMIN": return "bg-primary text-primary-foreground";
      case "MANAGER": return "bg-chart-3 text-white";
      case "STAFF":
      case "VIEWER":
        return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const activeUsersCount = users?.filter((u) => u.isActive).length ?? 0;
  const staffUsersCount = users?.filter((u) => u.role === "STAFF").length ?? 0;
  const viewerUsersCount = users?.filter((u) => u.role === "VIEWER").length ?? 0;

  const handleExportCsv = () => {
    if (!sortedUsers || sortedUsers.length === 0) {
      toast({
        title: "Nothing to export",
        description: "There are no users in the current view.",
      });
      return;
    }

    const header = [
      "id",
      "firstName",
      "lastName",
      "email",
      "username",
      "role",
      "isActive",
      "lastLoginAt",
      "createdAt",
    ];

    const rows = sortedUsers.map((u) => [
      u.id,
      u.firstName,
      u.lastName,
      u.email,
      u.username,
      u.role,
      u.isActive ? "true" : "false",
      u.lastLoginAt ?? "",
      u.createdAt ?? "",
    ]);

    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage user accounts
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              Total: {users?.length ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Active: {activeUsersCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Staff: {staffUsersCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Viewers: {viewerUsersCount}
            </span>
          </div>
        </div>
        <Button
          className="gradient-bg text-white"
          onClick={() => {
            form.reset({
              email: "",
              username: "",
              password: "",
              firstName: "",
              lastName: "",
              role: "STAFF",
            });
            setShowCreateDialog(true);
          }}
          data-testid="button-create-user"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="lastLogin">Last login</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                className="h-8 w-8"
              >
                <ArrowUpDown className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleExportCsv}
                className="h-8 w-8"
                title="Export CSV"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {users?.length ?? 0} users
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">Unable to load users</h3>
              <p className="text-muted-foreground text-sm">
                {error instanceof Error ? error.message : "An unexpected error occurred while loading user data."}
              </p>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "Try a different search term" : "Create your first user to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers?.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`menu-${user.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: user.id,
                                isActive: !user.isActive,
                              })
                            }
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setLocation(`/admin/audit?userId=${user.id}`)}
                          >
                            <ActivityIcon className="h-4 w-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => forceLogoutMutation.mutate(user.id)}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Force Logout Sessions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" autoComplete="off" data-testid="input-first-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" autoComplete="off" data-testid="input-last-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        autoComplete="off"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" autoComplete="off" data-testid="input-new-username" {...field} />
                    </FormControl>
                    {usernameSuggestions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Suggestions:</span>
                        {usernameSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="px-2 py-0.5 rounded-full border text-xs hover:bg-muted transition-colors"
                            onClick={() => {
                              form.setValue("username", suggestion, { shouldValidate: true });
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        autoComplete="new-password"
                        data-testid="input-new-password"
                        {...field}
                      />
                    </FormControl>
                    <p
                      className={`text-xs mt-1 ${
                        passwordStrength === "strong"
                          ? "text-green-600"
                          : passwordStrength === "medium"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      Strength: {passwordStrength}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STAFF">Staff (standard user)</SelectItem>
                        <SelectItem value="VIEWER">Viewer (read-only user)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }: { field: any }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {field.value ? "Active user can log in" : "Inactive user cannot log in"}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(value) => field.onChange(value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="gradient-bg text-white"
                  disabled={!isValid || passwordStrength === "weak" || createUserMutation.isPending}
                  data-testid="button-submit-user"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View key information about this user account.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(editingUser.firstName, editingUser.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {editingUser.firstName} {editingUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs">
                  <Shield className="h-3 w-3" />
                  <span className="font-medium">Role:</span>
                  <span>{editingUser.role.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">Username:</span>
                  <span className="font-mono">{editingUser.username}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <UserCheck className="h-3 w-3" />
                  <span className="font-medium">Status:</span>
                  <span>{editingUser.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <ActivityIcon className="h-3 w-3" />
                  <span className="font-medium">Last login:</span>
                  <span>
                    {editingUser.lastLoginAt
                      ? new Date(editingUser.lastLoginAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>User ID: {editingUser.id}</span>
                </div>
                <div>Created: {new Date(editingUser.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(editingUser.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
