# Push Notification Management Portal - Phase 1 UI/UX Plan

This document outlines the UI/UX design and development plan for the front-end portal of the MOJO Push Notification System. The goal is to create a professional, clean, and intuitive interface for managing configurations, templates, devices, and deliveries.

## 1. Core Design Principles

- **Clarity & Hierarchy**: The UI will clearly distinguish between global (default) and group-specific configurations and templates.
- **Action-Oriented**: Key actions like sending test notifications, creating templates, and viewing deliveries will be easily accessible.
- **Data-Rich Views**: Detailed views will provide all necessary information without clutter, using tabs and data views to organize complex data.
- **Consistency**: The new pages will follow the established design patterns of the existing admin portal.

## 2. Portal Structure & Navigation

The Push Notification System will be integrated into the Admin Portal under a new top-level sidebar entry.

### Sidebar Navigation:

- **Push Notifications** (Top-level entry with `bi-broadcast` icon)
  - **Dashboard**: A new overview page with key metrics and quick access.
  - **Configurations**: Manage FCM/APNS credentials and settings.
  - **Templates**: Create and manage reusable notification templates.
  - **Deliveries**: View a log of all sent notifications.
  - **Registered Devices**: Browse and manage all user devices.

## 3. User Model & View Enhancements

To support per-group configurations, the `user.org` field is critical.

- **`src/models/User.js`**:
  - Add an `org` field to the `UserForms.edit` configuration to allow admins to assign a user to an organization (group). This will be a `collection` type field that searches for groups.
- **`src/admin/views/UserView.js`**:
  - Add the `org.name` field to the "Profile" tab's `DataView` to display the user's assigned organization.

## 4. Page-by-Page Breakdown

### 4.1. Push Dashboard (`PushDashboardPage.js`)

A new dashboard for a high-level overview of push notification activity.

- **Header Stats**:
  - Total Deliveries (24h)
  - Failed Deliveries (24h)
  - Registered Devices
  - Active Templates
- **Charts**:
  - **Delivery Status**: A Pie chart showing the distribution of statuses (sent, delivered, failed) for recent notifications.
  - **Notifications Over Time**: A Line chart showing delivery volume over the last 7 days.
- **Quick-Access Tables**:
  - **Recent Deliveries**: A compact table of the 10 most recent deliveries.
  - **Failed Deliveries**: A compact table of the 10 most recent failed deliveries.

### 4.2. Push Configurations (`PushConfigTablePage.js`)

A `TablePage` to manage `PushConfig` objects. The key UI challenge is distinguishing between the default config and group-specific configs.

- **Layout**: The page will feature a `TabView` with two tabs:
  - **Default Configuration**: A `DataView` showing the single default configuration. Actions to "Edit" or "Test".
  - **Group Configurations**: A `Table` listing all group-specific configurations.
- **Columns (for Group table)**: `Group Name`, `FCM Enabled`, `APNS Enabled`, `Test Mode`, `Is Active`.

### 4.3. Push Templates (`PushTemplateTablePage.js`)

A `TablePage` to manage `PushTemplate` objects, also distinguishing between default and group-specific templates.

- **Layout**: A `TabView` with two tabs:
  - **Default Templates**: A `Table` listing all templates where `group` is null.
  - **Group Templates**: A `Table` listing all templates assigned to a group.
- **Columns**: `Name`, `Category`, `Priority`, `Group`, `Is Active`.
- **`PushTemplateView.js`**: A detailed view showing the `title_template`, `body_template`, `action_url`, and a formatted list of `variables`.

### 4.4. Push Deliveries (`PushDeliveryTablePage.js`)

A `TablePage` to provide a comprehensive, searchable log of all sent notifications.

- **Columns**: `ID`, `Timestamp`, `User`, `Device`, `Title`, `Category`, `Status` (badge).
- **Filtering**: Advanced filters for `status`, `category`, `platform`, and date range.
- **`PushDeliveryView.js`**: A detailed view that presents the notification in a "mock" phone UI to give a realistic preview of what the user saw. It will include all delivery details, including any `error_message`.

### 4.5. Registered Devices (`PushDeviceTablePage.js`)

A `TablePage` to view all registered devices.

- **Columns**: `ID`, `User`, `Device Name`, `Platform`, `App Version`, `Push Enabled`, `Last Seen`.
- **Filtering**: Advanced filters for `platform` and `push_enabled` status.
- **`PushDeviceView.js`**: A detailed view showing all device info and a list of the user's `push_preferences`.

## 5. Implementation Plan

1.  **Update User Model & View**: Add the `org` field to the user edit form and display it in the user view.
2.  **Create Models**: Create new model files for `PushConfig`, `PushTemplate`, `PushDelivery`, and `PushDevice`.
3.  **Implement Configurations UI**:
    - Build `PushConfigTablePage` with the tabbed layout.
    - Create a `PushConfigView` for displaying/editing a single configuration.
4.  **Implement Templates UI**:
    - Build `PushTemplateTablePage` with the tabbed layout.
    - Build `PushTemplateView`.
5.  **Implement Deliveries UI**:
    - Build `PushDeliveryTablePage`.
    - Build the "mock phone" `PushDeliveryView`.
6.  **Implement Devices UI**:
    - Build `PushDeviceTablePage`.
    - Build `PushDeviceView`.
7.  **Implement Dashboard**: Build the `PushDashboardPage` as the final step.
8.  **Update Admin Entry Points**: Integrate all new pages into the sidebar.
