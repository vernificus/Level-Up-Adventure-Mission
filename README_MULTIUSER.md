# Multi-User System Implementation

This project is configured to support multiple teachers and multiple classes using **Firebase**.

## Architecture

- **Backend:** Firebase (Authentication & Cloud Firestore)
- **Frontend:** React (Vite)
- **State Management:** React Context + Hooks

## Configuration

The Firebase configuration is located in `src/services/firebase.js`. It is currently set up with the provided project credentials.

## User Guide

### For Teachers
1. Select **"I am a Teacher"** on the home screen.
2. Sign up for an account.
3. Use the **+** button to create a class.
4. Share the **Class Code** with your students.
5. Click on a class to view pending submissions and approve them.

### For Students
1. Select **"I am a Student"** on the home screen.
2. Enter the **Class Code** provided by your teacher.
3. Enter your name.
4. Complete activities and submit them!

## Development

If you wish to switch back to a local-only mock backend for development purposes:
1. Open `src/context/AuthContext.jsx`.
2. Change the import `import { realBackend as backend } from '../services/realBackend';` to `import { mockBackend as backend } from '../services/mockBackend';`.
3. Do the same for `src/hooks/useGameState.js` and `src/components/TeacherPortal.jsx`.
