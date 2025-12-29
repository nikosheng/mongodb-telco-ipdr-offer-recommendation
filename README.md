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

### 1. Backend Setup
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

### 2. Frontend Setup
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
node generate_daily_ipdr.js 85290000000 'Travel' 2025-12-29 Japan

# Generate 24 hours of Travel activity in USA for 2025-12-29
node generate_daily_ipdr.js 85290000000 'Travel' 2025-12-29 USA

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
- **Summary Embedding**: A vector representation of the summary (using `text-embedding-3-small`) used for offer recommendation.
- **Vector Search**: Recommendations are powered by MongoDB Atlas Vector Search (with a local fallback) matching the summary embedding against offer description embeddings.
- **Midnight Update Rule**: To optimize costs, automated background profiling (via `/api/ipdr`) only triggers AI summarization during the **midnight window (00:00 - 00:59 UTC)**. Manual generation scripts bypass this rule and force an update immediately.

