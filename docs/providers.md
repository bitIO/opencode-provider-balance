# Provider Balance APIs

A reference catalogue of whether each LLM provider exposes a **balance** — a
real "remaining credits" number, not spend/usage accounting — through a
programmatic API. It exists as the research step ahead of adding a provider to
the plugin: every row records the endpoint and the credential it needs, so the
"is a balance even fetchable?" question is answered once, here, instead of
being re-researched per integration.

Legend:

- **Yes** — an official endpoint returns a remaining-balance figure with a
  regular API key.
- **Partial** — spend/usage or quota data only, an org/management/admin
  credential is required, or the endpoint is undocumented and may break.
- **No** — the balance is only visible in the provider's console or dashboard.

A row marked **Yes** does **not** mean the provider is implemented in the
plugin yet — check `src/providers.ts` and the README for what is actually
shipped. Endpoints and auth requirements drift; this table was last checked
against provider docs on 2026-09-17.

| Provider | Balance API? | Endpoint | Notes |
| --- | --- | --- | --- |
| DeepSeek | Yes | `GET https://api.deepseek.com/user/balance` | Regular API key. Returns `is_available`, `total_balance`, `granted_balance`, `topped_up_balance`. |
| Kimi (Moonshot AI) | Yes | `GET https://api.moonshot.ai/v1/users/me/balance` | Regular API key. Returns `available_balance`, `voucher_balance`, `cash_balance`. |
| xAI (Grok) | Yes | Management API — List prepaid credit balance and balance changes | Needs a separate Management API credential, not the regular inference key. |
| OpenRouter | Yes | `GET /api/v1/credits` (total balance) / `GET /api/v1/key` (per-key limit) | `/credits` needs a management/provisioning key; `/key` works with a normal key. |
| Anthropic | Partial | `/v1/organizations/cost_report`, `/usage_report/messages` | Org-only, Admin key, gives spend not a "credits remaining" number. No path for personal accounts. |
| OpenAI | Partial / unofficial | `/v1/organization/costs`, `/v1/organization/usage/*` (official, spend only); `/v1/dashboard/billing/credit_grants` (undocumented legacy, unreliable) | Real balance number isn't officially exposed. |
| Google (Gemini API / Vertex) | Partial | Google Cloud Billing API / Cloud Monitoring | Gemini added prepaid credit balances in 2026, but they're only visible in the AI Studio Billing tab — no public API reads them. Programmatic access is spend-only via GCP Cloud Billing / Cloud Monitoring. |
| Qwen (DashScope) | Yes | `GET /api/v1/quotas` (native) / Alibaba Cloud BSS OpenAPI `QueryAccountBalance` | DashScope's own `/api/v1/quotas` returns `credits` and `available` (USD) with the regular `DASHSCOPE_API_KEY`. The BSS route queries the whole Alibaba Cloud account: needs an AccessKey and isn't DashScope-specific. |
| Mistral AI | Partial | `GET /v1/billing/subscription` (undocumented) returns `credit_balance`; beta admin endpoints `/v1/admin/usage`, `/v1/admin/spend-limit`, `/v1/admin/rate-limit` | Community tools read the credit figure from `/billing/subscription` with a regular key, but it's not in the official API reference. The documented beta admin API needs an admin key and covers usage/spend limits, not a balance number. |
| Groq | No | — | Console only (console.groq.com). |
| Together AI | No | — | Dashboard only. |
| OpenCode Zen | No | Requested, not shipped | Dashboard only. |
