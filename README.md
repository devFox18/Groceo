# Groceo — Your groceries, simplified.

Groceo is a smart grocery companion for households. Plan lists together, keep inventory in sync, and build the foundation for future automations such as AI-powered suggestions and receipt scanning.

## ✨ Features

- Supabase Auth with email + password sign up and sign in.
- Shared households: create or switch between households with scoped grocery lists.
- Realtime grocery list updates powered by Supabase Realtime.
- Modern Expo Router navigation with onboarding, auth, home, and profile flows.
- TypeScript-first architecture with reusable components, hooks, and state.

## 🧱 Tech Stack

- Expo (React Native) + Expo Router
- Supabase (Auth, Database, Realtime)
- Zustand for client state
- TypeScript, ESLint, Prettier, GitHub Actions CI

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (`npm install -g expo-cli`) – optional but recommended

### Install dependencies

```bash
npm install
```

### Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase project details:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

These values are exposed to the app via `app.config.ts` and consumed by `src/lib/supabase.ts`.

### Database setup

1. Open the Supabase SQL editor for your project.
2. Paste the contents of `database/migrations.sql`.
3. Run the script to create tables, indexes, and row-level security policies.

### Start the development server

```bash
npm run start
```

Use the Expo Dev Tools to open the app on iOS, Android, or web.

## 🧪 Quality checks

- `npm run lint` – runs ESLint with the project config.
- `npm run typecheck` – TypeScript type checking with `tsc --noEmit`.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs both commands on each push.

## 🧭 Project Structure

```
app/                Expo Router routes (onboarding, auth, tabs)
src/components/     Reusable UI components
src/hooks/          Custom hooks (e.g., realtime lists)
src/lib/            Supabase client and theme
src/state/          Session store using Zustand
src/utils/          Helper utilities (toast)
database/           SQL migrations
```

## ⚠️ Known Issues & Notes

- Without Supabase credentials the app runs in a limited demo state. A warning banner appears and data features are disabled.
- Password reset flow is not yet implemented; the UI displays a placeholder toast.
- Future integrations (AI suggestions, OCR scanning) are not yet implemented but the architecture leaves space for them.

## 📄 License

This project is licensed under the MIT License – see [LICENSE](./LICENSE) for details.
