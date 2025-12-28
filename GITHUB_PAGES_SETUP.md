# GitHub Pages Setup Guide

This guide walks you through deploying the Slay the Saturn web UI to GitHub Pages.

## Prerequisites

- Node.js and npm installed
- Git repository pushed to GitHub
- Access to repository settings

## Step 1: Build the Frontend

From the repository root, run:

```bash
cd evaluation/web/frontend
npm install
npm run build:gh-pages
```

This will:
- Build the production frontend with base URL set to `/Slay-the-Saturn/`
- Output files to the `docs/` directory at repository root
- Create necessary configuration files

## Step 2: Commit and Push the Build

```bash
git add docs/
git add evaluation/web/frontend/vite.config.js
git add evaluation/web/frontend/package.json
git add evaluation/web/frontend/build-gh-pages.js
git commit -m "feat(web): add GitHub Pages deployment"
git push origin main
```

## Step 3: Configure GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Pages** in the left sidebar
4. Under **Source**, select:
   - **Branch:** main
   - **Folder:** /docs
5. Click **Save**

GitHub will automatically deploy the site. This takes 1-2 minutes.

## Step 4: Get Your GitHub Pages URL

After deployment completes (check Actions tab), your site will be available at:

```
https://YOUR_USERNAME.github.io/Slay-the-Saturn/
```

For example:
- Username: `jperr`
- URL: `https://jperr.github.io/Slay-the-Saturn/`

## Step 5: Update Repository README (Optional)

Add a link to the live demo in your main README:

```markdown
## Live Demo

Try the web UI: https://YOUR_USERNAME.github.io/Slay-the-Saturn/

**Note:** You must run the backend locally to use the demo. See [Web UI Setup](evaluation/web/README.md).
```

## How It Works

### Architecture

The deployment uses a **static frontend + local backend** architecture:

1. **GitHub Pages** serves the static React frontend
2. **Your local machine** runs the FastAPI backend
3. **Frontend** connects to `localhost:8000` for API and WebSocket
4. **CORS** is enabled on backend to allow cross-origin requests

### Why This Architecture?

GitHub Pages only serves static files - it cannot run Python backends. This architecture:
- ✅ Provides a visual demo anyone can access
- ✅ Keeps backend control on your machine
- ✅ Works with Saturn auto-discovery (local network only)
- ✅ No API keys needed in public repository
- ✅ Free hosting from GitHub

### Base URL Configuration

The frontend is built with `base: '/Slay-the-Saturn/'` in Vite config, which:
- Correctly loads assets from the subdirectory path
- Routes work properly on GitHub Pages
- Falls back to `/` for local development

## Testing Locally Before Deploying

To test the GitHub Pages build locally:

```bash
cd docs
python -m http.server 8080
```

Then open: `http://localhost:8080`

**Note:** The frontend will try to connect to `localhost:8000` for the backend, so make sure to run the backend server in another terminal.

## Updating the Deployment

When you make changes to the frontend:

1. Rebuild for GitHub Pages:
   ```bash
   cd evaluation/web/frontend
   npm run build:gh-pages
   ```

2. Commit and push:
   ```bash
   git add docs/
   git commit -m "feat(web): update GitHub Pages deployment"
   git push origin main
   ```

GitHub Pages will automatically redeploy (takes 1-2 minutes).

## Custom Domain (Optional)

To use a custom domain (e.g., `slay-saturn.example.com`):

1. Add a `CNAME` file to `docs/`:
   ```bash
   echo "slay-saturn.example.com" > docs/CNAME
   ```

2. Update Vite base URL in `build-gh-pages.js`:
   ```javascript
   process.env.VITE_BASE_URL = '/';  // Root domain, not subdirectory
   ```

3. Rebuild and push:
   ```bash
   cd evaluation/web/frontend
   npm run build:gh-pages
   git add docs/
   git commit -m "feat(web): configure custom domain"
   git push origin main
   ```

