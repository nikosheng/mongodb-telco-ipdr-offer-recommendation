# Telco IPDR Offer Recommendation System

This project is a full-stack application for analyzing IPDR data and recommending offers based on geolocation and user intent.

## Tech Stack
- **Backend**: Node.js, Express, Mongoose
- **Frontend**: React, Vite, Tailwind CSS, Leaflet
- **Database**: MongoDB (Atlas recommended)

## Setup

### Prerequisites
- Node.js installed
- MongoDB instance running (Local or Atlas)
- `make` available (pre-installed on macOS and Linux)

### Quick Start (Recommended)

Install dependencies for both server and client, then start everything with a single command:

```bash
# 1. Install all dependencies
make install

# 2. Configure environment variables
#    Edit server/.env and set MONGODB_URI, AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT

# 3. Seed the database (first time only)
make seed

# 4. Start both server and client
make dev
```

`make dev` launches both processes concurrently with color-coded output. Press `Ctrl+C` to stop both.

| Command | Description |
|---------|-------------|
| `make dev` | Start server (port 5001) + client (port 5173) |
| `make server` | Start backend only |
| `make client` | Start frontend only |
| `make install` | `npm install` in both `server/` and `client/` |
| `make seed` | Seed the database with full user history data |
| `make seed-offers` | Seed/re-seed all offers with real voyage-4 embeddings |
| `make stop` | Kill processes on ports 5001 and 5173 |

### Manual Setup

#### 1. Backend Setup
1. Navigate to `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   - The `.env` file is created with default local MongoDB URI.
   - If using Atlas, update `MONGODB_URI` in `server/.env`.
4. Seed Data (Optional):
   ```bash
   node seed.js
   ```
5. Start the Server:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5001`.

#### 2. Frontend Setup
1. Navigate to `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Client:
   ```bash
   npm run dev
   ```
   Client runs on `http://localhost:5173`.

## Features
- **Auto Tagging**: Ingested IPDR data is automatically analyzed to generate descriptive tags for users (location, service types, and top visited domains).
- **Map System**: Visualizes IPDR data points on an interactive map.
- **Recommendation Engine**: Recommends offers based on user location (Geo-fencing) and semantic similarity using MongoDB Atlas Vector Search.

## API Endpoints
- `POST /api/ipdr`: Ingest new IPDR log.
- `GET /api/ipdr`: Retrieve IPDR logs.
- `POST /api/offers`: Create a new offer.
- `GET /api/offers/recommend`: Get recommendations based on `latitude` and `longitude`.

## Data Generation Scripts

Located in the `server` directory:

### Full History Seeding
Generates 10 users and 72 hourly IPDR events per user covering the last 3 days.
- **Service Preference**: Each user has an 80% preference for one service type.
- **Consistent Locations & URLs**: For 'Travel' type, it picks one destination (Japan or US) per day and aligns URLs accordingly.
```bash
node seed_full_history.js
```

### Daily IPDR History Generator
Generates a full day of IPDR activity (24 records, 1 per hour) for a specific user and date. This will also force-update the user's activity summary and embedding.
- **Consistent Locations & URLs**: For 'Travel' type, it picks one destination (Japan or US) for the entire 24-hour period and aligns the URLs accordingly.
```bash
node generate_daily_ipdr.js <msisdn> <serviceType> <date> [location]
```

**Date format:** `YYYY-MM-DD`
**Location (optional for Travel):** `Japan` or `USA` (defaults to random if not provided)

**Examples:**
```bash
# Generate 24 hours of Travel activity in Japan for 2025-12-29
node generate_daily_ipdr.js 85290000007 'Travel' 2026-07-08 Japan

# Generate 24 hours of Travel activity in USA for 2025-12-29
node generate_daily_ipdr.js 85290000007 'Travel' 2026-05-29 USA

# Generate 24 hours of Social App activity for 2025-12-29
node generate_daily_ipdr.js 85290000000 'Social App' 2025-12-29
```

### Single IPDR Event Generator
Generates a specific IPDR event for a user. This will also force-update the user's activity summary and embedding.
```bash
node generate_single_ipdr.js <msisdn> <serviceType> <timestamp>
```

**Available serviceTypes:** `'Social App'`, `'Gaming'`, `'Business'`, `'Travel'`

**Examples:**
```bash
# Add a Gaming event for user 85290000000
node generate_single_ipdr.js 85290000000 Gaming 2025-12-30T10:00:00Z
```

## User Profiling & Summarization
The system automatically builds user profiles based on their IPDR activity:
- **Activity Summary**: A natural language summary of the user's recent 24 activities generated via Azure OpenAI GPT models.
- **Dynamic Tags**: Automatically generated tags covering locations, service types, and the top 3 visited URL domain hostnames.
- **Summary Embedding**: A 1024-dimensional vector representation of the summary generated using **Voyage AI `voyage-4`** (via the MongoDB AI endpoint `https://ai.mongodb.com/v1`), used for offer recommendation and similar user discovery.
- **Vector Search**: Recommendations are powered by MongoDB Atlas Vector Search (with a local cosine-similarity fallback) matching the user's summary embedding against offer description embeddings.
- **Midnight Update Rule**: To optimize costs, automated background profiling (via `/api/ipdr`) only triggers AI summarization during the **midnight window (00:00 - 00:59 UTC)**. Manual generation scripts bypass this rule and force an update immediately.

---

## MongoDB Atlas Vector Search Index Setup

The system requires two Atlas Vector Search indexes configured with **1024 dimensions** to match the `voyage-4` embedding model output. This is a one-time manual setup in the Atlas UI.

> **When to do this:** First-time setup, or if you see the error:
> `vector field is indexed with 1024 dimensions but queried with 1536`

### Steps

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com) and open your cluster
2. Navigate to **Atlas Search** → **Create Search Index**
3. Select **Atlas Vector Search**, choose **JSON Editor**
4. Select the correct database (`telco-ipdr`) and collection, paste the JSON below, and click **Create**
5. Repeat for both collections

---

### Index 1 — `user_summary_embedding` on the `users` collection

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "latestActivitySummaryEmbedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

---

### Index 2 — `offer_embedding` on the `offers` collection

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "descriptionEmbedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

---

### After Creating the Indexes

Re-seed all offers with real `voyage-4` embeddings so the `descriptionEmbedding` field contains valid 1024-dim vectors:

```bash
make seed-offers
```

To re-embed all existing users (if users already have a `latestActivitySummary` but their embeddings are stale or wrong-dimension):

```bash
cd server && node re_embed_users.js
```

