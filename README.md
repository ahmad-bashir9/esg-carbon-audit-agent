# CarbonLens — ESG Carbon Audit Agent

An autonomous ESG carbon audit platform that ingests enterprise data via MCP (Model Context Protocol), calculates GHG emissions using the GHG Protocol, monitors for anomalies, and generates CSRD/SEC-compliant PDF reports.

## Architecture

```
React SPA (Vite :5173)  →  Express API (:3001)  →  SQLite DB
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             MCP ERP        MCP CRM       Gemini AI
             (stdio)        (stdio)       (optional)
```

## Tech Stack

- **Frontend:** React 18, Vite 5, Recharts, React Router
- **Backend:** Node.js, Express 4, SQLite
- **AI:** Google Gemini 2.5 Pro (optional — falls back to deterministic logic)
- **Data Ingestion:** Model Context Protocol (MCP) with simulated ERP & CRM servers
- **Reports:** PDFKit with D3.js SVG charts

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | Scope 1/2/3 totals, charts, AI insights, department/facility filters |
| **Data Manager** | CRUD for activity records, CSV upload with column mapping |
| **Simulator** | What-if decarbonization scenarios with ROI modeling |
| **Auditor Agent** | Anomaly detection against rolling baselines, root cause analysis |
| **Reports** | PDF generation with executive summary, scope breakdown, charts |
| **Settings** | Industry vertical selection, auditor thresholds |

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # Add your GEMINI_API_KEY (optional)
npm run dev             # or: npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open

Navigate to **http://localhost:5173** in your browser.

The Vite dev server proxies `/api` requests to the backend on port 3001.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Google Gemini API key. Without it, AI features use deterministic fallbacks. |
| `PORT` | No | Backend port (default: `3001`) |

## MCP Servers

The backend starts two simulated MCP servers as subprocesses:

- **ERP** (`mcp-servers/erp/`) — fuel logs, utility bills, purchase orders
- **CRM** (`mcp-servers/crm/`) — shipping manifests, business travel, commute, waste records

Both use stdio transport and provide sample data for demonstration.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── server.js              # Entry point
│   │   ├── routes/api.js          # REST API routes
│   │   ├── db/database.js         # SQLite schema & queries
│   │   ├── db/seed.js             # Seed from MCP on first run
│   │   ├── services/
│   │   │   ├── emissionEngine.js  # GHG calculation engine
│   │   │   ├── geminiService.js   # AI service with fallbacks
│   │   │   ├── mcpClient.js       # MCP client manager
│   │   │   └── reportGenerator.js # PDF report builder
│   │   ├── agents/auditorAgent.js # Anomaly detection
│   │   ├── config/verticals.js    # Industry configurations
│   │   └── utils/emissionFactors.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/AppContext.jsx  # Global state management
│   │   ├── utils/api.js           # Shared API client
│   │   ├── utils/format.js        # Number formatting utilities
│   │   └── pages/                 # Dashboard, DataManager, Simulator, etc.
│   └── vite.config.js
├── mcp-servers/
│   ├── erp/index.js
│   └── crm/index.js
└── README.md
```

## License

Private — All rights reserved.
