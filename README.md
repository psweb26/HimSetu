# HimSetu

> **A unified civic accountability, monsoon-risk intelligence, and cultural heritage platform for Himachal Pradesh.**

HimSetu brings together three experiences that are usually disconnected: a citizen-facing place to report and follow infrastructure issues, a live operations view for monsoon and transit conditions, and a digital archive celebrating Himachal's living heritage. It is designed around the administrative realities, terrain risks, and cultural context of the state.

<p align="center">
  <img src="HSfrontend/src/assets/images/Readme-hero-img.jpeg" alt="HimSetu Jan Pukaar civic accountability interface" width="900" />
</p>

## Why HimSetu?

Mountain communities need clear ways to surface urgent infrastructure concerns—especially during monsoon periods—while response teams need timely, location-aware information to prioritise action. HimSetu connects the citizen report, the operational response, and the wider community context in one platform.

It supports a simple loop:

```text
Citizen report + evidence
          ↓
Location and terrain-aware triage
          ↓
Department routing, verification, and SLA tracking
          ↓
Public support, resolution evidence, or citizen reopen request
```

## Platform at a glance

| Experience | What it provides |
| --- | --- |
| **Jan Pukaar** | Citizen infrastructure reporting, photo evidence, community support, incident timelines, resolution updates, and a citizen-veto/reopen path. |
| **Live telemetry** | Weather-station and transit-route monitoring, monsoon alerts, district context, and risk-led operational awareness. |
| **Hamari Virasat** | A curated cultural canvas for Himachal's places, traditions, craft, food, music, and community identity. |
| **Admin command centre** | Protected tools for complaint operations, community discovery, heritage management, locations, users, and system status. |


## Key capabilities

- **Structured local reporting** — records district, block, panchayat, infrastructure type, and terrain risk alongside the report.
- **Risk-aware prioritisation** — supports hazards such as landslide-prone links, flash-flood proximity, high-alpine tracks, and rural roads.
- **Department allocation** — routes reported assets to the appropriate operational department, including PWD, Jal Shakti Vibhag, National Highways, and HPSEBL Operations.
- **Community accountability** — lets people upvote reports; reports crossing the configured support threshold are promoted for critical attention.
- **Verifiable resolution** — captures verification state, resolution notes, closure evidence, and citizen requests to reopen a resolved case.
- **Operational telemetry** — presents weather and transit data with a scheduled ingestion layer for supported external feeds.
- **Heritage by design** — treats culture as a first-class civic experience, with structured cultural assets and themed discovery.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         React + Vite applications                    │
│                                                                      │
│  HSfrontend                         HSadmin                          │
│  Public citizen portal              Protected operations portal      │
└───────────────────────────────┬──────────────────────┬──────────────┘
                                │ REST API             │ REST API
                                └──────────┬───────────┘
                                           │
                         ┌─────────────────▼─────────────────┐
                         │ FastAPI service · HSbackend/backend │
                         │ auth · routing · uploads · ingest   │
                         └─────────────────┬─────────────────┘
                                           │ SQLAlchemy
                         ┌─────────────────▼─────────────────┐
                         │ PostgreSQL                         │
                         │ reports · incidents · assets · data │
                         └───────────────────────────────────┘
```

### Technology

| Layer | Stack |
| --- | --- |
| Public and admin clients | React 19, Vite 8, React Router, Tailwind CSS |
| UI and reporting | Lucide icons, Recharts, html2canvas, jsPDF |
| API | Python, FastAPI, Pydantic, Uvicorn |
| Data | PostgreSQL 16, SQLAlchemy |
| Operations | Docker Compose, APScheduler, optional OpenWeatherMap and transit-feed ingestion |

## Repository structure

```text
HimSetu/
├── HSfrontend/              # Public-facing React application
│   └── src/
│       ├── components/      # Reporting, maps, feeds, telemetry UI
│       ├── assets/          # Himachal visual and cultural assets
│       └── pages/           # Incident and asset detail views
├── HSadmin/                 # Authenticated React administration portal
│   └── src/
│       ├── api/             # Backend client modules
│       ├── pages/           # Dashboard and operations pages
│       └── components/      # Reusable admin UI
└── HSbackend/
    ├── backend/             # FastAPI application, models, routers, ingestion
    └── docker-compose.yml   # Postgres + API + both web applications
