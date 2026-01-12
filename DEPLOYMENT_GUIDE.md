# Deploying to Netlify

Great choice! Netlify is excellent for hosting React applications.

I have already prepared your project for deployment:
1.  **Ran a successful build** (checked and verified).
2.  **Created `netlify.toml`** file. This is crucial—it tells Netlify to redirect all traffic to `index.html` so that refreshing pages (like `/dashboard`) doesn't give a 404 error.

## Option 1: Drag and Drop (Easiest)

1.  Go to the [Netlify Website](https://app.netlify.com/) and log in.
2.  Go to the **"Sites"** tab.
3.  Locate the folder: `c:\Users\sajee\OneDrive - SONA COLLEGE OF TECHNOLOGY\Documents\Projects\Team Mnagement\dist` on your computer.
    *   **Note:** Make sure you upload the **`dist`** folder, NOT the whole project folder. The `dist` folder was just created by the build command.
4.  Drag and drop the entire `dist` folder onto the area that says "Drag and drop your site output folder here".
5.  Your site will be live in seconds!

## Option 2: Connect via GitHub (Recommended for automatic updates)

1.  Push your code to GitHub (if you haven't already).
2.  Log in to Netlify and click **"Add new site"** -> **"Import from an existing project"**.
3.  Choose **GitHub**.
4.  Select your repository (`Team-Management` or similar).
5.  Netlify will detect the settings automatically:
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
6.  **Environment Variables:**
    *   This is important! You need to add your Supabase credentials to Netlify's "Environment variables" section.
    *   Key: `VITE_SUPABASE_URL` -> (Value from your .env file)
    *   Key: `VITE_SUPABASE_PUBLISHABLE_KEY` -> (Value from your .env file)
7.  Click **Deploy Site**.

## Option 3: Netlify CLI (Command Line)

If you have the Netlify CLI installed:
1.  Run `npm install netlify-cli -g` (if not installed).
2.  Run `netlify login`.
3.  Run `netlify deploy --prod`.
4.  When asked for the **Publish directory**, type: `dist`.

**Done!** Your team management app will be live and accessible to your whole team.
