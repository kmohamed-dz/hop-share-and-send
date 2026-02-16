# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Mobile app (Capacitor)

This project is configured for Capacitor with:

- `appId`: `com.maak.app`
- `appName`: `MAAK`
- `webDir`: `dist`
- config file: `capacitor.config.ts`

### 1) Install Capacitor dependencies

```sh
npm i @capacitor/core @capacitor/cli
```

If your environment blocks npm registry access, install with your allowed package manager and then run the same Cap commands.

### 2) Initialize and build web assets

```sh
npx cap init MAAK com.maak.app
npm run build
```

> Vite build output is `dist/`, which matches Capacitor `webDir`.

### 3) Add mobile platforms and sync

```sh
npx cap add android
npx cap add ios
npx cap sync
```

### 4) Mobile icon & splash placeholders

Placeholder files are available in `resources/`:

- `resources/icon-placeholder.svg`
- `resources/splash-placeholder.svg`

After replacing them with your final branding assets, generate native resources:

```sh
npx @capacitor/assets generate
```

### 5) Build Android (APK/AAB)

```sh
npm run build
npx cap sync android
npx cap open android
```

Then in Android Studio:

1. Select **Build > Generate Signed Bundle / APK**.
2. Choose **Android App Bundle (AAB)** for Play Store or **APK** for direct install.
3. Configure keystore and build variant (`release`).

### 6) Build iOS

```sh
npm run build
npx cap sync ios
npx cap open ios
```

Then in Xcode:

1. Select your target + signing team.
2. Choose a device/simulator.
3. Use **Product > Archive** for TestFlight/App Store.

## SPA routing notes (web + mobile)

- App router uses `HashRouter` to avoid refresh 404s in static/mobile webviews.
- `vercel.json` includes an SPA rewrite fallback to `index.html`.

## Supabase OTP SMS setup (required)

If you see `Le service SMS n'est pas encore configuré…`, Supabase Auth is not configured for phone OTP yet.

1. In Supabase Dashboard: **Authentication → Providers → Phone**
   - Enable **Phone sign-in**.
   - Configure one SMS provider:
     - **Twilio**: Account SID, Auth Token, Messaging Service SID (or From number).
     - **MessageBird**: Access Key and Originator.
   - Save.
2. In **Authentication → URL Configuration**:
   - Set **Site URL** to your production app URL.
   - Add all required **Redirect URLs** (preview + production), including your Vercel and Lovable/v0 domains.
3. Real end-to-end verification:
   - Test with `+213552623560`.
   - Confirm SMS is actually received, then verify OTP in the app.

> Note: phone OTP delivery is controlled by Supabase Auth provider configuration. App code cannot send SMS if Twilio/MessageBird is not configured.