```

## Quick start with Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose
- An available set of local ports: `5432`, `8000`, `5173`, and `5174`

### 1. Configure backend environment variables

Create `HSbackend/.env`. `DATABASE_URL` is required for the backend; the Compose stack supplies its own internal database URL, but the file is also mounted into the API container. Use a strong, non-default secret outside local development.

```env
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/himachal_accountability
HIMSETU_AUTH_SECRET=replace-with-a-long-random-secret

# Optional live-ingestion integrations
OPENWEATHERMAP_API_KEY=
TRANSIT_ALERTS_JSON=[]
```

### 2. Start the full stack

```powershell
cd HSbackend
docker compose up --build
```

Once the containers are healthy, open:

| Service | Address |
| --- | --- |
| Public portal | http://localhost:5173 |
| Admin portal | http://localhost:5174 |
| API | http://localhost:8000 |
| Interactive API documentation | http://localhost:8000/docs |

Stop the stack with `docker compose down`. Add `-v` only if you intentionally want to remove the local PostgreSQL volume and its data.

> **Deployment note:** the included Compose configuration is for local development. Review database credentials, CORS origins, secrets, image tags, volumes, and networking before hosting it in any public or production environment.

## Local development

### Backend

Requirements: Python 3.10+ and a reachable PostgreSQL database. Define `DATABASE_URL` in `HSbackend/.env` before importing or starting the application.

```powershell
cd HSbackend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend creates its tables during startup and exposes a health check at `GET /health`.

### Public portal

Requirements: Node.js `>=20.19.0`.

```powershell
cd HSfrontend
npm install
npm run dev
```

The public portal uses `http://localhost:8000` by default. To point it at another API, add `HSfrontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:8000
```

### Admin portal

```powershell
cd HSadmin
npm install
Copy-Item .env.example .env
npm run dev
```

`HSadmin/.env.example` defines `VITE_API_URL=http://localhost:8000` for the local API.

## Useful commands

Run these commands from the relevant application directory.

| Application | Development server | Lint | Production build |
| --- | --- | --- | --- |
| `HSfrontend` | `npm run dev` | `npm run lint` | `npm run build` |
| `HSadmin` | `npm run dev` | `npm run lint` | `npm run build` |

For the API, use `uvicorn main:app --reload` from `HSbackend/backend` during local development.

## API highlights

The complete, runnable API contract is available at `/docs` whenever the backend is running. The most useful routes include:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Runtime and regional command-state health check. |
| `GET` / `POST` | `/api/grievances` | List or create civic grievances. |
| `GET` | `/api/community-discovery` | Public community-discovery feed. |
| `POST` | `/api/grievances/{ticket_id}/upvote` | Add public support to a report. |
| `PATCH` | `/api/grievances/{ticket_id}/verification` | Update officer verification state. |
| `POST` | `/api/grievances/{ticket_id}/resolve` | Record verified closure and validation evidence. |
| `POST` | `/api/grievances/{ticket_id}/veto` | Reopen an eligible closure through citizen feedback. |
| `GET` | `/api/telemetry/weather` | Weather-station telemetry. |
| `GET` | `/api/telemetry/transit` | Transit-route telemetry. |
| `GET` | `/api/cultural-assets` | Structured heritage content. |
| `POST` | `/api/v1/auth/login` | Staff authentication. |

## Data and integrations

HimSetu provides a modular background-ingestion layer. When configured, it can refresh weather metrics and transit alerts on scheduled intervals. The weather provider requires `OPENWEATHERMAP_API_KEY`; the configurable transit provider reads `TRANSIT_ALERTS_JSON`. The transit bridge also contains clear extension points for connecting an authoritative operational feed.

The platform ships with domain-aware seed and bootstrap data for development. Treat all example reports, people, routes, and cultural content as demonstration data unless they have been replaced by verified sources.

## Contributing

1. Create a branch from the current working branch.
2. Keep changes scoped to one of the three applications where possible.
3. Run the relevant `npm run lint` and `npm run build` checks for client changes.
4. Verify backend changes against the interactive API docs and health endpoint.
5. Do not commit `.env` files, generated uploads, local databases, or credentials.

## License

No license has been specified for this repository. Add a license file before distributing, reusing, or accepting external contributions under defined terms.

---

Built around the idea that better local information can help communities be heard, responders act earlier, and Himachal's heritage remain visible.
