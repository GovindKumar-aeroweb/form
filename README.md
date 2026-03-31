# FormFlow - Google Forms Alternative

A production-ready MVP of a Google Forms-like SaaS web app built with React, Vite, Express, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Email/password signup and login via Supabase Auth.
- **Form Builder**: Create forms, add fields (short text, long text, email, number, dropdown, radio, checkbox), reorder fields, and configure settings.
- **Form Settings**: Custom slugs, open/closed status, success messages.
- **Public Forms**: Shareable public links with validation and submission limits.
- **Submissions**: Secure backend submission handling, view responses in a table, and export to CSV.
- **Security**: Row Level Security (RLS) policies, transaction-safe submission limits, and IP hashing for abuse prevention.

## Tech Stack

- **Frontend**: React 19, React Router, Tailwind CSS, Lucide React, Sonner (Toasts)
- **Backend**: Express (for secure submission handling and API routes)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth

## Setup Instructions

### 1. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`. This will create all tables, indexes, triggers, and RLS policies.
3. Go to Project Settings -> API to get your credentials.

### 2. Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL="your-supabase-project-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
APP_URL="http://localhost:3000"
```

*Note: The `SUPABASE_SERVICE_ROLE_KEY` is required for the backend to securely insert submissions and bypass RLS where necessary.*

### 3. Local Development

Install dependencies:

```bash
npm install
```

Start the development server (runs both Vite and Express):

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. Deployment

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```

You can deploy this to any Node.js hosting provider (e.g., Render, Railway, Heroku, or Google Cloud Run). Make sure to set the environment variables in your hosting provider's dashboard.

## Test Checklist

- [ ] Sign up as a new user
- [ ] Create a new form
- [ ] Add various field types (text, radio, dropdown)
- [ ] Save the form
- [ ] Open the public form link in an incognito window
- [ ] Submit a response
- [ ] Verify the response appears in the Submissions dashboard
- [ ] Export submissions to CSV
- [ ] Delete the form
