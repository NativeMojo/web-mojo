# Incident & Ticket Management Portal - Phase 1 UI/UX Plan

This document outlines the UI/UX design and development plan for the front-end portal of the MOJO Incident Management System. The goal is to create a professional, clean, and intuitive interface that aligns with the powerful features of the backend API.

## 1. Core Design Principles

- **Clarity & Focus**: Each page will have a clear purpose. Information will be presented in a scannable, hierarchical manner.
- **Consistency**: All views (Incidents, Events, Tickets, Rules) will share a consistent layout, header structure, and interaction patterns.
- **Action-Oriented**: The UI will make it easy to perform key actions (e.g., changing state, assigning tickets, creating rules) directly from the relevant view.
- **Responsive Design**: All pages and views will be fully responsive, ensuring a seamless experience on both desktop and mobile devices.
- **KISS (Keep It Simple, Stupid)**: The UI will avoid clutter, presenting complex information in digestible formats like tabs, data views, and modals.

## 2. Portal Structure & Navigation

The Incident Management System will be integrated into the existing Admin Portal with a new top-level sidebar entry.

### Sidebar Navigation:

- **Incidents & Tickets** (Top-level entry with `bi-shield-exclamation` icon)
  - **Dashboard**: A new overview page with key metrics and quick access lists.
  - **Incidents**: The existing `IncidentTablePage`, which will be enhanced.
  - **Tickets**: A new `TicketTablePage` for managing all tickets.
  - **Events**: The existing `EventTablePage`.
  - **Rule Engine**: A new `RuleSetTablePage` for managing all rule sets.

## 3. Page-by-Page Breakdown

### 3.1. Incident Dashboard (`IncidentDashboardPage.js`)

A new, dedicated dashboard to provide an at-a-glance overview of the system's health.

- **Header Stats**:
  - Open Incidents
  - Unassigned Tickets
  - High-Priority Incidents (Priority > 7)
  - Events in Last 24h
- **Charts**:
  - **Incidents by State**: A Pie chart showing the distribution of incidents (open, investigating, resolved).
  - **Events Over Time**: A Line chart showing event volume over the last 7 days, categorized by level (info, warning, error).
- **Quick-Access Tables**:
  - **My Open Tickets**: A compact table showing tickets assigned to the current user.
  - **Recent High-Priority Incidents**: A table listing the 5 most recent incidents with a priority > 7.

### 3.2. Incident Management

#### `IncidentTablePage.js` (Enhancements)

- **Columns**: Add `assignee` and `ticket_count` columns.
- **Filtering**: Add advanced filters for `state`, `priority`, and `assignee`.
- **View**: Use the `IncidentView` for the detailed item view.

#### `IncidentView.js` (New Component)

A comprehensive view for a single incident, designed for investigation and management.

- **Header**:
  - Prominently display Incident ID, Title, State (as a colored badge), and Priority.
  - Show key context: Category, Created Date, and links to related models if present.
  - Context menu with actions: `Create Ticket`, `Change State`, `Set Priority`, `Delete`.
- **Tabs**:
  - **Overview**: A `DataView` showing all core incident fields.
  - **Events**: A `Table` listing all associated events that triggered this incident.
  - **History & Comments**: A timeline view displaying both system-generated history (e.g., "State changed to Investigating") and user-added comments. A form at the bottom will allow users to add new comments.
  - **Tickets**: A `Table` listing all tickets created from this incident.

### 3.3. Rule Engine Management

#### `RuleSetTablePage.js` (New Page)

A `TablePage` for managing all `RuleSet` objects.

- **Columns**: `ID`, `Name`, `Category`, `Priority`, `Match Logic` (`ALL`/`ANY`), `Enabled`.
- **Actions**: `View/Edit`, `Delete`, `Enable/Disable` toggle.

#### `RuleSetView.js` (New Component)

A detailed view for a single `RuleSet`, allowing for the management of its associated rules.

- **Header**: Display RuleSet Name, Category, and Priority.
- **Tabs**:
  - **Configuration**: A `DataView` showing the RuleSet's configuration (`match_by`, `bundle_by`, `handler`, etc.).
  - **Rules**: A `Table` listing all `Rule` objects associated with this RuleSet. This table will have its own `Add`, `Edit`, and `Delete` actions to manage the rules directly within the context of the RuleSet.

### 3.4. Ticket System

#### `TicketTablePage.js` (New Page)

A `TablePage` for managing all `Ticket` objects. This will be the central hub for support and response teams.

- **Columns**: `ID`, `Title`, `Status` (badge), `Priority`, `Assignee`, `Incident ID`, `Created Date`.
- **Filtering**: Advanced filters for `status`, `priority`, and `assignee`.
- **Actions**: `View/Edit`, `Delete`.

#### `TicketView.js` (New Component)

A clean, professional view for a single ticket, designed for clear communication and resolution tracking.

- **Header**:
  - Prominently display Ticket ID and Title.
  - Show Status (badge), Priority, and Assignee (with avatar).
  - Context menu with actions: `Change Status`, `Set Priority`, `Assign User`.
- **Main Content (Two-Column Layout)**:
  - **Left Column (75%)**:
    - **Description**: The main ticket description, rendered as Markdown.
    - **Notes & Activity**: A timeline of all comments (`TicketNote` objects) and status changes. A rich text editor at the bottom will allow for adding new notes and attaching files.
  - **Right Column (25%)**:
    - **Details**: A `DataView` showing key ticket metadata:
      - Linked Incident (clickable)
      - Reporter
      - Created Date
      - Last Updated
      - Due Date (Phase 2)
      - Labels (Phase 2)

## 4. Implementation Plan

The development will proceed in the following order to ensure a logical build-out of features:

1.  **Models**: Create or update the front-end models for `RuleSet`, `Rule`, `Ticket`, and `TicketNote`.
2.  **Rule Engine UI**:
    - Build `RuleSetTablePage`.
    - Build `RuleSetView` with the nested `Rules` table.
3.  **Ticket System UI**:
    - Build `TicketTablePage`.
    - Build the `TicketView` component with its two-column layout and notes timeline.
4.  **Incident View Enhancements**:
    - Update `IncidentView` to include the "History & Comments" and "Tickets" tabs.
5.  **Dashboard**:
    - Build the `IncidentDashboardPage` as the final piece, tying all the new components together.

This phased approach ensures that the foundational elements are in place before building the higher-level summary and dashboard views.
