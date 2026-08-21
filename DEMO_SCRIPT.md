# Telco IPDR Offer Recommendation — SA Demo Guide

**Primary Scenario:** US Roaming — User `85290000005`
**Estimated Demo Time:** 15–20 minutes

---

## Table of Contents

1. [Pre-Demo Setup](#1-pre-demo-setup)
2. [Generate Fresh Activity Data](#2-generate-fresh-activity-data)
3. [Step 1 — Search the User](#3-step-1--search-the-user)
4. [Step 2 — User Activity Insight](#4-step-2--user-activity-insight)
5. [Step 3 — Similar Behavior Users](#5-step-3--similar-behavior-users)
6. [Step 4 — Matching Offers](#6-step-4--matching-offers)
7. [Step 5 — Open the Chatbot & Ask Questions](#7-step-5--open-the-chatbot--ask-questions)
8. [Step 6 — Send the Offer via Chatbot](#8-step-6--send-the-offer-via-chatbot)
9. [Step 7 — Customer Journey Verification](#9-step-7--customer-journey-verification)
10. [Secondary Scenarios](#10-secondary-scenarios-optional)
11. [Chatbot Quick Reference](#11-chatbot-quick-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Pre-Demo Setup

Run these commands before the audience arrives.

**Install dependencies (first time only):**
```bash
make install
```

**Seed the database (first time only):**
```bash
make seed
```

This seeds both offers (with voyage-4 embeddings) and users (with 72h of IPDR history) in one command. Run this once before the first demo, or any time you need to reset the database to a clean state.

**Start both server and client with a single command:**
```bash
make dev
```

This launches both the backend (port 5001) and frontend (port 5173) concurrently in one terminal, with color-coded `[SERVER]` / `[CLIENT]` prefixed output. Press `Ctrl+C` to stop both.

```
[SERVER] Connected to MongoDB
[SERVER] Server running on port 5001
[CLIENT] VITE ready in 300ms
[CLIENT] Local: http://localhost:5173
```

> **If you need to start them separately:**
> ```bash
> make server   # backend only
> make client   # frontend only
> ```

Open **http://localhost:5173** in a browser. You will see a two-panel layout:
- **Left sidebar** — search bar, user insight panels, offer cards, activity log
- **Right panel** — interactive Leaflet map with live IPDR markers

> **Tip:** Use a wide browser window (1440px+) or full-screen mode. The sidebar is 32rem wide; the map fills the remaining space.

---

## 2. Generate Fresh Activity Data

> **Why this step matters:** The User Activity Insight is powered by an AI summary of the user's last 24 IPDR records. By default, the system only re-generates this summary during the midnight window (00:00–00:59 UTC) to manage API costs. Running the script below force-generates today's IPDR records and immediately triggers a fresh AI summary and embedding update — making the demo feel live.

**Run this command from the `server/` directory** (replace the date with today's date in `YYYY-MM-DD` format):

```bash
node generate_daily_ipdr.js 85290000005 'Travel' 2026-08-21 USA
```

**Command Parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `msisdn` | `85290000005` | The subscriber's phone number (primary demo user) |
| `serviceType` | `Travel` | IPDR service category — determines URLs and location type |
| `date` | `2026-08-21` | Date for the 24 generated records (use today's date) |
| `location` | `USA` | Travel destination — pins all 24 records to New York coordinates |

**What the script does internally:**

1. Connects to MongoDB
2. Generates **24 hourly IPDR records** for the user on the specified date, each with:
   - A randomized timestamp within that hour
   - Travel-related URLs (e.g. `klook.com/activity/us`, `trip.com/hotels/us`)
   - New York GPS coordinates with slight random offset for realism
   - Upload/download volumes, session duration, protocol metadata
3. Inserts all 24 records to the `ipdrs` collection
4. Calls `updateUserProfile()` with `forceUpdate: true`, which:
   - Fetches the latest 24 IPDR records for this user
   - Sends them to **GPT-4o-mini** to generate a plain-language behavioral summary
   - Generates a **voyage-4** vector (1024-dim) from that summary via the MongoDB AI endpoint
   - Saves both the summary and the embedding back to the `users` collection

**Expected terminal output:**
```
Connected to MongoDB
Selected Travel Destination for this day: USA
Successfully generated 24 IPDR records for 85290000005 on 2026-08-21
Updating User Profile...
User Profile Updated with new summary and embedding.
```

> **What to say to the audience:**
> "Before we start, I just ran a data generation script that simulates this subscriber's activity for today — 24 hourly data records showing roaming activity in the US. The system immediately re-profiled the user using GPT-4o-mini. In production, this pipeline runs automatically on every new IPDR ingestion during the nightly window, or in real-time via API push."

---

## 3. Step 1 — Search the User

**What to do:**
- Click the MSISDN search bar at the top of the left sidebar
- Type: `85290000005`
- Press **Enter** or click the search icon

**What happens on screen:**
- A loading spinner replaces the search icon while data fetches
- The map **re-centers and zooms to New York, USA** — the user's latest IPDR location
- A **red "Latest Position" marker** appears on the map at the user's coordinates
- Clicking the marker shows a popup with: user initials, service type, timestamp, and tags
- The sidebar populates with the User Activity Insight, Customer Journey (if exists), Similar Behavior Users, and personalized Offer cards

> **What to say:**
> "Every subscriber's device continuously generates IPDR — IP Detail Records. This is network-layer telemetry: every URL visited, data consumed, session duration, and GPS coordinates, logged at the carrier level. When I search this MSISDN, the system instantly pulls their full real-time context — not just account data from a CRM, but live behavioral signals from the network itself."

---

## 4. Step 2 — User Activity Insight

**What to show:**
- The **blue "User Activity Insight" card** in the sidebar (appears directly below the search bar)
- The **italic AI-generated summary** text, e.g.:
  > *"This user has been consistently roaming in the USA, frequently accessing travel booking platforms such as klook.com and trip.com, indicating active trip planning or ongoing travel activity..."*
- The **auto-generated hashtag chips** below the summary, e.g.:
  `#Travel` `#USA` `#klook.com` `#trip.com` `#agoda.com`

**What to say:**
> "Instead of showing a CSR a raw table of thousands of log entries, we run GPT-4o-mini over the user's last 24 IPDR records and produce a plain-language behavioral summary. We also auto-extract structured tags covering location, service category, and the top visited domains. That summary is then converted into a 1024-dimensional vector using Voyage AI's voyage-4 model — served through the MongoDB AI endpoint. This embedding is what powers every downstream feature you're about to see: similar user matching, offer ranking, and chatbot context. It's a semantic understanding of who this user is right now, not just a static demographic profile."

---

## 5. Step 3 — Similar Behavior Users

**What to show:**
- The **indigo "Similar Behavior Users" card** in the sidebar
- Up to **3 users listed**, each showing:
  - Name or MSISDN
  - Similarity score percentage (e.g. `87%`)
  - Their own AI-generated activity summary (truncated)
  - Shared tag chips (e.g. `#Travel` `#USA`)
- Each user card is **clickable** — clicking one re-searches that user and updates all panels

**Optional interaction:**
- Click one of the similar users → map re-centers to their location, sidebar updates with their insight and offers
- Click back (type `85290000005` again) to return to the primary demo user

**What to say:**
> "We convert each user's activity summary into a 1024-dimensional vector using Voyage AI's voyage-4 model, served through the MongoDB AI endpoint, and store it in MongoDB Atlas. When you pull up a user, we run an Atlas Vector Search query — a cosine similarity search across all user embeddings — to find the three most behaviorally similar subscribers. These aren't manually defined segments. The system discovered that these users share the same real-world behavior purely from their network activity. At scale, this means you can identify entire cohorts of roaming travelers, heavy streamers, or business users without writing a single segmentation rule."

---

## 6. Step 4 — Matching Offers

**What to show:**
- The **Offers section** in the sidebar — now personalized, with the header reading:
  `Offers for MSISDN 85290000005`
- The **top offer card** has a green **`95% MATCH`** badge in its top-right corner
  - Expected top offer: **"USA High-Speed Roaming 5GB"** (usage-based top-up trigger)
- Lower-ranked offers show lower match scores (e.g. `72%`, `61%`)
- Each card shows the offer name, description text, and tag chips

**What to say:**
> "The recommendation engine runs three strategies in priority order. First, usage-based detection: this user has consumed over 90% of their 5GB US roaming plan, so re-purchasing that exact plan scores 0.95 — the highest-priority trigger, because we know they need more data right now. Second, location mismatch detection: if the user's current GPS country doesn't match any active roaming plan, we proactively surface a country-specific pass — even before the user runs out of data. Third, vector similarity: we match the user's behavioral embedding against each offer's description embedding, so contextually relevant products rank higher even without explicit rules. The result is a ranked, explainable list — not a black box."

---

## 7. Step 5 — Open the Chatbot & Ask Questions

**What to do:**
- Click the **blue circular chat button** in the bottom-right corner of the screen
- The **"Telco AI Assistant"** panel opens (640px wide, 700px tall)
- A green pulsing dot in the header indicates the agent is connected

**Type the following prompts one at a time.** Wait for each response before typing the next.

---

**Prompt A — Get user details:**
```
Can you give me the details for user 85290000005?
```
> **Expected:** The agent calls the `user_agent` tool and returns the full user profile — current location (USA), active roaming plan name, usage percentage, auto-generated tags, and the latest activity summary. Response is formatted with bold labels and a structured layout.

---

**Prompt B — Get the recommendation:**
```
What is the best offer recommendation for this user?
```
> **Expected:** The agent calls the `recommend_agent` tool and returns the top 1–2 personalized offers with an explanation of why they were recommended — specifically citing the usage threshold (>50%) and the plan name match. Response may include a markdown table comparing offer options.

---

**Prompt C — Explore similar users (optional, if time permits):**
```
Are there other users with similar roaming behavior in the US?
```
> **Expected:** The agent calls `find_high_usage_users_in_region` to find US roamers with high data consumption, returning a list of MSISDNs, their plan names, and current usage levels.

**What to say:**
> "The chatbot is a LangGraph ReAct agent backed by GPT-4o-mini. It has access to seven specialized tools: user profile lookup, offer catalog search, personalized recommendation, fulfillment, high-value customer ranking, region-based usage filtering, and location-based user discovery. The agent autonomously decides which tool to call — and in what sequence — based on the natural language query. Your CSR team just describes what they need in plain English. The orchestration happens invisibly."

---

## 8. Step 6 — Send the Offer via Chatbot

**Continue in the same chat window** (do not close or clear the conversation — the agent uses full conversation history for context).

**Type:**
```
Please send this offer to the user.
```

> **Expected response:** The agent calls the `fulfillment_agent` tool, which:
> - Writes a record to the `audit-logs` MongoDB collection (compliance trail)
> - Appends a `"pushed"` event to the user's `customerJourney` array in the `users` collection, with: offer name, action, timestamp, and details
> - Returns a confirmation message in the chat, e.g.: *"The offer 'USA High-Speed Roaming 5GB' has been successfully sent to user 85290000005."*

**What to say:**
> "With one natural language instruction, the agent closes the loop. It doesn't just recommend — it acts. The fulfillment step writes to the audit log for compliance and governance, and simultaneously updates the customer's journey record in real time. Every action taken by the AI agent is fully traceable and attributable. In a production integration, this step would also trigger the actual offer delivery through the BSS/OSS stack."

---

## 9. Step 7 — Customer Journey Verification

**What to do:**
- In the MSISDN search bar, type `85290000005` again and press **Enter**
- This re-fetches the user from MongoDB, picking up the newly written journey event

**What to show:**
- The **purple "Customer Journey" card** now appears in the sidebar (it only renders when the user has at least one journey event)
- A **vertical timeline** showing the most recent event at the top, e.g.:

```
  ● [PUSHED]   USA High-Speed Roaming 5GB          Aug 21, 2:34 PM
               Offer sent via AI agent fulfillment
```

- The timeline dot is **purple** for `pushed`, **blue** for `viewed`, **green** for `purchased`
- If prior journey events exist from earlier runs, they appear below in reverse chronological order

**What to say:**
> "The Customer Journey panel gives any agent or CSR an instant 360-degree view of every offer touchpoint for this subscriber — when they were targeted, what they received, the channel it was delivered through, and whether they eventually converted. This closed-loop record also feeds back into future recommendation scoring. A subscriber who was sent an offer but didn't convert may receive a different recommendation next time. The system learns from the full journey, not just the last click."

---

## 10. Secondary Scenarios (Optional)

Use these if time permits or the audience asks about other use cases. Run the data generation command first, then search the MSISDN in the UI.

---

### Scenario B — Japan Traveler with Active Plan (User `85290000009`)

```bash
# Run from server/ directory
node generate_daily_ipdr.js 85290000009 'Travel' 2026-08-21 Japan
```

- Search `85290000009` in the UI
- User is in Tokyo with ~6.8GB consumed on a 10GB Japan plan (68% usage)
- **Top recommendation:** Japan plan top-up (usage-based trigger, score ~0.95)
- Good for showing the recommendation logic applied to a different geography

---

### Scenario C — Japan Traveler with No Japan Plan (User `85290000007`)

```bash
# Run from server/ directory
node generate_daily_ipdr.js 85290000007 'Travel' 2026-08-21 Japan
```

- Search `85290000007` in the UI
- User's GPS shows Tokyo, but their only active plan is for the USA
- **Location mismatch detected** → system scores `"Japan Unlimited Data Pass"` at **0.99** (highest possible priority)
- The recommendation fires **before** the user even runs out of data
- Best scenario for demonstrating **proactive, AI-driven outreach** — the carrier reaches out before the customer calls in frustrated

> **What to say for Scenario C:**
> "This is the most powerful story. The user just landed in Japan. They have a US plan. They're trying to access Google Maps and it's not working. Before they even know there's a problem — before they call the hotline — the system has already detected the location mismatch, identified the right offer, and can push it to them automatically. That's the shift from reactive customer service to proactive, intelligent engagement."

---

### Chatbot Prompts for Secondary Scenarios

```
# For Japan scenarios
Find users currently in Japan.
Check the profile for user 85290000007. Do they have a Japan roaming plan?
What offer should we recommend for this user?
Please send this offer to the user.
```

---

## 11. Chatbot Quick Reference

Print or keep this table visible during the demo for quick copy-paste.

| What You Want to Show | Prompt to Type | Tool the Agent Calls |
|---|---|---|
| Pull up a user's full profile | `Can you give me the details for user 85290000005?` | `user_agent` |
| Get personalized offer recommendation | `What is the best offer recommendation for this user?` | `recommend_agent` |
| Find high-usage US roamers | `Find users in the US who have consumed more than 3GB of roaming data.` | `find_high_usage_users_in_region` |
| Find users currently in Japan | `Find users currently in Japan.` | `find_users_in_region` |
| Check if a user has a country plan | `Does user 85290000007 have a Japan roaming plan?` | `user_agent` |
| Rank top data consumers | `Who are the highest data usage customers right now?` | `high_value_customer_agent` |
| Search the offer catalog | `Tell me about the Japan Unlimited Data Pass offer.` | `offer_agent` |
| Send the offer to the user | `Please send this offer to the user.` | `fulfillment_agent` |

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| **Atlas Vector Search error** (`vector field is indexed with 1024 dimensions but queried with 1536`) | Atlas indexes were created with wrong dimension count | Recreate both indexes with `numDimensions: 1024` per the README Atlas setup section, then run `make seed-offers` and `node re_embed_users.js` |
| **No User Activity Insight text** (card shows "No activity summary available") | AI summary not yet generated for this user | Run `generate_daily_ipdr.js` for this MSISDN — the script force-triggers a profile update |
| **No Similar Behavior Users shown** | Other users have no embeddings | Run `node seed_full_history.js` from `server/` to seed all 10 users with history and embeddings |
| **Customer Journey card not appearing** | No journey events written yet | Complete Step 6 (send the offer via chatbot) first, then re-search the user |
| **Map does not re-center to USA** | No USA-location IPDR records exist for this user | Run `generate_daily_ipdr.js 85290000005 'Travel' <today> USA` first |
| **Offers section shows "Personalized" but scores look wrong** | Stale embedding from old activity | Re-run `generate_daily_ipdr.js` to force a fresh embedding update |
| **Chatbot takes 10–20 seconds to respond** | Normal — LangGraph agent makes multiple sequential LLM calls per query | Expected behavior. Use the wait time to explain the ReAct reasoning loop to the audience |
| **Chatbot returns an error message** | Azure OpenAI API key issue or rate limit | Check `server/.env` for `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT`; verify quota in Azure portal |
| **`generate_daily_ipdr.js` fails with DB error** | MongoDB not running or wrong URI | Ensure MongoDB is running; check `MONGODB_URI` in `server/.env` |
