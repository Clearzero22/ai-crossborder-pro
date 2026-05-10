# Workflow Editor Backend

Backend API server for the Workflow Editor using Hono + Bun.

## Prerequisites

- [Bun](https://bun.sh/) installed
- PostgreSQL database running (optional, for dashboard stats)

## Installation

```bash
cd backend
bun install
```

## Development

Start the development server with hot reload:

```bash
bun run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health
- `GET /api/health` - Health check

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/executions?limit=5` - Get recent executions
- `GET /api/dashboard/trend` - Get weekly trend data
- `GET /api/dashboard/user` - Get user dashboard info

### Keywords
- `POST /api/keywords/xiyouzhaoci` - Scrape keywords from Xiyouzhaoci

  **Request:**
  ```json
  {
    "asin": "B08F5M1K9M",
    "headless": true,
    "maxKeywords": 50
  }
  ```

  **Response:**
  ```json
  {
    "success": true,
    "asin": "B08F5M1K9M",
    "keywords": [...],
    "totalKeywords": 42,
    "csvPath": "./output/keywords/keywords-B08F5M1K9M-1234567890.csv"
  }
  ```

## Architecture

```
backend/
├── server.ts           # Main server entry point
├── api/
│   ├── dashboard.ts    # Dashboard endpoints
│   └── keywords.ts     # Keyword scraping endpoints
├── services/
│   ├── dashboardStats.ts
│   └── xiyouzhaociService.ts
└── types/
    └── dashboard.ts
```

## Environment Variables

```bash
PORT=3001                    # Server port
DATABASE_URL=postgresql://... # PostgreSQL connection (optional)
```

## Production

```bash
bun run start
```

## Notes

- The server uses Bun's built-in `serve()` function
- Playwright browsers are cached in `.chrome-data`
- CSV outputs are saved to `./output/keywords/`
- CORS is enabled for `http://localhost:5173` (Vite dev server)
