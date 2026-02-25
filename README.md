# ThirdLayer Demo: Browser Workflow Graph + Memory Store

A prototype that records browser behavior, converts it into a workflow graph, derives memory, and predicts likely next actions.

## Demo-only safety note
- This prototype captures click/input activity from pages the extension can access.
- Do not use with personal accounts, passwords, payment forms, or production/customer environments.
- Use a throwaway browser profile and test data only.

- **Browser signal translation**: Extension captures click/input/tab/url events and streams them to FastAPI.
- **Actionable workflow graph**: API returns per-session nodes + chronological edges; UI renders with React Flow.
- **Agentic layer + memory**: API auto-updates `MemoryItem` rows and serves heuristic next-step predictions.

## Architecture

```text
[Chrome Extension MV3]
  - content script: click/input/keys
  - background worker: tab_activated/url_changed
  - popup: start/stop session
            |
            | POST /sessions, /event, /sessions/{id}/end
            v
[FastAPI + SQLite]
  - stores Session/Event/MemoryItem
  - derives memory on every event ingest
  - exposes graph + prediction + memory search endpoints
            |
            | GET /sessions, /sessions/{id}/events, /sessions/{id}/graph,
            | GET /memory/search, /memory/top, /predict next
            v
[Next.js UI]
  - / : session list
  - /session/{id} : timeline + React Flow graph + memory/prediction panels
```

## Repo layout

```text
apps/
  api/        FastAPI backend + SQLite
  web/        Next.js App Router + Tailwind + React Flow
  extension/  Chrome Extension MV3 (TypeScript)
```

## How to run

### 1) API
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`.

### 2) Web
```bash
cd apps/web
cp .env.local.example .env.local
pnpm install
pnpm dev
```

Web runs at `http://localhost:3000`.

### 3) Extension build + load
```bash
cd apps/extension
pnpm install
pnpm build
```

Then in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `apps/extension/dist` from this repo

## Demo flow
1. Start API and Web.
2. Load extension and open popup.
3. Click **Start Recording**.
4. Browse any site (example: Google), click, type, navigate.
5. Click **Stop**.
6. Open `http://localhost:3000`, choose the session.
7. Verify:
   - event timeline fills
   - React Flow graph has nodes/edges
   - memory search/top memory returns rows
   - prediction panel shows next-step suggestion

## API endpoints
- `POST /sessions`
- `POST /sessions/{session_id}/end`
- `GET /sessions`
- `GET /sessions/{session_id}/events`
- `POST /event`
- `GET /sessions/{session_id}/graph`
- `GET /memory/search?q=...&domain=...`
- `GET /memory/top?domain=...`
- `GET /predict/next?session_id=...`

## Example output
- Session graph page: `/session/{id}` combines timeline + graph + memory + prediction.
- Demo video: [Watch the demo video](docs/flowtrace-demo.mp4)


## Notes on implementation choices
- `user_id` is hardcoded to `demo_user` in memory rows.
- Selector extraction is best-effort (`#id`, `tag.class`, nth-child fallback).
- Prediction is suggestion-only, based on top click frequency for last event domain.

## Next production steps
1. Robust selectors (DOM path signatures, resilience scoring, shadow DOM support).
2. Privacy controls (PII redaction, allow/deny lists, per-field masking).
3. Safer replay sandboxing and policy checks.
4. Better sequence modeling (Markov chains / embeddings / per-task segmentation).
5. Async ingestion queue for high-volume event streams.
