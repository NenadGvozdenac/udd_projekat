# UDD — Digital Forensics Report Management System

A system for uploading, parsing, indexing and searching digital forensic reports (PDFs) with threat intelligence data.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| File Storage | MinIO (S3-compatible) |
| Search | Elasticsearch 8 |
| Log Pipeline | Logstash |
| Dashboards | Kibana |

## Getting Started

### Prerequisites
- Docker + Docker Compose

### Run

```bash
docker compose up --build -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| MinIO Console | http://localhost:9001 |
| Kibana | http://localhost:5601 |
| Elasticsearch | http://localhost:9200 |

### Development (hot reload)

Both frontend and backend run in dev mode with file watchers inside Docker.  
Any change to `frontend/src/` or `backend/src/` is reflected immediately.

## Features

- **Authentication** — register/login with JWT, all routes protected
- **PDF Upload & Parsing** — upload PDF → auto-parse fields → review & confirm before indexing
- **Basic Search** — filter by analyst name, hash, classification, organization, malware name
- **Full-text Search** — search inside PDF content
- **Boolean Search** — `AND`, `OR`, `NOT` operators with C-like precedence and `"phrase"` support
- **KNN Search** — approximate vector similarity search
- **Geo Search** — search by city name within a radius (geocoded automatically)

## Project Structure

```
udd/
├── backend/          # Node.js API
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       ├── config/
│       ├── db/
│       └── elasticsearch/
├── frontend/         # React SPA
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── api/
│       └── context/
├── elk/              # Logstash config
├── docker-compose.yml
└── README.md
```

## Environment

Copy `backend/.env.example` to `backend/.env` before running locally outside Docker.  
Docker Compose overrides the hostnames automatically.
