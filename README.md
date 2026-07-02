# ChatConnect

ChatConnect is a modern, responsive instant messaging web application built with React, Next.js (App Router), Tailwind CSS, and Firebase. It supports real-time text messaging, audio recording, and PDF file sharing.

## Technologies Used

*   **React + Next.js (App Router):** For building the user interface and routing.
*   **TypeScript:** For type safety and better developer experience.
*   **Tailwind CSS:** For styling, including responsive design and dark mode.
*   **Firebase Authentication:** For user login (Email/Password & Google).
*   **Cloud Firestore:** For real-time database storage of users, conversations, and messages.
*   **Firebase Storage:** For storing uploaded audio messages and PDF files.
*   **Zustand:** For global state management (Authentication and Chat Selection).

## Prerequisites

*   Node.js 18+ installed.
*   A Firebase project with Authentication, Firestore, and Storage enabled.

## Firebase Configuration

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project or select an existing one.
3.  **Authentication:** Enable "Email/Password" and "Google" sign-in methods.
4.  **Firestore Database:** Create a Firestore database.
5.  **Storage:** Create a Storage bucket.
6.  **Security Rules:** Update your Firestore and Storage security rules (see below).
7.  **Web App:** Register a web app in your Firebase project and copy the configuration object.

Create a file named `firebase-applet-config.json` in the root of your project and add your Firebase configuration:

```json
{
  "projectId": "your-project-id",
  "appId": "your-app-id",
  "apiKey": "your-api-key",
  "authDomain": "your-auth-domain",
  "storageBucket": "your-storage-bucket",
  "messagingSenderId": "your-messaging-sender-id",
  "measurementId": "your-measurement-id"
}
```

Alternatively, you can use `.env` variables if you prefer to adapt `lib/firebase.ts`.

### Security Rules

**Firestore (`firestore.rules`):**
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isParticipant(conversationId) {
      return isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && request.auth.uid in resource.data.participants;
      allow create: if isSignedIn() && request.auth.uid in request.resource.data.participants;
      allow update: if isSignedIn() && request.auth.uid in resource.data.participants;
    }
    match /messages/{messageId} {
      allow read: if isSignedIn() && isParticipant(resource.data.conversationId);
      allow create: if isSignedIn() && isParticipant(request.resource.data.conversationId) && request.auth.uid == request.resource.data.senderId;
    }
  }
}
```

**Storage (`storage.rules`):**
```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chats/{conversationId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Installation

1.  Clone the repository or download the project files.
2.  Open the project in VS Code.
3.  Run the following command to install dependencies:

```bash
npm install
```

## Local Development

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Build

To create a production build, run:

```bash
npm run build
```

## Deploy on Netlify

This project uses Next.js, which is fully supported by Netlify.

1.  Push your code to a GitHub, GitLab, or Bitbucket repository.
2.  Log in to [Netlify](https://www.netlify.com/).
3.  Click **"Add new site"** -> **"Import an existing project"**.
4.  Connect your Git provider and select your repository.
5.  Netlify will automatically detect Next.js and set the build settings:
    *   **Build command:** `npm run build`
    *   **Publish directory:** `.next`
6.  Click **"Deploy site"**.
7.  **IMPORTANT:** Go to Site Settings > Environment variables and add your Firebase credentials so the app can connect to your database in production. Add the following variables:
    *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    *   `NEXT_PUBLIC_FIREBASE_APP_ID`
    *   `NEXT_PUBLIC_FIREBASE_API_KEY`
    *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
8.  Trigger a new deploy from the Netlify dashboard so the new environment variables take effect.
