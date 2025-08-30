# Ticket System & Reusable ChatView - UI/UX Plan

This document outlines the plan to build a professional ticket management interface, centered around a highly reusable, chat-style component for displaying notes and activity history.

## 1. Core Design & Architecture: The Adapter Pattern

To ensure maximum reusability, we will create a generic `ChatView` component. This component will not have any direct knowledge of `Tickets` or `Incidents`. Instead, it will be designed to render a standardized "chat item" object.

We will then create **Adapters** whose sole responsibility is to fetch data from a specific source (like the `TicketNoteList` or `IncidentHistoryList` collection) and transform it into the standard format that `ChatView` expects.

This approach allows us to use the exact same `ChatView` component for both Tickets and Incidents without any backend changes.

**Standardized Chat Item Format:**
```javascript
{
  id: 'note-123', // Unique ID for the item
  type: 'user_comment', // or 'system_event'
  author: {
    name: 'Ian Smith',
    avatarUrl: '...'
  },
  timestamp: 1756517546, // UNIX epoch
  content: 'This is the note content. It can be Markdown.',
  attachments: [
    {
      id: 'file-45',
      filename: 'screenshot.png',
      url: '...',
      thumbnailUrl: '...',
      contentType: 'image/png'
    }
  ]
}
```

## 2. Component Breakdown & Implementation Plan

### 2.1. `TicketView.js` (Refactor)

The `TicketView` will be refactored to adopt a modern, two-column layout.

- **Left Column (Primary)**: Contains the main ticket description.
- **Right Column (Secondary)**: Will be entirely dedicated to the new `ChatView` component.

### 2.2. `ChatView.js` (New Reusable Component)

This is the core of the new system.

- **Props**: It will accept an `adapter` prop.
- **Responsibilities**:
  - On initialization, it will call `adapter.fetch()` to get the initial list of chat items.
  - It will render the list of items using the `ChatMessageView` component.
  - It will contain the `ChatInputView` for adding new notes.
  - When a new note is submitted via the input, it will call `adapter.addNote(data)` to persist the new note and then refresh its display.

### 2.3. `ChatMessageView.js` (New Component)

Renders a single, standardized "chat item" object.

- **User Comment Style**: Displays avatar, author name, timestamp, and content. Renders file attachments using `FilePreviewView`.
- **System Event Style**: A visually distinct, more compact style (e.g., centered with an icon and minimal text) to clearly separate automated log entries from user conversations.

### 2.4. `ChatInputView.js` (New Component)

The input form at the bottom of the `ChatView`.

- **Features**:
  - A `textarea` for the note content.
  - **FileDropMixin**: The entire component will be a drop zone for attachments.
  - **FileUpload Service**: Integrates with the `FileUpload` service to handle uploads.
    - Shows inline progress for each file being uploaded.
    - Allows cancellation of individual uploads.
  - **Events**: Emits a `note:submit` event with the text content and an array of successfully uploaded file models.

### 2.5. `FilePreviewView.js` (New Component)

A small, reusable component to display file attachments within `ChatMessageView` and `ChatInputView`.

- **Image**: Shows a clickable thumbnail that opens in `LightboxGallery`.
- **PDF**: Shows a clickable icon/filename that opens in `PDFViewer`.
- **Other**: Shows a generic file icon and filename.

### 2.6. Adapters (New Modules)

These modules bridge the gap between our specific data models and the generic `ChatView`.

- **`TicketNoteAdapter.js`**:
  - `fetch()`: Fetches the `TicketNoteList` collection.
  - `transform(note)`: Converts a `TicketNote` model into the standard chat item format.
  - `addNote(data)`: Creates and saves a new `TicketNote` model.
- **`IncidentHistoryAdapter.js`**:
  - `fetch()`: Fetches the `IncidentHistoryList` collection.
  - `transform(history)`: Converts an `IncidentHistory` model into the standard chat item format. It will map the `kind` field to the `type` property (e.g., 'comment' -> 'user_comment', 'state_change' -> 'system_event').
  - `addNote(data)`: Creates and saves a new `IncidentHistory` model.

## 3. Implementation Steps

1.  **Create `docs/dev/tickets.md`**: Formalize this plan. (This step)
2.  **Create Adapters**:
    - `src/admin/adapters/TicketNoteAdapter.js`
    - `src/admin/adapters/IncidentHistoryAdapter.js`
3.  **Create UI Components**:
    - `src/admin/components/FilePreviewView.js`
    - `src/admin/components/ChatInputView.js` (with FileDropMixin)
    - `src/admin/components/ChatMessageView.js`
    - `src/admin/components/ChatView.js`
4.  **Integrate into Views**:
    - Refactor `TicketView.js` to use `ChatView` with the `TicketNoteAdapter`.
    - Create an "History & Comments" tab in `IncidentView.js` that uses `ChatView` with the `IncidentHistoryAdapter`.

This plan creates a powerful, reusable, and maintainable chat interface that can be easily extended to other parts of the application in the future.