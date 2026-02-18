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

- `resources/maak-logo.svg`
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
   - Set **Site URL** to your production app URL, for example:
     - `https://kmohamed-dz.github.io/hop-share-and-send/`
   - Add all required **Redirect URLs** (preview + production), including localhost, GitHub Pages, and your Vercel/Lovable domains as applicable, for example:
     - `http://localhost:8080/`
     - `https://kmohamed-dz.github.io/hop-share-and-send/`
   - Save.
3. Real end-to-end verification:
   - Test with an Algerian number normalized to `+213` format (e.g. `+213552623560`).
   - Confirm SMS is actually received, then verify OTP in the app.

> Note: phone OTP delivery is controlled by Supabase Auth provider configuration. App code cannot send SMS if Twilio/MessageBird is not configured.


## Entry flow (AuthGate)

The app now enforces this startup flow on every launch:

1. New/guest user (no session):
   - if `maak_onboarding_done !== "true"` -> `/onboarding/welcome`
   - else -> `/auth/login`
2. Authenticated user with incomplete profile -> `/auth/profile-setup`
3. Authenticated user with complete profile -> `/`

Local storage keys:

- `maak_onboarding_done`
- `maak_redirect_after_login`

On logout, onboarding is not reset.


## Branding

Brand logo is centralized in:

- `src/assets/brand/maak-logo.svg`
- reusable UI component: `src/components/brand/BrandLogo.tsx`

Used on:

- onboarding welcome
- login screen
- home header
- favicon and social preview (`public/favicon.svg`, `index.html`)


## GitHub Pages deployment

This project is deployed with GitHub Actions from `dist/` (not from repository root files):

- workflow: `.github/workflows/deploy-pages.yml`
- artifact path: `dist/`

Why Vite base is configured this way:

- on GitHub Pages, the app is served under `/hop-share-and-send/`, so Vite is configured with `base: "/hop-share-and-send/"`.

This prevents `404` on `/assets/*` and avoids blank screens caused by wrong asset paths.


## Matching + Trust + Handoff + Safety (E2E)

### Points clés implémentés

- Match automatique trajet/colis avec score de compatibilité.
- Deal avec acceptation progressive (`proposed` -> `accepted_by_*` -> `mutually_accepted`).
- Contact/chat débloqués uniquement après acceptation mutuelle.
- Code secret de livraison (format `MAAK-XXXX-XX`) généré côté serveur quand le deal devient `mutually_accepted`.
- Confirmation de prise en charge avec checklist + photo preuve (bucket `handoff_proofs`).
- Confirmation de livraison via code secret (`verify_delivery_code`) -> statut `delivered_confirmed`.
- Pages sécurité/paramètres/évaluations sans 404.

### Checklist de test bout-en-bout

1. Créer un trajet avec Utilisateur A.
2. Créer une demande colis compatible avec Utilisateur B.
3. Depuis les écrans de match, proposer un deal puis ouvrir son détail.
4. Vérifier que le contact est masqué avant acceptation mutuelle.
5. Accepter des deux côtés (A et B) -> statut `mutually_accepted`.
6. Vérifier que:
   - le chat est disponible,
   - le code secret est visible côté expéditeur uniquement.
7. Côté transporteur: confirmer la prise en charge avec photo + checklist.
8. Côté transporteur: saisir le code secret correct pour confirmer la livraison.
9. Vérifier le passage à `delivered_confirmed` et la possibilité de noter.
10. Créer un signalement depuis `/safety` et vérifier l’insertion dans `reports`.


### CI checks (PR mergeability)

The branch checks are executed by GitHub Actions workflows:

- `.github/workflows/ci.yml`: lint + test + build
- `.github/workflows/deploy-pages.yml`: build + Pages deploy artifact

Both workflows use **pnpm** with `pnpm-lock.yaml` to avoid `npm ci` lockfile failures.


### GitHub Pages deploy checklist

- Build target must publish `dist/`.
- Vite base is fixed to `/hop-share-and-send/`.
- Router uses `HashRouter` for static hosting refresh safety.
