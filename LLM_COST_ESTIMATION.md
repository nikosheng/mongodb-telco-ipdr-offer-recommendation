# LLM Cost & Token Estimation (1M Active Users)

This document provides an estimate of the token consumption and daily costs for processing **1,000,000 active users** using the current `autoTaggingService.js` logic.

## 1. Daily Token Consumption Per User

Based on the `updateUserProfile` logic, which processes the last 24 IPDR logs once per day.

### A. GPT-4o-mini (Summarization & Tagging)
- **Input Tokens:** ~820 tokens
    - System Prompt: ~100 tokens
    - User Prompt (24 logs × ~30 tokens/log): ~720 tokens
- **Output Tokens:** ~200 tokens
    - JSON response containing a short summary paragraph and 5-10 tags.

### B. text-embedding-3-small (Vector Generation)
- **Input Tokens:** ~200 tokens
    - Processes the generated summary from the GPT-4o-mini output.

---

## 2. Total Daily Volume (1M Users)

| Metric | Per User | 1,000,000 Users |
| :--- | :--- | :--- |
| **GPT-4o-mini Input** | 820 tokens | **820 Million tokens** |
| **GPT-4o-mini Output** | 200 tokens | **200 Million tokens** |
| **Embedding Input** | 200 tokens | **200 Million tokens** |

---

## 3. Estimated Daily Cost (Azure OpenAI)

*Estimates based on standard pricing tiers for GPT-4o-mini and text-embedding-3-small.*

| Model Component | Rate (per 1M tokens) | Daily Calculation | Total Cost |
| :--- | :--- | :--- | :--- |
| **GPT-4o-mini (Input)** | $0.15 | 820M × $0.15 | **$123.00** |
| **GPT-4o-mini (Output)** | $0.60 | 200M × $0.60 | **$120.00** |
| **Embedding (Input)** | $0.02 | 200M × $0.02 | **$4.00** |
| **TOTAL DAILY COST** | | | **~$247.00** |

---

## 4. Key Takeaways

- **Estimated Monthly Cost:** ~$7,410
- **Efficiency:** The use of `gpt-4o-mini` is highly cost-effective for this scale compared to `gpt-4o` or `gpt-3.5-turbo`.

### Optimization Strategies
1. **Batch API (Asynchronous Processing):**
    - **How it works:** Instead of real-time requests, you submit a `.jsonl` file with bulk requests. Azure processes them within 24 hours.
    - **Cost Benefit:** Provides a **50% discount** on standard token pricing.
    - **Implementation:** Use a script to generate bulk requests and the Azure `batches` endpoint to submit them.
2. **Log Sampling & Filtering:**
    - **Sampling:** Instead of 24 logs, send only the top 10-15 most significant logs (e.g., longest duration or highest data volume).
    - **Filtering:** Only process users who have had *new* activity since the last summary update.
3. **Prompt Compression:**
    - Shorten the `historyText` string format (e.g., use `HH:mm` instead of full ISO timestamps) to reduce input tokens by ~10-15%.
4. **Caching:**
    - Cache results for users with repetitive patterns to avoid redundant LLM calls.

## 5. Batch API Implementation Sample

### A. Request Generation Script
```javascript
import fs from 'fs';
import User from './models/User.js';
import Ipdr from './models/Ipdr.js';

async function generateBatchFile() {
  const users = await User.find({});
  const requests = [];

  for (const user of users) {
    const logs = await Ipdr.find({ msisdn: user.msisdn }).limit(24);
    const historyText = logs.map(l => `${l.serviceType} at ${l.url}`).join('; ');

    requests.push(JSON.stringify({
      custom_id: `user-${user.msisdn}`,
      method: "POST",
      url: "/chat/completions",
      body: {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Summarize logs into JSON: {\"summary\": \"...\", \"tags\": []}" },
          { role: "user", content: `Analyze: ${historyText}` }
        ],
        response_format: { type: "json_object" }
      }
    }));
  }
  fs.writeFileSync('batch_input.jsonl', requests.join('\n'));
}
```

### B. Submission and Retrieval
```javascript
// 1. Upload and Start Batch
const file = await client.files.create({
  file: fs.createReadStream("batch_input.jsonl"),
  purpose: "batch",
});

const batchJob = await client.batches.create({
  input_file_id: file.id,
  endpoint: "/v1/chat/completions",
  completion_window: "24h", // Note: Currently, only "24h" is supported by the API. While the "window" is 24 hours, Azure OpenAI usually completes the jobs much faster (often within 1–4 hours for 1M tokens), but they only guarantee completion within 24 hours to give you the 50% discount.
});

// 2. Download Results (after completion)
const result = await client.files.content(batchJob.output_file_id);
const resultsText = await result.text();
// Process resultsText to update User collection in bulk
```

## 6. Cost Comparison: Standard vs. Batch (1M Users)

| Metric | Standard API | Batch API (Optimized) |
| :--- | :--- | :--- |
| **Daily Cost** | ~$247.00 | **~$123.50** |
| **Monthly Cost** | ~$7,410 | **~$3,705** |
| **Rate Limits** | Risk of 429 errors | Virtually unlimited |
| **Latency** | Real-time | 1-24 hours |

