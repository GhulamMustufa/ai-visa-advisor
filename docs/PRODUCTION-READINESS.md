# Is Borderless AI Ready for Real Users?

**Yes.** Here's what we've done to make sure it's safe, reliable, and honest.

---

## Security

### Preventing Bad Inputs
- We check and limit what users can type into the form — too-long or unusual inputs are rejected before they reach the AI
- This protects against attempts to confuse or manipulate the AI

### Preventing AI Manipulation
- All official documents we show to the AI are clearly marked as data-only
- The AI is instructed to ignore any "trick" instructions that might be hidden inside user content
- This is a known attack called "prompt injection" — we guard against it

---

## Reliability

### What Happens If OpenAI Goes Down?
The system has a **fallback mode**. If OpenAI is unavailable or slow:
- The AI explanation step is skipped
- You still get your full visa score (calculated by our own rules engine)
- Your results come back quickly — just without the AI commentary

This means the app **always works**, even if the AI is having a bad day.

### What If There Are Too Many Requests?
The system automatically retries failed requests. If OpenAI returns a "too many requests" error, we wait the right amount of time before trying again, instead of spamming the server.

---

## Observability (We Can See What's Happening)

- Every request is logged with timing, model version, and cost
- We track how much each assessment costs (currently ~$0.003 per assessment — very low)
- Logs are structured so they can be sent to monitoring tools like Datadog

---

## Cost Per User

| Action | Cost |
|---|---|
| One visa assessment | ~$0.003 |
| One AI chat message | ~$0.001 |

These are very small costs, which means the Free tier is sustainable.

---

## Known Limitations (Honest About What's Not Perfect Yet)

1. **The circuit breaker (fallback) is per-server instance** — If many users hit the site at the same time, each server instance tracks failures separately. In high-traffic scenarios, this could be improved by using a shared Redis store.

2. **No hard monthly spend cap** — We track costs, but there's no automatic shutoff if the bill unexpectedly spikes. This is a future improvement.

---

## Status: ✅ Ready for Production

The app is live and serving real users at [borderless.ghulam-mustafa.com](https://borderless.ghulam-mustafa.com).
