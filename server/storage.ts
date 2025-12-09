import {
  users, folders, documents, documentTags, documentVersions, shareCodes,
  auditLogs, sessions, userActivity, organizations,
  type User, type InsertUser, type Folder, type InsertFolder,
  type Document, type InsertDocument, type DocumentTag, type InsertDocumentTag,
  type DocumentVersion, type InsertDocumentVersion, type ShareCode, type InsertShareCode,
  type AuditLog, type InsertAuditLog, type Session, type InsertSession,
  type UserActivity, type InsertUserActivity, type Organization, type InsertOrganization
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  getFolder(id: string): Promise<Folder | undefined>;
  getFoldersByParent(parentId: string | null): Promise<Folder[]>;
  getFolderWithContents(id: string | null): Promise<{ folder: Folder | null; children: Folder[]; documents: Document[] }>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: string, data: Partial<InsertFolder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<void>;
  
  getDocument(id: string): Promise<Document | undefined>;
  getDocuments(filters?: { folderId?: string; status?: string; limit?: number }): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
  
  createDocumentTag(tag: InsertDocumentTag): Promise<DocumentTag>;
  getDocumentTags(documentId: string): Promise<DocumentTag[]>;
  deleteDocumentTags(documentId: string): Promise<void>;
  
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  getDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
  
  getShareCode(code: string): Promise<ShareCode | undefined>;
  getShareCodesByCreator(userId: string): Promise<ShareCode[]>;
  createShareCode(share: InsertShareCode): Promise<ShareCode>;
  updateShareCode(id: string, data: Partial<InsertShareCode>): Promise<ShareCode | undefined>;
  deleteShareCode(id: string): Promise<void>;
  incrementShareCodeUsage(id: string): Promise<void>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: string; action?: string; limit?: number }): Promise<AuditLog[]>;
  
  createSession(session: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivity(userId: string, date?: Date): Promise<UserActivity[]>;
  updateUserActivity(id: string, data: Partial<InsertUserActivity>): Promise<void>;
  
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  
  getDashboardStats(): Promise<{ totalDocuments: number; totalFolders: number; recentUploads: number; sharedItems: number }>;
  getAdminStats(): Promise<{ totalUsers: number; activeUsers: number; totalDocuments: number; totalFolders: number; storageUsedMB: number; recentLogins: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder || undefined;
  }

  async getFoldersByParent(parentId: string | null): Promise<Folder[]> {
    if (parentId === null) {
      return db.select().from(folders).where(isNull(folders.parentFolderId)).orderBy(folders.name);
    }
    return db.select().from(folders).where(eq(folders.parentFolderId, parentId)).orderBy(folders.name);
  }

  async getFolderWithContents(id: string | null): Promise<{ folder: Folder | null; children: Folder[]; documents: Document[] }> {
    let folder: Folder | null = null;
    if (id) {
      const [f] = await db.select().from(folders).where(eq(folders.id, id));
      folder = f || null;
    }
    
    const children = await this.getFoldersByParent(id);
    
    let docs: Document[];
    if (id === null) {
      docs = await db.select().from(documents).where(isNull(documents.folderId)).orderBy(desc(documents.uploadedAt));
    } else {
      docs = await db.select().from(documents).where(eq(documents.folderId, id)).orderBy(desc(documents.uploadedAt));
    }
    
    return { folder, children, documents: docs };
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const [folder] = await db.insert(folders).values(insertFolder).returning();
    return folder;
  }

  async updateFolder(id: string, data: Partial<InsertFolder>): Promise<Folder | undefined> {
    const [folder] = await db.update(folders).set({ ...data, updatedAt: new Date() }).where(eq(folders.id, id)).returning();
    return folder || undefined;
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async getDocuments(filters?: { folderId?: string; status?: string; limit?: number }): Promise<Document[]> {
    let query = db.select().from(documents);
    const conditions = [];
    
    if (filters?.folderId) {
      conditions.push(eq(documents.folderId, filters.folderId));
    }
    if (filters?.status) {
      conditions.push(eq(documents.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(documents.uploadedAt)).limit(filters?.limit || 100);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(insertDocument).returning();
    return doc;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const [doc] = await db.update(documents).set({ ...data, updatedAt: new Date() }).where(eq(documents.id, id)).returning();
    return doc || undefined;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.update(documents).set({ status: "DELETED" }).where(eq(documents.id, id));
  }

  async createDocumentTag(tag: InsertDocumentTag): Promise<DocumentTag> {
    const [created] = await db.insert(documentTags).values(tag).returning();
    return created;
  }

  async getDocumentTags(documentId: string): Promise<DocumentTag[]> {
    return db.select().from(documentTags).where(eq(documentTags.documentId, documentId));
  }

  async deleteDocumentTags(documentId: string): Promise<void> {
    await db.delete(documentTags).where(eq(documentTags.documentId, documentId));
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [created] = await db.insert(documentVersions).values(version).returning();
    return created;
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)).orderBy(desc(documentVersions.versionNumber));
  }

  async getShareCode(code: string): Promise<ShareCode | undefined> {
    const [share] = await db.select().from(shareCodes).where(eq(shareCodes.code, code));
    return share || undefined;
  }

  async getShareCodesByCreator(userId: string): Promise<ShareCode[]> {
    return db.select().from(shareCodes).where(eq(shareCodes.createdBy, userId)).orderBy(desc(shareCodes.createdAt));
  }

  async createShareCode(share: InsertShareCode): Promise<ShareCode> {
    const [created] = await db.insert(shareCodes).values(share).returning();
    return created;
  }

  async updateShareCode(id: string, data: Partial<InsertShareCode>): Promise<ShareCode | undefined> {
    const [updated] = await db.update(shareCodes).set(data).where(eq(shareCodes.id, id)).returning();
    return updated || undefined;
  }

  async deleteShareCode(id: string): Promise<void> {
    await db.delete(shareCodes).where(eq(shareCodes.id, id));
  }

  async incrementShareCodeUsage(id: string): Promise<void> {
    await db.update(shareCodes).set({ usageCount: sql`${shareCodes.usageCount} + 1` }).where(eq(shareCodes.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(filters?: { userId?: string; action?: string; limit?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 100);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db.insert(sessions).values(session).returning();
    return created;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.refreshToken, token));
    return session || undefined;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [created] = await db.insert(userActivity).values(activity).returning();
    return created;
  }

  async getUserActivity(userId: string, date?: Date): Promise<UserActivity[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return db.select().from(userActivity)
        .where(and(
          eq(userActivity.userId, userId),
          sql`${userActivity.date} >= ${startOfDay}`,
          sql`${userActivity.date} <= ${endOfDay}`
        ));
    }
    return db.select().from(userActivity).where(eq(userActivity.userId, userId)).orderBy(desc(userActivity.date));
  }

  async updateUserActivity(id: string, data: Partial<InsertUserActivity>): Promise<void> {
    await db.update(userActivity).set(data).where(eq(userActivity.id, id));
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async getDashboardStats(): Promise<{ totalDocuments: number; totalFolders: number; recentUploads: number; sharedItems: number }> {
    const [docCount] = await db.select({ count: sql<number>`count(*)` }).from(documents).where(eq(documents.status, "ACTIVE"));
    const [folderCount] = await db.select({ count: sql<number>`count(*)` }).from(folders);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [recentCount] = await db.select({ count: sql<number>`count(*)` }).from(documents)
      .where(and(
        eq(documents.status, "ACTIVE"),
        sql`${documents.uploadedAt} >= ${sevenDaysAgo}`
      ));
    
    const [shareCount] = await db.select({ count: sql<number>`count(*)` }).from(shareCodes).where(eq(shareCodes.isActive, true));
    
    return {
      totalDocuments: Number(docCount?.count) || 0,
      totalFolders: Number(folderCount?.count) || 0,
      recentUploads: Number(recentCount?.count) || 0,
      sharedItems: Number(shareCount?.count) || 0,
    };
  }

  async getAdminStats(): Promise<{ totalUsers: number; activeUsers: number; totalDocuments: number; totalFolders: number; storageUsedMB: number; recentLogins: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [activeUserCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true));
    const [docCount] = await db.select({ count: sql<number>`count(*)` }).from(documents);
    const [folderCount] = await db.select({ count: sql<number>`count(*)` }).from(folders);
    
    const [storageSum] = await db.select({ sum: sql<number>`coalesce(sum(${documents.sizeBytes}), 0)` }).from(documents);
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const [loginCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs)
      .where(and(
        eq(auditLogs.action, "LOGIN"),
        sql`${auditLogs.createdAt} >= ${oneDayAgo}`
      ));
    
    return {
      totalUsers: Number(userCount?.count) || 0,
      activeUsers: Number(activeUserCount?.count) || 0,
      totalDocuments: Number(docCount?.count) || 0,
      totalFolders: Number(folderCount?.count) || 0,
      storageUsedMB: Math.round((Number(storageSum?.sum) || 0) / (1024 * 1024)),
      recentLogins: Number(loginCount?.count) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
