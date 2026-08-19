Render deployment notes for SpecBridge backend (specbridge/server)

Purpose
- Minimal guidance for deploying the Node.js/Express backend on Render as a Web Service.

Recommended Render settings
- Root Directory: specbridge/server
- Build Command: npm install
  - (Render may also run `npm run build`; package.json includes a no-op build script so this is safe.)
- Start Command: npm start
- Health Check Path: /api/health

Environment variables (set in Render's Dashboard -> Environment)
- OPENAI_API_KEY  (required for OpenAI integration)
  - Example: OPENAI_API_KEY=sk-... (set securely in Render; do NOT commit to git)

Notes
- This backend does not require a compile step. package.json includes a "prebuild" and a minimal "build" script that only prints a message and exits successfully. This ensures Render deployments that execute `npm run build` do not fail.
- Keep secret values (OPENAI_API_KEY) in Render's environment variables, not in the repo. .gitignore already excludes .env files.
- Frontend (Vite) expects VITE_API_BASE_URL to point at the deployed backend. When building the frontend for production, set VITE_API_BASE_URL to the backend's public URL (for example, https://specbridge-api.onrender.com) before running the frontend build.

Example Render environment setup
1. Create a new Web Service on Render.
2. Set Root Directory to: specbridge/server
3. Build Command: npm install
4. Start Command: npm start
5. In Environment -> Environment Variables, add:
   - Key: OPENAI_API_KEY, Value: <your key> (Private)
6. (Optional) If you also host the frontend on Render, set VITE_API_BASE_URL in the frontend service environment to the backend URL and rebuild the frontend.

Troubleshooting
- If Render fails with "Missing script: \"start\"", ensure Root Directory is specbridge/server and the package.json in that folder is the server one.
- If OPENAI calls fail, check the server logs for error messages (do not expose keys or stack traces to users).

That's all — this file is informational only and contains no secrets.