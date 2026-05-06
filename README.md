# Opener

Opener is a timed opening-task platform for Ms. Budhu's Cyber Security classes.

The original local prototype is still included, but the deployable version is now a Next.js + Supabase app for free hosting on Vercel.

## Try It

Open `index.html` in a browser.

For the hosted version, follow [DEPLOYMENT.md](DEPLOYMENT.md).

Demo accounts:

- Instructor: `teacher@opener.test`
- Student: `avery@opener.test`

## What Works

- Instructor and student sign-in
- Instructor task creation with a close time
- Multiple instructor classes with separate rosters, tasks, and reports
- Student account creation with class join codes
- Multiple choice and short answer questions
- Student submissions before the task closes
- Automatic scoring for multiple choice
- Manual scoring for short answers
- Student roster management
- Instructor reporting dashboard
- CSV export for grades and missing work

## Export Reports

Sign in as the instructor, choose the class from the sidebar, open `Reports`, then select `Download CSV Report`. The browser downloads a spreadsheet-friendly `.csv` file for the selected class.

## Sharing With Students

This version is a local prototype, so it is best for testing the flow on one computer. To use it with real students, the next build should move the data from browser `localStorage` into a hosted database with real logins, then publish the app to a web host so students can visit one shared URL.

Instructors can share the class join code shown in the sidebar. Students enter that code when creating their account so they are placed into the correct class.

## Notes

This prototype stores data in the browser with `localStorage`, which makes it easy to test without a server. A production version should add a real backend database, secure authentication, school privacy controls, and instructor-owned class data.