4. Configure DNS:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`
   - Wait for DNS propagation (up to 24 hours)

5. In GitHub Settings > Pages:
   - Enter your custom domain
   - Enable "Enforce HTTPS" (recommended)

## Troubleshooting

### Assets not loading (404 errors)

**Cause:** Base URL mismatch

**Solution:**
1. Verify `VITE_BASE_URL` in `build-gh-pages.js` matches your repository name
2. Rebuild: `npm run build:gh-pages`
3. Commit and push changes

### GitHub Pages not updating

**Cause:** Deployment in progress or failed

**Solution:**
1. Check **Actions** tab for deployment status
2. Wait 2-3 minutes for deployment to complete
3. Hard refresh browser (Ctrl+F5) to clear cache
4. Check Pages settings are correct (branch: main, folder: /docs)

### 404 Page Not Found

**Cause:** Incorrect Pages configuration

**Solution:**
1. Verify **Settings > Pages > Source** is set to:
   - Branch: main
   - Folder: /docs
2. Ensure `docs/` directory exists in main branch
3. Check deployment status in Actions tab

### Frontend can't connect to backend

**Cause:** Backend not running locally

**Solution:**
1. Start backend: `python evaluation/web/backend/web_main.py`
2. Verify health: `curl http://localhost:8000/api/health`
3. Check CORS is enabled in backend (it should be by default)

### WebSocket connection failed

**Cause:** Backend not accessible or CORS issue

**Solution:**
1. Verify backend Socket.IO is running on port 8000
2. Check browser console for specific error messages
3. Ensure firewall allows localhost:8000
4. Try running backend with explicit host: `uvicorn.run(host='0.0.0.0', port=8000)`

### Vite build fails

**Cause:** Missing dependencies or syntax errors

**Solution:**
1. Install dependencies: `npm install`
2. Check Node.js version (requires v14+)
3. Review build errors for specific file issues
4. Try clean install: `rm -rf node_modules && npm install`

## Build Script Details

The `build:gh-pages` npm script runs `build-gh-pages.js`, which:

```javascript
// Sets environment variables
process.env.VITE_BASE_URL = '/Slay-the-Saturn/';
process.env.VITE_BUILD_DIR = '../../../docs';

// Runs Vite build with these settings
spawn('vite', ['build'], { env: process.env });
```

This creates a production build optimized for GitHub Pages deployment.

## File Structure After Build

```
Slay-the-Saturn/
├── docs/                      # GitHub Pages serves from here
│   ├── .nojekyll             # Disables Jekyll processing
│   ├── README.md             # User documentation
│   ├── index.html            # Main HTML file
│   └── assets/               # JS and CSS bundles
│       ├── index-HASH.js     # React app bundle
│       └── index-HASH.css    # Compiled styles
├── evaluation/web/frontend/  # Source code
│   ├── src/                  # React components
│   ├── vite.config.js        # Vite configuration
│   ├── package.json          # Dependencies
│   └── build-gh-pages.js     # Build script
└── evaluation/web/backend/   # Backend (not deployed)
    └── web_main.py           # FastAPI server
```

## Security Considerations

### CORS Configuration

The backend currently allows all origins (`allow_origins=["*"]`). For production:

```python
# In web_main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Dev server
        "https://YOUR_USERNAME.github.io"  # GitHub Pages
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API Keys

Never commit API keys to the repository. The `.env` file is in `.gitignore` and should stay there.

Users must provide their own `.env` file with:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
```

### Saturn Discovery

Saturn uses mDNS for local network discovery. This is secure because:
- Only discovers servers on same network
- No internet exposure
- Users control their own Saturn server
- Fallback to OpenRouter API if Saturn unavailable

## Continuous Integration (Optional)

To automatically rebuild on push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'evaluation/web/frontend/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd evaluation/web/frontend
          npm install

      - name: Build for GitHub Pages
        run: |
          cd evaluation/web/frontend
          npm run build:gh-pages

      - name: Commit and push build
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git diff --staged --quiet || git commit -m "chore: auto-build GitHub Pages [skip ci]"
          git push
```

This automatically rebuilds `docs/` whenever frontend code changes.

## Next Steps

1. Deploy to GitHub Pages using steps above
2. Test with fast bots (no API required): `mcts`, `rndm`, `bt3`
3. Set up Saturn for free LLM testing
4. Share the live demo URL with collaborators
5. Monitor GitHub Actions for deployment status

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Static Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [FastAPI CORS Guide](https://fastapi.tiangolo.com/tutorial/cors/)
- [Web UI Full Documentation](evaluation/web/README.md)

---

**Questions?** Open an issue on GitHub or check the beads issue tracker: `bd list`
