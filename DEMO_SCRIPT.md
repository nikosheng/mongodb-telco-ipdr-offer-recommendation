
# AI Agent Demo Script

This script demonstrates the agent's ability to identify high-usage roaming customers, retrieve their details, and provide personalized offer recommendations based on their real-time usage patterns.

## Scenario 1: US Roaming Customer High Usage

**Context:** User 5 (`85290000005`) is in the US and has used ~4.5GB of their 5GB plan (90%+ usage).

**Step 1: Identify High Usage Users**
> "Find users in the US who have consumed more than 3GB of roaming data."
找出在美國境內漫遊數據使用量超過 3GB 的用戶。

**Step 2: Get User Context**
> "Can you give me the details for user 85290000005?"
你能提供用戶 85290000005 的詳細資料嗎？

**Step 3: Get Personalized Recommendation**
> "What is the best offer recommendation for this user?"
*(Expected Result: Agent recommends repurchasing/topping up 'USA High-Speed Roaming 5GB' because usage > 50%)*
針對這位用戶，最推薦的優惠方案是什麼

**Step 4: Fulfillment**
> "Please send this offer to the user."
請將此優惠方案寄送至用戶。

---

## Scenario 2: Global/Gaming High Usage

**Context:** User 2 (`85290000002`) has a 'Global Gaming Turbo 10GB' plan and has used ~7.1GB (70%+ usage).

**Step 1: Identify High Usage Users**
> "Find users with 'Global' roaming plans who have used more than 5GB of data."

**Step 2: Get User Context**
> "Tell me about user 85290000002."

**Step 3: Get Personalized Recommendation**
> "Recommend a suitable offer for them."
*(Expected Result: Agent recommends 'Global Gaming Turbo 10GB' top-up due to high usage)*

---

## Scenario 3: Japan Traveler

**Context:** User 9 (`85290000009`) is in Japan with ~6.8GB usage on a 10GB plan.

**Step 1: Identify High Usage Users**
> "Who are the high usage users in Japan with more than 5GB usage?"
找出在日本境內漫遊數據使用量超過 5GB 的用戶。

**Step 2: Get User Context**
> "Get details for 85290000009."
你能提供用戶 85290000009 的詳細資料嗎？

**Step 3: Recommendation**
> "Which offer should we send to them?"
針對這位用戶，最推薦的優惠方案是什麼

---

## Scenario 4: Japan Traveler (No Plan) - **NEW**

**Prerequisite:** Run the setup script to simulate user 5 arriving in Japan without a plan:
```bash
node scripts/setup_japan_demo_scenario.js
```

**Context:** User 5 (`85290000007`) has just landed in Japan. They have a US plan but no Japan plan. IPDR data shows they are trying to access maps in Tokyo.

**Step 1: Identify New Roamers**
> "Find users currently in Japan."
*(Expected Result: Agent finds user 85290000007 based on recent IPDR location/summary)*
找出目前在日本境內的使用者

**Step 2: Get User Context**
> "Check the profile for user 85290000007. Do they have a Japan roaming plan?"
*(Expected Result: Agent confirms they have a US plan but NO Japan plan)*
檢查用戶 85290000007 的個人資料。他們是否有日本漫遊方案？

**Step 3: Proactive Recommendation**
> "What offer should we recommend?"
*(Expected Result: Agent detects the location mismatch and recommends 'Japan Unlimited Data Pass' with high priority)*

---

## Key Features Demonstrated
1.  **Region-Specific Search**: `find_high_usage_users_in_region` tool filters by plan name regex (e.g., "US", "Japan").
2.  **Cross-Tool Context**: Agent uses the MSISDN from the search result to call `user_agent`.
3.  **Smart Logic**: `recommend_agent` detects >50% usage and prioritizes a top-up offer over generic recommendations.
4.  **Real-Time Context**: `recommend_agent` detects location mismatch (Japan vs US Plan) and offers a country-specific pass.
5.  **Action**: `fulfillment_agent` closes the loop by "sending" the offer.
