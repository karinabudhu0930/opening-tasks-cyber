# Free Hosting Setup

This version is designed so students type one website link and use the platform in their browser. They do not install or download anything.

## Free Services

- Vercel: hosts the website
- Supabase: stores accounts, classes, assignments, submissions, grades, and reports

## 1. Create a Supabase Project

1. Go to `https://supabase.com`.
2. Create a free project.
3. Open `SQL Editor`.
4. Paste the full contents of `supabase/schema.sql`.
5. Run the SQL.

## 2. Set Supabase Auth for Classroom Testing

For the easiest classroom pilot:

1. In Supabase, open `Authentication`.
2. Open `Providers`.
3. Open `Email`.
4. Turn off email confirmation for now.

This allows students to create an account and immediately use the site. Later, you can turn confirmation back on if your school requires verified emails.

## 3. Copy Supabase Keys

In Supabase:

1. Go to `Project Settings`.
2. Open `API`.
3. Copy:
   - Project URL
   - anon public key

These become:

```text
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

## 4. Put the Code on GitHub

Vercel deploys most easily from GitHub.

1. Create a GitHub account if needed.
2. Create a new repository.
3. Upload this project folder.

Do not upload `.env.local` if you create one.

## 5. Deploy on Vercel

1. Go to `https://vercel.com`.
2. Create a free Hobby account.
3. Select `Add New Project`.
4. Import your GitHub repository.
5. Add these Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click `Deploy`.

Vercel will give you a public URL. Students can type that URL into a browser and access the site directly.

## 6. Classroom Flow

1. You create an instructor account.
2. You create a class.
3. The platform shows a join code.
4. Students go to the public URL.
5. Students create accounts using the join code.
6. Students complete opening tasks.
7. You export reports from the instructor dashboard.

## Notes

The old `index.html`, `styles.css`, and `app.js` files are the local prototype. The hosted version uses the Next.js files inside `app/`, plus Supabase.
