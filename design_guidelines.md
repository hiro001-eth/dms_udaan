# UDAAN Document Management System - Design Guidelines

## Design Approach

**Framework:** Material Design 3 principles with custom brand identity
**Rationale:** Enterprise document management requires information density, clear hierarchy, and functional efficiency. Material Design provides proven patterns for complex data displays, while our vibrant brand colors create visual distinction.

**Key References:**
- Google Drive: File hierarchy, list/grid views, quick actions
- iLovePDF: Tool-focused interfaces, conversion workflows
- Notion: Clean data tables, sidebar navigation

---

## Brand Identity

**Primary Colors:**
- Purple: `#8B5CF6` (primary actions, headers)
- Teal: `#14B8A6` (success states, file operations)
- Pink: `#EC4899` (alerts, sharing features)
- Yellow: `#F59E0B` (warnings, highlights)

**Neutral Palette:**
- Background: `#F9FAFB` (light), `#111827` (dark mode)
- Surface: `#FFFFFF` (light), `#1F2937` (dark)
- Text: `#111827` (primary), `#6B7280` (secondary)

**Gradients:**
- Hero/Feature cards: Purple-to-teal diagonal gradients
- Accent elements: Pink-to-yellow subtle overlays

---

## Typography

**Font Family:**
- Primary: Inter (via Google Fonts)
- Monospace: JetBrains Mono (file paths, code snippets)

**Scale:**
- Display: `text-4xl` (36px) - Dashboard headers
- Headings: `text-2xl` (24px) - Section titles
- Body: `text-base` (16px) - Content, tables
- Small: `text-sm` (14px) - Metadata, timestamps
- Micro: `text-xs` (12px) - Labels, badges

**Weight:**
- Bold: 700 - Primary CTAs, active states
- Semibold: 600 - Headings, table headers
- Medium: 500 - Navigation, buttons
- Regular: 400 - Body text

---

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: `p-4` to `p-6`
- Section spacing: `mb-8`, `mt-12`
- Card gaps: `gap-4` to `gap-6`

**Grid Structure:**
- Dashboard: Sidebar (280px fixed) + Main content (fluid)
- File grid: 4 columns (desktop), 2 (tablet), 1 (mobile)
- Form layouts: 2-column for related fields

**Container Max-widths:**
- Full-width dashboards: No max-width constraint
- Content areas: `max-w-7xl` (1280px)
- Modals/forms: `max-w-2xl` (672px)

---

## Component Library

### Navigation
**Sidebar:**
- Fixed left position, `w-72`, `bg-white` with subtle shadow
- Logo at top with 16px padding
- Navigation items: `py-3 px-4`, icons (20px) + text
- Active state: Purple background `bg-purple-50`, purple text
- Folder tree: Nested with 16px indent per level, collapse icons

**Top Bar:**
- `h-16`, white background, shadow-sm
- Search bar (center): `max-w-xl`, rounded-lg with purple focus ring
- Right actions: User avatar (40px circle), notifications icon

### File Display
**List View:**
- Table with alternating row backgrounds (`bg-gray-50` every other row)
- Columns: Icon (32px), Name, Size, Modified, Owner, Actions
- Row height: `h-12`, hover state with teal background tint
- Bulk selection: Checkboxes in left column

**Grid View:**
- Cards: `aspect-square`, rounded-lg, shadow-sm
- File preview thumbnail at top (if available)
- File name below (truncate with ellipsis)
- Metadata: Size, date in small text
- Hover: Lift effect with shadow-md

**File Actions:**
- Icon buttons (24px): Download, Share, Move, Delete
- Hover tooltips with dark background
- Dropdown menus for more actions

### Forms & Inputs
**Text Inputs:**
- `h-10`, rounded-md, border-gray-300
- Focus: Purple ring `ring-purple-500`
- Error: Red border and text below input

**Buttons:**
- Primary: Purple gradient background, white text, `h-10 px-6`
- Secondary: White background, purple border and text
- Danger: Pink background for delete actions
- Ghost: Transparent with hover background

**File Upload:**
- Drag-and-drop zone: Dashed border, teal on hover
- Large upload icon (48px) with instruction text
- Progress bars: Teal gradient fill

### Modals & Dialogs
**Structure:**
- Centered overlay with backdrop blur
- White card with rounded-xl corners
- Header: Gradient background (purple-to-teal), white text
- Body: `p-6` with form fields or content
- Footer: Action buttons aligned right

### Data Tables
**User Management Table:**
- Striped rows for readability
- Status badges: Green (active), gray (inactive)
- Action column: Edit/Delete icon buttons
- Sortable headers with arrow indicators

**Audit Logs:**
- Timeline view with left border (purple)
- Timestamp + user avatar on left
- Action description + metadata in expandable card
- Filter chips at top (by user, action, date)

### Sharing Interface
**6-Digit Code Display:**
- Large monospace font in centered card
- Copy button with teal background
- Expiration timer if applicable
- Permission toggles below (view/edit)

### Version History
**Timeline:**
- Vertical line with circular markers
- Each version: Avatar, timestamp, changes summary
- Restore button (secondary style) on hover
- Diff view option for document changes

---

## Dashboard Layouts

### Admin Dashboard
**Top Section:**
- Welcome header with admin name
- Quick stats cards (4-column grid): Total users, Active files, Storage used, Recent activity
- Each card: White background, purple icon, large number, trend indicator

**Main Content:**
- Recent activity feed (left 2/3): Timeline of user actions
- Quick actions panel (right 1/3): Create user, Upload file, View reports

### User Dashboard
**File Browser:**
- Breadcrumb navigation at top
- Toolbar: View switcher (list/grid), sort dropdown, filter button
- Main area: File list or grid based on selection
- Right sidebar (collapsible): File details panel with metadata

**Conversion Tool Page:**
- Two-column layout: Upload area (left), conversion options (right)
- Format selector with icons (PDF, JPG, DOCX, etc.)
- Preview panel after upload
- Convert button with progress indicator

---

## Interactions

**Minimal Animations:**
- Navigation transitions: 150ms ease-in-out
- Button hovers: Scale 1.02 with shadow increase
- Modal entry: Fade + scale from 0.95
- File upload: Progress bar smooth fill
- Toast notifications: Slide in from top-right

**Loading States:**
- Skeleton screens for file lists (pulsing gray rectangles)
- Spinner for conversions (purple circular)
- Progress bars for uploads (teal gradient)

---

## Images

**Logo Placement:**
- Sidebar top: 200px width, centered, 24px top padding
- Login page: 240px width, centered above form
- Email templates: 160px width

**Illustrations:**
- Empty states: Simple line art illustrations in purple/teal
- Error pages: Friendly illustrations with action prompts
- Onboarding: Step-by-step graphics

**No hero images** - This is a utility application focused on productivity, not marketing.

---

## Accessibility

- All interactive elements: Minimum 44px touch target
- Color contrast: WCAG AA minimum (4.5:1 for text)
- Keyboard navigation: Visible focus rings (purple, 2px)
- Screen reader labels for all icons and actions
- Form validation: Clear error messages with icons