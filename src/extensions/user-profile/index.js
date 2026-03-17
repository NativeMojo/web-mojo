/**
 * User Profile Extension
 *
 * Rich user profile dialog with 11+ navigable sections:
 * Profile, Personal, Security, Connected, Sessions, Devices,
 * Security Events, Activity, Notifications, API Keys, Groups, Permissions.
 *
 * Also includes the post-login passkey setup prompt.
 */

// Main views
export { default as UserProfileView } from './views/UserProfileView.js';
export { default as PasskeySetupView } from './views/PasskeySetupView.js';

// Sections (for extension / override)
export { default as ProfileOverviewSection } from './views/ProfileOverviewSection.js';
export { default as ProfilePersonalSection } from './views/ProfilePersonalSection.js';
export { default as ProfileSecuritySection } from './views/ProfileSecuritySection.js';
export { default as ProfileConnectedSection } from './views/ProfileConnectedSection.js';
export { default as ProfileSessionsSection } from './views/ProfileSessionsSection.js';
export { default as ProfileDevicesSection } from './views/ProfileDevicesSection.js';
export { default as ProfileSecurityEventsSection } from './views/ProfileSecurityEventsSection.js';
export { default as ProfileActivitySection } from './views/ProfileActivitySection.js';
export { default as ProfileNotificationsSection } from './views/ProfileNotificationsSection.js';
export { default as ProfileApiKeysSection } from './views/ProfileApiKeysSection.js';
export { default as ProfileGroupsSection } from './views/ProfileGroupsSection.js';
export { default as ProfilePermissionsSection } from './views/ProfilePermissionsSection.js';
