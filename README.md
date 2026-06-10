# Weather Outfit Agent

This is a GitHub-ready daily agent that checks the weather, reports the maximum temperature, recommends what to wear, and shortlists suitable Uniqlo AU items.

It runs on GitHub Actions and writes the result to the workflow run summary.

## What It Does

- Fetches today's forecast from Open-Meteo
- Reports max temperature, min temperature, rain chance, and conditions
- Recommends practical clothing for the day
- Reads clothing preferences such as color, style, brand notes, and items to avoid
- Uses Gemini, when configured, to write the outfit advice and Uniqlo recommendation reasons
- Falls back to local rules if Gemini is not configured

## Run Locally

```bash
npm start
```

By default, it uses Sydney, NSW.

To use another location:

```bash
LATITUDE="-37.8136" \
LONGITUDE="144.9631" \
LOCATION_NAME="Melbourne, VIC" \
TIMEZONE="Australia/Melbourne" \
COLOR_PREFERENCE="black, navy, grey" \
STYLE_PREFERENCE="minimalist smart casual" \
BRAND_PREFERENCE="Uniqlo only" \
AVOID_PREFERENCE="shorts, bright colors" \
npm start
```

## Deploy on GitHub

1. Create a new GitHub repository.
2. Add these files to the repository.
3. Go to **Settings → Actions → General** and make sure Actions are enabled.
4. Optional: go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable | Example |
| --- | --- |
| `LATITUDE` | `-33.8688` |
| `LONGITUDE` | `151.2093` |
| `LOCATION_NAME` | `Sydney, NSW` |
| `TIMEZONE` | `Australia/Sydney` |
| `COLOR_PREFERENCE` | `black, navy, grey` |
| `STYLE_PREFERENCE` | `minimalist smart casual` |
| `BRAND_PREFERENCE` | `Uniqlo only` |
| `AVOID_PREFERENCE` | `shorts, bright colors` |
| `GEMINI_MODEL` | `gemini-3.5-flash` |

5. Open **Actions → Daily Weather Outfit Agent → Run workflow** to test it manually.

The scheduled workflow is in `.github/workflows/daily-weather-outfit.yml`.

## Add Gemini to the GitHub Agent

The GitHub Actions agent can call Gemini directly. You do not need Cloudflare for this workflow.

1. Create a Gemini API key in Google AI Studio: `https://aistudio.google.com/app/apikey`
2. Open your GitHub repository.
3. Go to **Settings → Secrets and variables → Actions**.
4. Open the **Secrets** tab.
5. Click **New repository secret**.
6. Name it exactly:

```text
GEMINI_API_KEY
```

7. Paste your Gemini API key as the value.
8. Click **Add secret**.
9. Run **Actions → Daily Weather Outfit Agent → Run workflow**.

If the secret is present, the report will say:

```text
Recommendation source: Gemini
```

If the secret is missing or Gemini fails, the workflow still completes using local rule-based recommendations.

## Clothing Preferences

When you run the workflow manually, GitHub will ask for:

- Color preference
- Style preference
- Brand preference
- Items to avoid

For automatic scheduled runs, the agent uses the repository variables above. If a value is missing, it uses sensible defaults.

## Web App

This repository also includes a browser version in the `docs` folder:

- `docs/index.html`
- `docs/styles.css`
- `docs/app.js`

To use it locally, open `docs/index.html` in a browser. To publish it on GitHub Pages:

1. Open your repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Set the branch to `main` and the folder to `/docs`.
5. Click **Save**.

The web app asks for clothing preferences, can use browser location when permission is granted, checks today's weather, recommends what to wear, and links to Uniqlo searches with reasons for each recommendation.

## Gemini API Recommendations for the Web App

The web app can also use Gemini for outfit advice and Uniqlo recommendation reasons. Keep the Gemini API key out of the public web page by using the Cloudflare Worker in the `workers` folder.

Files:

- `workers/gemini-recommendation-worker.js`
- `workers/README.md`

Setup:

1. Create a Gemini API key in Google AI Studio: `https://aistudio.google.com/app/apikey`
2. Create a Cloudflare Worker.
3. Paste in `workers/gemini-recommendation-worker.js`.
4. Add a Worker secret named `GEMINI_API_KEY`.
5. Deploy the Worker.
6. Copy the Worker URL and add `/recommend` to the end.
7. Paste that URL into the web app's **Gemini worker URL** field.

If the Gemini worker URL is left blank, the app still works using local rule-based recommendations.

## Schedule

The workflow is scheduled with GitHub's UTC cron. The included schedule runs at approximately 7:00 AM Sydney standard time:

```yaml
cron: "0 21 * * *"
```

Adjust the cron if you move locations or want a different delivery time.
