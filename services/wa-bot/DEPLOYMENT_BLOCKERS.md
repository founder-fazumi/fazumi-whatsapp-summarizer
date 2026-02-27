# Deployment Blockers (Must Resolve Before Paid Launch)

## BLOCKER 1 — Webhook Hosting Reliability (P5-2)

Current state:
- Webhook hosted on Render (Free plan)
- URL: https://fazumi-whatsapp-summarizer.onrender.com/webhooks/whatsapp
- UptimeRobot pings enabled

Known risk:
- Render Free services can sleep / cold-start
- Cold starts may delay webhook ACKs
- WhatsApp / 360dialog expect fast HTTP 200 responses

Decision:
- Accepted temporarily for pre-paid / testing phase
- NOT acceptable for official paid user launch

Required before paid launch:
- Move webhook receiver to always-on hosting
  (Recommended: Supabase Edge Function)
- Update 360dialog webhook URL
- Verify after 20+ minutes idle that webhooks still respond instantly

Status: DEFERRED — must be resolved before paid launch
