# Hosting Guide: Google Sites & GitHub Pages

Since this is a dynamic React application (using Vite and Firebase), it cannot be hosted *directly* as a native Google Site page (which uses a drag-and-drop builder). However, you can easily **host the app on GitHub Pages** (which is already set up in this repository) and then **embed** it into your Google Site.

## Step 1: Deploy to GitHub Pages

This repository is already configured to automatically deploy to GitHub Pages whenever you push code to the `main` branch.

1.  Push your latest changes to GitHub.
2.  Go to your repository on GitHub.
3.  Click on the **Actions** tab.
4.  You should see a workflow named "Deploy to GitHub Pages" running. Wait for it to turn green (Success).
5.  Once finished, click on the **Deploy** job or go to **Settings > Pages** in your repository.
6.  You will see your live URL. It usually looks like:
    `https://<your-username>.github.io/<repository-name>/`

## Step 2: Embed in Google Sites

Now that your app is live on the web, you can put it inside your Google Site.

1.  Open your Google Site in the editor.
2.  On the right sidebar, click **Insert**.
3.  Click **Embed**.
4.  Select the **By URL** tab.
5.  Paste your GitHub Pages URL (from Step 1).
    *   *Note:* You might see a preview. Choose "Whole page" if asked.
6.  Click **Insert**.
7.  Resize the embedded box to fill the screen or the desired area.

### Important Note on Mobile
When embedding in Google Sites, the app runs inside an "iframe". This works well on desktop, but on mobile devices, users might need to scroll within the frame. Test it on a mobile device to ensure the experience is smooth.

## Alternative: Firebase Hosting

Since this application uses Firebase for the backend (Database & Auth), you can also host the frontend on **Firebase Hosting**. This is often faster and provides a cleaner URL.

1.  Install the Firebase CLI: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize: `firebase init hosting`
    *   Select your existing project.
    *   Public directory: `dist`
    *   Configure as a single-page app: **Yes**
    *   Set up automatic builds and deploys with GitHub: **Yes** (Optional, creates a workflow similar to the existing one)
4.  Build the app: `npm run build`
5.  Deploy: `firebase deploy`

This will give you a URL like `https://<your-project-id>.web.app`, which you can also embed in Google Sites using the same method above.
