import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { insertUserSchema, insertFolderSchema, loginSchema, insertDepartmentSchema } from "@shared/schema";
import { z } from "zod";
import * as fileProcessor from "./services/fileProcessor";

const JWT_SECRET = process.env.SESSION_SECRET || "udaan-secret-key-change-in-production";
const SALT_ROUNDS = 10;

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

interface AuthRequest extends Request {
  user?: { id: string; role: string; organizationId?: string };
}

function generateShareCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const employeeRoleValues = ["ORG_ADMIN", "MANAGER", "STAFF", "VIEWER"] as const;
const employmentStatusValues = ["ACTIVE", "INACTIVE", "TERMINATED"] as const;

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  departmentId: z.string().optional(),
  monitorId: z.string().optional(),
  appointedDate: z.string().optional(),
  role: z.enum(employeeRoleValues).optional(),
  employmentStatus: z.enum(employmentStatusValues).optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
  const baseRaw = `${firstName}.${lastName}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.]/g, "");
  const base = baseRaw || `user${Date.now()}`;

  let candidate = base;
  let counter = 1;
  // try a limited number of times to avoid infinite loops
  while (true) {
    const existing = await storage.getUserByUsername(candidate);
    if (!existing) return candidate;
    candidate = `${base}${counter}`;
    counter++;
    if (counter > 1000) {
      const suffix = crypto.randomBytes(3).toString("hex");
      candidate = `${base}-${suffix}`;
    }
  }
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const user = await storage.getUser(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }
    req.user = { id: user.id, role: user.role, organizationId: user.organizationId ?? undefined };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const adminRoles = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

function superAdminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Only Super Admin can perform this action" });
  }
  next();
}

function superOrOrgAdminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.role !== "SUPER_ADMIN" && req.user.role !== "ORG_ADMIN") {
    return res.status(403).json({ message: "Only Super Admin or Organization Admin can perform this action" });
  }
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const defaultUsername = "admin";
  const defaultPassword = "admin123";

  const existingAdmin = await storage.getUserByUsername(defaultUsername);

  const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

  if (!existingAdmin) {
    await storage.createUser({
      username: defaultUsername,
      email: "admin@example.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "SUPER_ADMIN",
      isActive: true,
    });
    console.log("[auth] Created default SUPER_ADMIN user: username=admin, password=admin123");
  } else {
    await storage.updateUser(existingAdmin.id, {
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    } as any);
    console.log("[auth] Reset default SUPER_ADMIN user credentials: username=admin, password=admin123");
  }

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const existingUsers = await storage.getAllUsers();
      if (existingUsers.length > 0) {
        return res.status(403).json({ message: "Initial setup already complete" });
      }

      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        role: "SUPER_ADMIN",
      });

      await storage.createAuditLog({
        userId: user.id,
        action: "CREATE_USER",
        entityType: "USER",
        entityId: user.id,
        metadata: { isInitialSetup: true },
      });

      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        console.warn(`[auth] Invalid login attempt for username="${username}"`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        console.warn(`[auth] Login attempt for deactivated user username="${username}"`);
        return res.status(401).json({ message: "Account is deactivated" });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
      const refreshToken = crypto.randomBytes(32).toString("hex");

      await storage.createSession({
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);

      await storage.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        entityType: "USER",
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const { password: _, ...safeUser } = user;
      console.log(`[auth] Login success for username="${username}", role=${user.role}`);
      res.json({ token, refreshToken, user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthRequest, res: Response) => {
    await storage.deleteUserSessions(req.user!.id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "LOGOUT",
      entityType: "USER",
      entityId: req.user!.id,
    });
    res.json({ message: "Logged out" });
  });

  app.get("/api/users", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const users = await storage.getAllUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  });

  app.get("/api/analytics/dashboard", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const analytics = await storage.getAnalyticsDashboard();
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  app.get("/api/search", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { q, mimeType, folderId, minSize, maxSize, startDate, endDate, limit } = req.query;
      const query = (q as string) || "";
      
      const results = await storage.searchDocuments(query, { 
        mimeType: mimeType as string | undefined,
        folderId: folderId as string | undefined,
        minSize: minSize ? parseInt(minSize as string) : undefined,
        maxSize: maxSize ? parseInt(maxSize as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
      });
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/audit-logs", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, action, limit } = req.query;
      const logs = await storage.getAuditLogs({
        userId: userId as string | undefined,
        action: action as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to load audit logs" });
    }
  });

  app.post("/api/users", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
      const user = await storage.createUser({ ...data, password: hashedPassword });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CREATE_USER",
        entityType: "USER",
        entityId: user.id,
        metadata: { createdUserEmail: user.email },
      });

      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      if (data.password) {
        data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
      }

      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UPDATE_USER",
        entityType: "USER",
        entityId: id,
      });

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await storage.deleteUser(id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      entityType: "USER",
      entityId: id,
    });
    res.status(204).send();
  });

  app.post("/api/users/:id/force-logout", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await storage.deleteUserSessions(id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "LOGOUT",
      entityType: "USER",
      entityId: id,
      metadata: { forced: true },
    });

    res.json({ message: "User sessions terminated" });
  });

  // Departments (EMS)
  app.get("/api/departments", authMiddleware, superAdminMiddleware, async (_req: AuthRequest, res: Response) => {
    const departments = await storage.getDepartments();
    res.json(departments);
  });

  app.post("/api/departments", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const dept = await storage.createDepartment({
        ...data,
        organizationId: req.user!.organizationId,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CREATE_DEPARTMENT",
        entityType: "DEPARTMENT",
        entityId: dept.id,
        metadata: { code: dept.code, name: dept.name },
      });

      res.status(201).json(dept);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.patch("/api/departments/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const dept = await storage.updateDepartment(id, req.body);
      if (!dept) {
        return res.status(404).json({ message: "Department not found" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UPDATE_DEPARTMENT",
        entityType: "DEPARTMENT",
        entityId: id,
      });

      res.json(dept);
    } catch (_error) {
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await storage.deleteDepartment(id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "DELETE_DEPARTMENT",
      entityType: "DEPARTMENT",
      entityId: id,
    });
    res.status(204).send();
  });

  // Employees (EMS)
  app.get("/api/employees", authMiddleware, superAdminMiddleware, async (_req: AuthRequest, res: Response) => {
    const users = await storage.getAllUsers();
    const nonSuperUsers = users.filter((u) => u.role !== "SUPER_ADMIN");

    const result = await Promise.all(
      nonSuperUsers.map(async (user) => {
        const profile = await storage.getEmployeeProfileByUserId(user.id);
        let departmentName: string | null = null;
        if (profile?.departmentId) {
          const dept = await storage.getDepartment(profile.departmentId);
          departmentName = dept?.name ?? null;
        }

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          employmentStatus: profile?.employmentStatus ?? "ACTIVE",
          phone: profile?.phone ?? null,
          location: profile?.location ?? null,
          departmentId: profile?.departmentId ?? null,
          departmentName,
          monitorId: profile?.monitorId ?? null,
          appointedDate: profile?.appointedDate ?? null,
          createdAt: profile?.createdAt ?? user.createdAt,
          updatedAt: profile?.updatedAt ?? user.updatedAt,
        };
      }),
    );

    res.json(result);
  });

  app.post("/api/employees", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const data = createEmployeeSchema.parse(req.body);

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const role = data.role ?? "STAFF";
      const employmentStatus = data.employmentStatus ?? "ACTIVE";

      const username = await generateUniqueUsername(data.firstName, data.lastName);
      const plainPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

      const user = await storage.createUser({
        email: data.email,
        username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role,
        isActive: employmentStatus !== "TERMINATED",
        organizationId: req.user!.organizationId,
      } as any);

      const appointedDate = data.appointedDate ? new Date(data.appointedDate) : undefined;

      const profile = await storage.createEmployeeProfile({
        userId: user.id,
        departmentId: data.departmentId,
        monitorId: data.monitorId,
        phone: data.phone,
        location: data.location,
        appointedDate: appointedDate,
        employmentStatus,
      } as any);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CREATE_EMPLOYEE",
        entityType: "EMPLOYEE",
        entityId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
          employmentStatus,
          departmentId: profile.departmentId,
        },
      });

      const { password: _pw, ...safeUser } = user as any;

      res.status(201).json({
        user: safeUser,
        profile,
        credentials: {
          username,
          password: plainPassword,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateEmployeeSchema.parse(req.body);

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userUpdate: any = {};
      if (data.firstName !== undefined) userUpdate.firstName = data.firstName;
      if (data.lastName !== undefined) userUpdate.lastName = data.lastName;
      if (data.role !== undefined) userUpdate.role = data.role;
      if (data.employmentStatus !== undefined) {
        userUpdate.isActive = data.employmentStatus !== "TERMINATED";
      }

      const employmentStatus = data.employmentStatus;

      let profile = await storage.getEmployeeProfileByUserId(id);
      if (!profile) {
        profile = await storage.createEmployeeProfile({
          userId: id,
          departmentId: data.departmentId,
          monitorId: data.monitorId,
          phone: data.phone,
          location: data.location,
          appointedDate: data.appointedDate ? new Date(data.appointedDate) : undefined,
          employmentStatus: employmentStatus ?? "ACTIVE",
        } as any);
      } else {
        const profileUpdate: any = {};
        if (data.departmentId !== undefined) profileUpdate.departmentId = data.departmentId;
        if (data.monitorId !== undefined) profileUpdate.monitorId = data.monitorId;
        if (data.phone !== undefined) profileUpdate.phone = data.phone;
        if (data.location !== undefined) profileUpdate.location = data.location;
        if (data.appointedDate !== undefined) {
          profileUpdate.appointedDate = data.appointedDate ? new Date(data.appointedDate) : null;
        }
        if (employmentStatus !== undefined) profileUpdate.employmentStatus = employmentStatus;
        profile = await storage.updateEmployeeProfile(profile.id, profileUpdate) ?? profile;
      }

      const updatedUser = Object.keys(userUpdate).length
        ? await storage.updateUser(id, userUpdate)
        : user;

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UPDATE_EMPLOYEE",
        entityType: "EMPLOYEE",
        entityId: id,
      });

      const { password: _pw, ...safeUser } = updatedUser as any;
      res.json({ user: safeUser, profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const profile = await storage.getEmployeeProfileByUserId(id);
    if (profile) {
      await storage.deleteEmployeeProfile(profile.id);
    }

    await storage.deleteUser(id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "DELETE_EMPLOYEE",
      entityType: "EMPLOYEE",
      entityId: id,
    });

    res.status(204).send();
  });

  app.get("/api/folders/:id?", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const folderId = req.params.id === "root" ? null : req.params.id || null;
    const result = await storage.getFolderWithContents(folderId);
    res.json(result);
  });

  app.post("/api/folders", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder({
        ...data,
        createdBy: req.user!.id,
        organizationId: req.user!.organizationId,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CREATE_FOLDER",
        entityType: "FOLDER",
        entityId: folder.id,
        metadata: { folderName: folder.name },
      });

      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.patch("/api/folders/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const folder = await storage.updateFolder(id, req.body);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.json(folder);
  });

  app.delete("/api/folders/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await storage.deleteFolder(id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "DELETE_FOLDER",
      entityType: "FOLDER",
      entityId: id,
    });
    res.status(204).send();
  });

  app.get("/api/documents", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const { limit, status, folderId } = req.query;
    const documents = await storage.getDocuments({
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      folderId: folderId as string,
    });
    res.json(documents);
  });

  app.get("/api/documents/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(doc);
  });

  app.post("/api/documents/upload", authMiddleware, superAdminMiddleware, upload.array("files", 10), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const { folderId } = req.body;
      const uploadedDocs = [];

      for (const file of files) {
        const doc = await storage.createDocument({
          title: path.parse(file.originalname).name,
          originalName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          folderId: folderId || null,
          uploadedBy: req.user!.id,
          organizationId: req.user!.organizationId,
          status: "ACTIVE",
        });

        await storage.createAuditLog({
          userId: req.user!.id,
          action: "UPLOAD",
          entityType: "DOCUMENT",
          entityId: doc.id,
          metadata: { fileName: file.originalname, size: file.size },
        });

        uploadedDocs.push(doc);
      }

      res.status(201).json(uploadedDocs);
    } catch (error) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.patch("/api/documents/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const doc = await storage.updateDocument(req.params.id, req.body);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    await storage.createAuditLog({
      userId: req.user!.id,
      action: "UPDATE_METADATA",
      entityType: "DOCUMENT",
      entityId: req.params.id,
    });

    res.json(doc);
  });

  app.delete("/api/documents/:id", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    await storage.deleteDocument(req.params.id);
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      entityType: "DOCUMENT",
      entityId: req.params.id,
    });
    res.status(204).send();
  });

  app.get("/api/documents/:id/download", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    await storage.createAuditLog({
      userId: req.user!.id,
      action: "DOWNLOAD",
      entityType: "DOCUMENT",
      entityId: req.params.id,
    });

    res.download(doc.filePath, doc.originalName);
  });

  app.get("/api/shares/created", authMiddleware, async (req: AuthRequest, res: Response) => {
    const shares = await storage.getShareCodesByCreator(req.user!.id);
    res.json(shares);
  });

  app.get("/api/shares/received", authMiddleware, async (req: AuthRequest, res: Response) => {
    res.json([]);
  });

  app.post("/api/shares", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { folderId, documentId, permission, expiresAt, maxUsages } = req.body;
      
      let code: string;
      let existing;
      do {
        code = generateShareCode();
        existing = await storage.getShareCode(code);
      } while (existing);

      const share = await storage.createShareCode({
        code,
        folderId: folderId || null,
        documentId: documentId || null,
        createdBy: req.user!.id,
        permission: permission || "VIEW",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUsages: maxUsages || null,
        isActive: true,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "SHARE",
        entityType: "SHARE",
        entityId: share.id,
        metadata: { code, permission },
      });

      res.status(201).json(share);
    } catch (error) {
      res.status(500).json({ message: "Failed to create share" });
    }
  });

  app.post("/api/shares/access", authMiddleware, async (req: AuthRequest, res: Response) => {
    const { code } = req.body;
    const share = await storage.getShareCode(code);

    if (!share || !share.isActive) {
      return res.status(404).json({ message: "Invalid or expired code" });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return res.status(410).json({ message: "Share code expired" });
    }

    if (share.maxUsages && share.usageCount >= share.maxUsages) {
      return res.status(410).json({ message: "Share code usage limit reached" });
    }

    await storage.incrementShareCodeUsage(share.id);
    res.json(share);
  });

  app.delete("/api/shares/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    await storage.deleteShareCode(req.params.id);
    res.status(204).send();
  });

  app.get("/api/audit/logs", authMiddleware, async (req: AuthRequest, res: Response) => {
    const { limit, userId, action } = req.query;
    const logs = await storage.getAuditLogs({
      limit: limit ? parseInt(limit as string) : 100,
      userId: userId as string,
      action: action as string,
    });
    res.json(logs);
  });

  app.get("/api/dashboard/stats", authMiddleware, async (req: AuthRequest, res: Response) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get("/api/admin/activity/:timeRange?", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    const users = await storage.getAllUsers();
    const activityData = users.map((user) => ({
      user: { ...user, password: undefined },
      totalMinutesToday: Math.floor(Math.random() * 480),
      totalMinutesWeek: Math.floor(Math.random() * 2400),
      sessionsToday: Math.floor(Math.random() * 5),
      lastActive: user.lastLoginAt,
      isOnline: Math.random() > 0.7,
    }));
    res.json(activityData);
  });

  app.post("/api/file-ops/convert", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { targetFormat } = req.body;
      let outputPath: string;

      const isImage = file.mimetype.startsWith("image/");
      const isPdf = file.mimetype === "application/pdf";

      if (targetFormat === "pdf" && isImage) {
        outputPath = await fileProcessor.imageToPdf(file.path);
      } else if (targetFormat === "png" && isPdf) {
        outputPath = await fileProcessor.pdfToImage(file.path, 0);
      } else if (["jpeg", "jpg", "png", "webp"].includes(targetFormat) && isImage) {
        const format = targetFormat === "jpg" ? "jpeg" : targetFormat as "jpeg" | "png" | "webp";
        outputPath = await fileProcessor.convertImageFormat(file.path, format);
      } else {
        return res.status(400).json({ message: "Unsupported conversion" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CONVERT",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, targetFormat },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({ message: "Conversion failed" });
    }
  });

  app.post("/api/file-ops/merge", authMiddleware, superAdminMiddleware, upload.array("files", 20), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length < 2) {
        return res.status(400).json({ message: "At least 2 files required" });
      }

      const { outputType } = req.body;
      const filePaths = files.map(f => f.path);
      let outputPath: string;

      const allPdfs = files.every(f => f.mimetype === "application/pdf");
      const allImages = files.every(f => f.mimetype.startsWith("image/"));

      if (allPdfs) {
        outputPath = await fileProcessor.mergePdfs(filePaths);
      } else if (allImages && outputType === "pdf") {
        outputPath = await fileProcessor.imagesToPdf(filePaths);
      } else if (allImages) {
        outputPath = await fileProcessor.createZipArchive(filePaths, "images");
      } else {
        outputPath = await fileProcessor.createZipArchive(filePaths, "merged-files");
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "MERGE",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Merge error:", error);
      res.status(500).json({ message: "Merge failed" });
    }
  });

  app.post("/api/file-ops/split", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDF files can be split" });
      }

      const { pages } = req.body;
      let outputPaths: string[];

      if (pages) {
        const pageNumbers = pages.split(",").map((p: string) => parseInt(p.trim()));
        const outputPath = await fileProcessor.extractPages(file.path, pageNumbers);
        outputPaths = [outputPath];
      } else {
        const pageCount = await fileProcessor.getPdfPageCount(file.path);
        const ranges = Array.from({ length: pageCount }, (_, i) => ({ start: i + 1, end: i + 1 }));
        outputPaths = await fileProcessor.splitPdf(file.path, ranges);
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "SPLIT",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname },
      });

      if (outputPaths.length === 1) {
        const fileName = path.basename(outputPaths[0]);
        res.json({
          success: true,
          downloadUrl: `/api/file-ops/download/${fileName}`,
          fileName,
        });
      } else {
        const zipPath = await fileProcessor.createZipArchive(outputPaths, "split-pages");
        const fileName = path.basename(zipPath);
        res.json({
          success: true,
          downloadUrl: `/api/file-ops/download/${fileName}`,
          fileName,
        });
      }
    } catch (error) {
      console.error("Split error:", error);
      res.status(500).json({ message: "Split failed" });
    }
  });

  app.post("/api/file-ops/compress", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { quality } = req.body;
      const qualityNum = parseInt(quality) || 70;

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only images can be compressed" });
      }

      const outputPath = await fileProcessor.compressImage(file.path, qualityNum);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "COMPRESS",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, quality: qualityNum },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
        originalSize: file.size,
        compressedSize: fs.statSync(outputPath).size,
      });
    } catch (error) {
      console.error("Compress error:", error);
      res.status(500).json({ message: "Compression failed" });
    }
  });

  app.post("/api/file-ops/rotate", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs can be rotated" });
      }

      const { degrees } = req.body;
      const rotationDegrees = parseInt(degrees) || 90;

      const outputPath = await fileProcessor.rotatePdf(file.path, rotationDegrees);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "ROTATE",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, degrees: rotationDegrees },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Rotate error:", error);
      res.status(500).json({ message: "Rotation failed" });
    }
  });

  app.post("/api/file-ops/watermark", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs can be watermarked" });
      }

      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Watermark text required" });
      }

      const outputPath = await fileProcessor.addWatermark(file.path, text);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "WATERMARK",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Watermark error:", error);
      res.status(500).json({ message: "Watermark failed" });
    }
  });

  app.get("/api/file-ops/download/:fileName", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(fileProcessor.getProcessedDir(), fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.download(filePath, fileName, (err) => {
        if (!err) {
          setTimeout(() => {
            fs.unlink(filePath, () => {});
          }, 60000);
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Download failed" });
    }
  });

  app.post("/api/file-ops/batch-download", authMiddleware, superAdminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { documentIds } = req.body;
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ message: "No documents selected" });
      }

      const filePaths: string[] = [];
      for (const id of documentIds) {
        const doc = await storage.getDocument(id);
        if (doc && fs.existsSync(doc.filePath)) {
          filePaths.push(doc.filePath);
        }
      }

      if (filePaths.length === 0) {
        return res.status(404).json({ message: "No valid documents found" });
      }

      const zipPath = await fileProcessor.createZipArchive(filePaths, "documents");
      const fileName = path.basename(zipPath);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_DOWNLOAD",
        entityType: "DOCUMENT",
        metadata: { documentCount: filePaths.length },
      });

      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Batch download error:", error);
      res.status(500).json({ message: "Batch download failed" });
    }
  });

  app.post("/api/file-ops/delete-pages", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs supported" });
      }

      const { pages } = req.body;
      if (!pages) {
        return res.status(400).json({ message: "Pages to delete required" });
      }

      const pagesToDelete = pages.split(",").map((p: string) => parseInt(p.trim()));
      const outputPath = await fileProcessor.deletePages(file.path, pagesToDelete);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DELETE",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, deletedPages: pagesToDelete },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Delete pages error:", error);
      res.status(500).json({ message: "Delete pages failed" });
    }
  });

  app.post("/api/file-ops/add-page-numbers", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs supported" });
      }

      const { position, format } = req.body;
      const outputPath = await fileProcessor.addPageNumbers(
        file.path, 
        position || "bottom",
        format || "Page {n} of {total}"
      );

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CONVERT",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, operation: "add-page-numbers" },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Add page numbers error:", error);
      res.status(500).json({ message: "Add page numbers failed" });
    }
  });

  app.post("/api/file-ops/reorder-pages", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs supported" });
      }

      const { order } = req.body;
      if (!order) {
        return res.status(400).json({ message: "Page order required" });
      }

      const newOrder = order.split(",").map((p: string) => parseInt(p.trim()));
      const outputPath = await fileProcessor.reorderPages(file.path, newOrder);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CONVERT",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, operation: "reorder-pages" },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Reorder pages error:", error);
      res.status(500).json({ message: "Reorder pages failed" });
    }
  });

  app.post("/api/file-ops/add-header-footer", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs supported" });
      }

      const { header, footer } = req.body;
      if (!header && !footer) {
        return res.status(400).json({ message: "Header or footer text required" });
      }

      const outputPath = await fileProcessor.addHeaderFooter(file.path, header, footer);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CONVERT",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, operation: "add-header-footer" },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Add header/footer error:", error);
      res.status(500).json({ message: "Add header/footer failed" });
    }
  });

  app.post("/api/file-ops/pdf-info", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDFs supported" });
      }

      const info = await fileProcessor.getPdfInfo(file.path);
      res.json(info);
    } catch (error) {
      console.error("PDF info error:", error);
      res.status(500).json({ message: "Get PDF info failed" });
    }
  });

  app.post("/api/file-ops/resize-image", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only images supported" });
      }

      const { width, height } = req.body;
      if (!width) {
        return res.status(400).json({ message: "Width required" });
      }

      const outputPath = await fileProcessor.resizeImage(file.path, parseInt(width), height ? parseInt(height) : undefined);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CONVERT",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, operation: "resize-image", width, height },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Resize image error:", error);
      res.status(500).json({ message: "Resize image failed" });
    }
  });

  app.post("/api/file-ops/rotate-image", authMiddleware, superAdminMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only images supported" });
      }

      const { degrees } = req.body;
      const rotationDegrees = parseInt(degrees) || 90;

      const outputPath = await fileProcessor.rotateImage(file.path, rotationDegrees);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "ROTATE",
        entityType: "DOCUMENT",
        metadata: { sourceFile: file.originalname, degrees: rotationDegrees },
      });

      const fileName = path.basename(outputPath);
      res.json({
        success: true,
        downloadUrl: `/api/file-ops/download/${fileName}`,
        fileName,
      });
    } catch (error) {
      console.error("Rotate image error:", error);
      res.status(500).json({ message: "Rotate image failed" });
    }
  });

  app.post("/api/file-ops/batch-compress", authMiddleware, superAdminMiddleware, upload.array("files", 50), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const quality = parseInt(req.body.quality) || 80;
      const imagePaths = files.filter(f => f.mimetype.startsWith("image/")).map(f => f.path);

      if (imagePaths.length === 0) {
        return res.status(400).json({ message: "No valid image files provided" });
      }

      const result = await fileProcessor.batchCompressImages(imagePaths, quality);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_COMPRESS",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length, quality },
      });

      const fileResults = result.results.map(r => ({
        originalFile: path.basename(r.originalFile),
        success: r.success,
        downloadUrl: r.success && r.filePath ? `/api/file-ops/download/${path.basename(r.filePath)}` : undefined,
        fileName: r.success && r.filePath ? path.basename(r.filePath) : undefined,
        error: r.error,
      }));

      res.json({
        success: result.failed === 0,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        files: fileResults,
      });
    } catch (error) {
      console.error("Batch compress error:", error);
      res.status(500).json({ message: "Batch compress failed" });
    }
  });

  app.post("/api/file-ops/batch-convert", authMiddleware, superAdminMiddleware, upload.array("files", 50), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const targetFormat = (req.body.format || "jpeg") as "jpeg" | "png" | "webp";
      const imagePaths = files.filter(f => f.mimetype.startsWith("image/")).map(f => f.path);

      if (imagePaths.length === 0) {
        return res.status(400).json({ message: "No valid image files provided" });
      }

      const result = await fileProcessor.batchConvertImages(imagePaths, targetFormat);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_CONVERT",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length, targetFormat },
      });

      const fileResults = result.results.map(r => ({
        originalFile: path.basename(r.originalFile),
        success: r.success,
        downloadUrl: r.success && r.filePath ? `/api/file-ops/download/${path.basename(r.filePath)}` : undefined,
        fileName: r.success && r.filePath ? path.basename(r.filePath) : undefined,
        error: r.error,
      }));

      res.json({
        success: result.failed === 0,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        files: fileResults,
      });
    } catch (error) {
      console.error("Batch convert error:", error);
      res.status(500).json({ message: "Batch convert failed" });
    }
  });

  app.post("/api/file-ops/batch-resize", authMiddleware, superAdminMiddleware, upload.array("files", 50), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const width = parseInt(req.body.width) || 800;
      const height = req.body.height ? parseInt(req.body.height) : undefined;
      const imagePaths = files.filter(f => f.mimetype.startsWith("image/")).map(f => f.path);

      if (imagePaths.length === 0) {
        return res.status(400).json({ message: "No valid image files provided" });
      }

      const result = await fileProcessor.batchResizeImages(imagePaths, width, height);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_RESIZE",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length, width, height },
      });

      const fileResults = result.results.map(r => ({
        originalFile: path.basename(r.originalFile),
        success: r.success,
        downloadUrl: r.success && r.filePath ? `/api/file-ops/download/${path.basename(r.filePath)}` : undefined,
        fileName: r.success && r.filePath ? path.basename(r.filePath) : undefined,
        error: r.error,
      }));

      res.json({
        success: result.failed === 0,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        files: fileResults,
      });
    } catch (error) {
      console.error("Batch resize error:", error);
      res.status(500).json({ message: "Batch resize failed" });
    }
  });

  app.post("/api/file-ops/batch-watermark", authMiddleware, superAdminMiddleware, upload.array("files", 50), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const watermarkText = req.body.text || "CONFIDENTIAL";
      const pdfPaths = files.filter(f => f.mimetype === "application/pdf").map(f => f.path);

      if (pdfPaths.length === 0) {
        return res.status(400).json({ message: "No valid PDF files provided" });
      }

      const result = await fileProcessor.batchAddWatermark(pdfPaths, watermarkText);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_WATERMARK",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length, watermarkText },
      });

      const fileResults = result.results.map(r => ({
        originalFile: path.basename(r.originalFile),
        success: r.success,
        downloadUrl: r.success && r.filePath ? `/api/file-ops/download/${path.basename(r.filePath)}` : undefined,
        fileName: r.success && r.filePath ? path.basename(r.filePath) : undefined,
        error: r.error,
      }));

      res.json({
        success: result.failed === 0,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        files: fileResults,
      });
    } catch (error) {
      console.error("Batch watermark error:", error);
      res.status(500).json({ message: "Batch watermark failed" });
    }
  });

  app.post("/api/file-ops/batch-rotate", authMiddleware, superAdminMiddleware, upload.array("files", 50), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const degrees = parseInt(req.body.degrees) || 90;
      const pdfPaths = files.filter(f => f.mimetype === "application/pdf").map(f => f.path);

      if (pdfPaths.length === 0) {
        return res.status(400).json({ message: "No valid PDF files provided" });
      }

      const result = await fileProcessor.batchRotatePdfs(pdfPaths, degrees);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_ROTATE",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length, degrees },
      });

      const fileResults = result.results.map(r => ({
        originalFile: path.basename(r.originalFile),
        success: r.success,
        downloadUrl: r.success && r.filePath ? `/api/file-ops/download/${path.basename(r.filePath)}` : undefined,
        fileName: r.success && r.filePath ? path.basename(r.filePath) : undefined,
        error: r.error,
      }));

      res.json({
        success: result.failed === 0,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        files: fileResults,
      });
    } catch (error) {
      console.error("Batch rotate error:", error);
      res.status(500).json({ message: "Batch rotate failed" });
    }
  });

  app.post("/api/file-ops/batch-page-numbers", authMiddleware, superAdminMiddleware, upload.array("files", 50), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const position = (req.body.position || "bottom") as "top" | "bottom";
      const format = req.body.format || "Page {n} of {total}";
      const pdfPaths = files.filter(f => f.mimetype === "application/pdf").map(f => f.path);

      if (pdfPaths.length === 0) {
        return res.status(400).json({ message: "No valid PDF files provided" });
      }

      const result = await fileProcessor.batchAddPageNumbers(pdfPaths, position, format);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "BATCH_PAGE_NUMBERS",
        entityType: "DOCUMENT",
        metadata: { fileCount: files.length, position, format },
      });

      const fileResults = result.results.map(r => ({
        originalFile: path.basename(r.originalFile),
        success: r.success,
        downloadUrl: r.success && r.filePath ? `/api/file-ops/download/${path.basename(r.filePath)}` : undefined,
        fileName: r.success && r.filePath ? path.basename(r.filePath) : undefined,
        error: r.error,
      }));

      res.json({
        success: result.failed === 0,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        files: fileResults,
      });
    } catch (error) {
      console.error("Batch page numbers error:", error);
      res.status(500).json({ message: "Batch page numbers failed" });
    }
  });

  return httpServer;
}
