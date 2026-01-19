# SCM AI (EIS Smart Search)

A next-generation Global (Supply Chain Management) dictionary designed for professionals, students, and businesses across Africa. (Powered by AI), it transforms complex supply-chain concepts into clear definitions, practical insights, and region-relevant case studies.

## Local Development

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env.local` with:

```
POLLINATIONS_API_KEY=your_key_here
POLLINATIONS_BASE_URL=https://gen.pollinations.ai
POLLINATIONS_MODEL=openai
GOOGLE_CSE_API_KEY=your_key_here
GOOGLE_CSE_CX=your_search_engine_id
```

On Vercel, add the same variables in Project Settings → Environment Variables.

## Admin Page

The admin UI is a separate route with no button in the main app.

- URL: `/admin` (example: `https://pan-avest-ai.vercel.app/admin`)
- Username: `panavest-admin`
- Password: `panavest-2024`

### Workflow

1) Edit or add terms in the admin UI.  
2) Click **Download CSV** to export the updated `scmpedia_full.csv`.  
3) Replace `public/scmpedia_full.csv` in the repo and redeploy.

## Notes

- AI calls go through `/api/ai` (Vercel serverless + Vite dev proxy).
- Pollinations responses are normalized to HTML for the UI.
