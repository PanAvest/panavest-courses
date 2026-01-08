# PanAvest AI (EIS Smart Search)

Supply-chain glossary search with AI explanations and a CSV-backed dataset.

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
