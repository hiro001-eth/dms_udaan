# UDAAN Document Management System

## Overview

UDAAN is an enterprise-grade web-based Document Management System (DMS) designed for consultancy companies to securely store, organize, and manage structured records of job applicants, clients, and business documents. The application provides comprehensive file management capabilities including upload, download, conversion, sharing, and version control, along with robust user management and audit logging for enterprise compliance.

Key capabilities include:
- Hierarchical folder/file organization similar to Google Drive
- File format conversion (PDF, images, documents) inspired by iLovePDF
- Secure sharing via 6-digit access codes with expiration
- Role-based access control (SUPER_ADMIN, ORG_ADMIN, MANAGER, STAFF, VIEWER)
- Activity tracking and audit logging
- Multi-organization (tenant) support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for Replit environment
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui (Radix primitives + Tailwind CSS)
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode)
- **Animations**: Framer Motion for transitions and effects
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a component-based architecture with:
- Pages under `client/src/pages/` (dashboard, files, documents, convert, shared, admin)
- Reusable UI components in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`
- Context providers for auth and theme in `client/src/lib/`

### Backend Architecture
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js with custom middleware
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Handling**: Multer for uploads, Sharp for image processing, pdf-lib for PDF manipulation
- **API Design**: RESTful endpoints under `/api/` prefix

The server uses a modular structure:
- `server/routes.ts` - API endpoint definitions with auth middleware
- `server/storage.ts` - Data access layer abstraction
- `server/services/fileProcessor.ts` - File conversion and manipulation logic
- `server/db.ts` - Database connection pool

### Database Design
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)

Core entities:
- Organizations (multi-tenant support)
- Users (with roles and organization membership)
- Folders (hierarchical structure with parent references)
- Documents (files with metadata, versioning, status)
- ShareCodes (secure document sharing)
- AuditLogs (action tracking for compliance)
- Sessions and UserActivity (authentication and analytics)

### Authentication & Authorization
- JWT-based authentication with access/refresh token pattern
- Role-based middleware for route protection
- Roles: SUPER_ADMIN (full access), ORG_ADMIN (organization scope), MANAGER, STAFF, VIEWER
- Default admin credentials: admin/admin123

### File Processing
- Image processing via Sharp (resize, format conversion, rotation)
- PDF manipulation via pdf-lib (merge, split, watermark, image-to-PDF)
- Archive creation via Archiver (ZIP downloads)
- Files stored in `uploads/` directory, processed files in `processed/`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- Uses `drizzle-kit` for schema migrations (`npm run db:push`)

### Key NPM Packages
- **pdf-lib**: PDF creation and manipulation
- **sharp**: Image processing and format conversion
- **archiver**: ZIP file creation for batch downloads
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT token generation and verification
- **multer**: Multipart form data handling for file uploads

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: JWT signing secret (defaults to development value)

### Third-Party Services
- No external API integrations currently configured
- Designed to be self-hosted or deployed on Replit infrastructure
