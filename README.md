# ClipMart — Agentic Company Template Marketplace

A full-stack marketplace for discovering, publishing, and forking AI agentic company templates.
Built with React + FastAPI + PostgreSQL, styled with the Saksoft brand theme.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Zustand   |
| Backend   | FastAPI, SQLAlchemy, Alembic            |
| Database  | PostgreSQL                              |
| Storage   | Azure Blob Storage **or** Local folder (config toggle) |
| Auth      | JWT (access + refresh tokens)           |

---

## Project Structure

```
clipmart/
├── frontend/          # React app (Vite)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── store/
│       └── utils/
├── backend/           # FastAPI app
│   └── app/
│       ├── api/v1/
│       ├── core/      # config, security
│       ├── db/        # session, base
│       ├── models/    # SQLAlchemy ORM
│       ├── schemas/   # Pydantic
│       └── services/  # business logic
├── docker-compose.yml
└── .env.example
```

---

## Quick Start

### 1. Clone & configure

```bash
git clone <repo>
cd clipmart
cp .env.example .env        # edit values
cp frontend/.env.example frontend/.env
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Docker (recommended)

```bash
docker-compose up --build
```

---

## Storage Configuration

Set `STORAGE_BACKEND` in `.env`:

| Value   | Description                          |
|---------|--------------------------------------|
| `local` | Saves files to `./uploads/` folder   |
| `azure` | Uses Azure Blob Storage              |

For Azure, also set:
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_CONTAINER_NAME`

---

## Environment Variables

See `.env.example` for the full list. Key settings:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/clipmart
SECRET_KEY=change-me
STORAGE_BACKEND=local          # or azure
CORS_ORIGINS=http://localhost:5173
```
