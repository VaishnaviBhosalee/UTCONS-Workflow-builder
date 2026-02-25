# Workflow Builder

A full-stack web application for designing multi-step AI pipelines, executing them against text inputs, and reviewing historical results — powered by Google Gemini 2.5 Flash.

---

## Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally (or an Atlas connection string)
- **Google Gemini API key** — get one from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 2. Configure Environment

Copy the example env file and fill in your values:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/workflow-builder
GEMINI_API_KEY=your_gemini_api_key_here
```

| Variable       | Description                                    | Default                                         |
|----------------|------------------------------------------------|-------------------------------------------------|
| `PORT`         | Express server port                            | `5000`                                          |
| `MONGODB_URI`  | MongoDB connection URI                         | `mongodb://localhost:27017/workflow-builder`    |
| `GEMINI_API_KEY` | Google Gemini API key (required)            | —                                               |

---

### 3. Run the Application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev     # Uses nodemon for hot reload
# → Server running on port 5000
# → MongoDB connected
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → Open http://localhost:5173
```

---

## Features

### Workflow Builder (/)
Create named pipelines by selecting 2–4 unique processing steps:

| Step Key    | Label               | Behaviour                                          |
|-------------|---------------------|----------------------------------------------------|
| `clean`     | Clean Text          | Removes whitespace, fixes grammar                  |
| `summarize` | Summarize           | Condenses text to ~5 lines                         |
| `keypoints` | Extract Key Points  | Returns bullet-point insights                      |
| `tag`       | Tag Category        | Classifies: Technology / Finance / Health / Education / Other |

Steps can be reordered before saving. Saved workflows are listed with delete support.

### Run Pipeline (/run)
Select a saved workflow, paste text, and watch each AI step execute sequentially. The output of each step feeds the next. Intermediate outputs appear as steps complete.

### Run History (/history)
The last 5 executions are displayed as expandable cards showing original input and each step's output.

### Health Dashboard (/health)
Live status indicators for:
- **Backend** — Express server health
- **MongoDB** — ping check
- **Gemini LLM** — reachability + latency

---

## Architecture Decisions

### Backend

**Express 4 + Mongoose 8**: Lightweight, well-understood stack that keeps route handlers thin — business logic lives in the `services/` layer.

**LLM Service (`src/services/llm.js`)**: Centralized Gemini integration using the OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai`). Key design choices:
- **Retry with exponential backoff**: On HTTP 429 (rate limit) or 5xx errors, retries up to 4 times with delays of 1s → 2s → 4s → 8s plus small random jitter to avoid thundering herds.
- **1-second inter-step delay**: `sleep(1000)` is inserted between consecutive LLM calls in the run route to respect rate limits proactively.
- **Step-specific system prompts**: Each step key has a focused system prompt that guides the model to produce the right output format.

**Graceful degradation on LLM failure**: If a step fails mid-pipeline, the API returns a `502` with the already-completed steps so the frontend can display partial results.

**Run model**: Stores the full input, step keys, and each step's output including step label — so history is self-contained and doesn't break if a workflow definition changes later.

### Frontend

**Vite 5 proxy**: The `vite.config.js` proxy forwards `/api/*` to `http://localhost:5000` in development, avoiding CORS issues without a separate nginx config.

**Component structure**: Pages are self-contained. Reusable UI patterns (button, card, badge, input) are defined as Tailwind component classes in `index.css` via `@layer components`, avoiding prop-drilling just for styling.

**Pipeline visualizer (RunPage)**: Since the backend executes all steps server-side and returns a single response, the frontend simulates progressive step activation every 1.5s while the request is in-flight — giving users visual feedback on which step is "processing" without a streaming API.

**Axios timeout**: Set to 120 seconds to accommodate multi-step pipelines with LLM retries and inter-step delays.

---

## Project Structure

```
assessment-workflow/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── models/
│   │   │   ├── Workflow.js       # Workflow schema (name, steps[])
│   │   │   └── Run.js            # Run schema (input, stepOutputs[])
│   │   ├── routes/
│   │   │   ├── workflows.js      # CRUD for workflows
│   │   │   ├── runs.js           # Execute & history
│   │   │   └── health.js         # /api/health
│   │   ├── services/
│   │   │   └── llm.js            # Gemini integration + retry
│   │   └── index.js              # Express app entry
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/index.js          # Axios client + endpoint helpers
    │   ├── components/
    │   │   └── Layout.jsx        # Sticky navbar + page shell
    │   ├── pages/
    │   │   ├── WorkflowBuilder.jsx
    │   │   ├── RunPage.jsx
    │   │   ├── HistoryPage.jsx
    │   │   └── HealthDashboard.jsx
    │   ├── App.jsx               # React Router setup
    │   ├── main.jsx              # React DOM entry
    │   └── index.css             # Tailwind + component classes
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## API Reference

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/workflows`      | List all workflows                   |
| POST   | `/api/workflows`      | Create workflow `{name, steps[]}`    |
| GET    | `/api/workflows/:id`  | Get single workflow                  |
| DELETE | `/api/workflows/:id`  | Delete workflow                      |
| POST   | `/api/runs`           | Execute `{workflowId, input}`        |
| GET    | `/api/runs`           | Last 5 run records                   |
| GET    | `/api/health`         | Service health check                 |

---

## Deploy to Render

This project is configured for **unified deployment** on [Render](https://render.com) — the backend serves the frontend from a single Web Service.

### 1. Push to GitHub

Make sure your repo is pushed to GitHub (the `.gitignore` already excludes `.env`, `node_modules/`, and `dist/`).

### 2. Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `workflow-builder` (or any name) |
| **Runtime** | Node |
| **Build Command** | `npm run build` |
| **Start Command** | `npm run start` |

### 3. Set Environment Variables

In the Render dashboard, add these env vars:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `JWT_SECRET` | A strong random secret (use `openssl rand -hex 64`) |

> **Note:** `CORS_ORIGIN` is not needed for unified deployment since the frontend is served from the same origin.

### 4. Deploy

Click **Create Web Service**. Render will:
1. Run `npm run build` → installs backend + frontend deps, builds frontend to `frontend/dist/`
2. Run `npm run start` → starts Express, which serves the API and the React app

### 5. Verify

Open your Render URL and check:
- ✅ Auth page loads → register/login works
- ✅ Create a workflow with 2+ steps
- ✅ Run a pipeline → step outputs appear
- ✅ History page shows the run
- ✅ Health Dashboard → all 3 services "Operational"
