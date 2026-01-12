import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Plus, Users, Mail, Phone, MapPin, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const employmentStatusOptions = ["ACTIVE", "INACTIVE", "TERMINATED"] as const;
const roleOptions = ["ORG_ADMIN", "MANAGER", "STAFF", "VIEWER"] as const;

type EmploymentStatus = (typeof employmentStatusOptions)[number];
type EmployeeRole = (typeof roleOptions)[number];

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  departmentId: z.string().optional(),
  monitorId: z.string().optional(),
  appointedDate: z.string().optional(),
  role: z.enum(roleOptions).default("STAFF"),
  employmentStatus: z.enum(employmentStatusOptions).default("ACTIVE"),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().min(1, "Code is required"),
});

type CreateDepartmentFormData = z.infer<typeof createDepartmentSchema>;

type Department = {
  id: string;
  name: string;
  code: string;
};

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: EmployeeRole;
  isActive: boolean;
  employmentStatus: EmploymentStatus;
  phone: string | null;
  location: string | null;
  departmentId: string | null;
  departmentName: string | null;
  monitorId: string | null;
  appointedDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function EmployeeManagementPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<EmployeeRow[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments, isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const createForm = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      departmentId: undefined,
      monitorId: undefined,
      appointedDate: "",
      role: "STAFF",
      employmentStatus: "ACTIVE",
    },
  });

  const departmentForm = useForm<CreateDepartmentFormData>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (values: CreateEmployeeFormData) => {
      const res = await apiRequest("POST", "/api/employees", values);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setShowCreateDialog(false);
      createForm.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
        departmentId: undefined,
        monitorId: undefined,
        appointedDate: "",
        role: "STAFF",
        employmentStatus: "ACTIVE",
      });
      if (result?.credentials) {
        setCreatedCredentials(result.credentials);
      } else {
        setCreatedCredentials(null);
      }
      toast({ title: "Employee created", description: "Credentials generated successfully." });
    },
    onError: async (error) => {
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
                if (parsed.message.toLowerCase().includes("email")) {
                  createForm.setError("email", { type: "server", message: parsed.message });
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }
      toast({
        title: "Failed to create employee",
        description,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CreateEmployeeFormData) => {
    createEmployeeMutation.mutate(values);
  };

  const createDepartmentMutation = useMutation({
    mutationFn: async (values: CreateDepartmentFormData) => {
      const res = await apiRequest("POST", "/api/departments", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      departmentForm.reset({ name: "", code: "" });
      toast({ title: "Department created" });
    },
    onError: async (error) => {
      let description = error instanceof Error ? error.message : "Unknown error";
      if (error instanceof Error) {
        const match = error.message.match(/^(\d+):\s*(.*)$/);
        if (match) {
          const bodyText = match[2];
          try {
            const parsed = JSON.parse(bodyText);
            if (parsed && typeof parsed.message === "string") {
              description = parsed.message;
            }
          } catch {
            // ignore
          }
        }
      }
      toast({
        title: "Failed to create department",
        description,
        variant: "destructive",
      });
    },
  });

  const onSubmitDepartment = (values: CreateDepartmentFormData) => {
    createDepartmentMutation.mutate(values);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusBadgeVariant = (status: EmploymentStatus) => {
    if (status === "ACTIVE") return "default" as const;
    if (status === "INACTIVE") return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Employee Management System</h1>
          <p className="text-muted-foreground mt-1">
            Manage employees, departments, and access credentials
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              Total employees: {employees?.length ?? 0}
            </span>
          </div>
        </div>
        <Button
          className="gradient-bg text-white"
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-employee"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="mb-4">
          <CardHeader className="pb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Create and manage departments used to group employees.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...departmentForm}>
              <form
                onSubmit={departmentForm.handleSubmit(onSubmitDepartment)}
                className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto] gap-3 items-end"
              >
                <FormField
                  control={departmentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Operations" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={departmentForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. OPS" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full md:w-auto gradient-bg text-white"
                  disabled={createDepartmentMutation.isPending}
                >
                  {createDepartmentMutation.isPending ? "Creating..." : "Add Department"}
                </Button>
              </form>
            </Form>

            <div className="flex flex-wrap gap-2">
              {departments && departments.length > 0 ? (
                departments.map((dept) => (
                  <Badge key={dept.id} variant="outline" className="text-xs px-2 py-1">
                    {dept.name} <span className="ml-1 text-[10px] text-muted-foreground">({dept.code})</span>
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No departments yet. Create one to start assigning employees.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardHeader className="pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Employees</CardTitle>
            <CardDescription>
              Overview of all non-super admin users in the system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEmployees || isLoadingDepartments ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : employeesError ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">Unable to load employees</h3>
              <p className="text-muted-foreground text-sm">
                {employeesError instanceof Error ? employeesError.message : "An unexpected error occurred while loading employee data."}
              </p>
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No employees found</h3>
              <p className="text-muted-foreground text-sm">
                Create your first employee to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Appointed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(emp.firstName, emp.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {emp.email}
                          </p>
                          {emp.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {emp.phone}
                            </p>
                          )}
                          {emp.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {emp.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{emp.username}</TableCell>
                    <TableCell>
                      {emp.departmentName ? (
                        <Badge variant="outline" className="text-xs">
                          {emp.departmentName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {emp.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(emp.employmentStatus)} className="text-xs">
                        {emp.employmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {emp.appointedDate ? new Date(emp.appointedDate).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Employee</DialogTitle>
            <DialogDescription>
              Add a new employee. Credentials will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+977-98..." autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Kathmandu" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={createForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={departments && departments.length > 0 ? "Select department" : "No departments"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employmentStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="appointedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointed Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  disabled={createEmployeeMutation.isPending}
                  data-testid="button-submit-employee"
                >
                  {createEmployeeMutation.isPending ? "Creating..." : "Create Employee"}
                </Button>
              </DialogFooter>
            </form>
          </Form>

          {createdCredentials && (
            <div className="mt-4 rounded-md border bg-muted/40 p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle2 className="h-4 w-4" />
                <span className="font-medium">Generated Credentials</span>
              </div>
              <p className="text-muted-foreground mb-1">
                Share these credentials securely with the employee. They will need to change the password on first login.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Username</span>
                  <p className="font-mono text-sm break-all">{createdCredentials.username}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Password</span>
                  <p className="font-mono text-sm break-all">{createdCredentials.password}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
