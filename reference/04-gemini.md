# Gemini setup using the free allowance

## Configure

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey), choose/create a project, and create a Gemini API key.
2. To target the free allowance, keep the project on Google's free tier. Check the actual model quota in AI Studio before relying on it.
3. Edit only the server `.env`:

```dotenv
GEMINI_ENABLED=true
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_MAX_REQUESTS_PER_MINUTE=5
GEMINI_MAX_REQUESTS_PER_DAY=20
GEMINI_MAX_OUTPUT_TOKENS=1024
```

4. Restart the backend. Log in, open Settings and choose **Check connections**.
5. Open **AI Assistant → Gemini drafts**. Enter a prompt and optional context, confirm the data-sharing checkbox, then generate. Review the response before saving it as a document.

The app uses Google's `generateContent` REST endpoint from Node with the key in the `x-goog-api-key` header. It needs no Google SDK, browser key, or OpenAI service. The normal offline assistant and local templates remain available.

## Free-tier facts and safeguards

At verification time, Google's pricing page lists free-tier input/output for `gemini-2.5-flash-lite`. Availability and quotas vary by project/model and can change; use AI Studio's current limits. Google applies quotas per project, and daily request quotas reset at midnight Pacific time. Sources: [pricing](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

The 5/minute and 20/day values above are conservative application defaults, not Google's guaranteed quota. Requests count against a durable server-local budget before being sent. Identical prompt/context/model requests reuse a ten-minute in-memory response cache. There is one in-flight request at a time, bounded prompt/context/output size, a 30-second timeout, no automatic retries, no model fallback, and no grounding tools.

The application cannot determine whether your Google project has billing enabled or enforce a currency spending cap. Using a billed project may incur charges even inside these application budgets. Verify your project tier yourself. Do not rotate keys or projects to evade quota limits.

## Privacy and behavior

Only the text entered into the Gemini panel is sent. The app does not automatically attach students, documents, emails, files, or the full workspace. Google's free-tier pricing disclosure says submitted data can be used to improve products; do not submit confidential student or institutional information through that tier. [Google pricing and data-use disclosure](https://ai.google.dev/gemini-api/docs/pricing)

Gemini output is untrusted draft text. It does not execute tools, change records, send messages or submit reports. Review facts and citations yourself. Saving requires an explicit action and opens an editable document.

## Configuration and errors

- **Not configured:** set key and enable flag, then restart Node.
- **429 / Google quota:** check the project's actual quota and wait; the app does not retry automatically.
- **Local budget exhausted:** wait for the configured minute/day window. The daily counter uses Pacific time.
- **401/403 upstream:** check key/project access in AI Studio.
- **404 model:** set an available model with a free tier in `GEMINI_MODEL`; the app does not switch models automatically.
- **Empty response:** a safety filter may have blocked the request; rephrase it.
- **Timeout/unavailable:** check backend connectivity; your local records remain intact.

Budget counters live in `.data/gemini-usage.json`; keep that file on persistent disk. Do not delete it to bypass limits. This limiter targets one Node instance. Multiple production replicas need a shared quota store before scaling.

[API keys guide](https://ai.google.dev/gemini-api/docs/api-key) · [generateContent API](https://ai.google.dev/api/generate-content)
