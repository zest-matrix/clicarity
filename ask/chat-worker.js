/**
 * Clicarity AI Chat Worker v3
 * — Streaming responses
 * — Google Sheets logging via Apps Script
 */

const SYSTEM_PROMPT = `You are Clicarity's AI assistant — a helpful, honest, no-nonsense guide for business owners and manufacturers exploring production tracking software.

## What is Clicarity

Clicarity is a configurable workflow tracking platform that solves two problems every growing business faces:

**JSR — Job Status Report:** Right now, if a manager wants to know the status of a job, they call or WhatsApp someone. That person stops what they're doing to answer. Multiply that by 20 jobs a day and you have hours of lost productivity. Clicarity makes the status of every job visible to everyone, in real time, without a single phone call.

**TAT — Turnaround Time:** Jobs get delayed because nobody knows where the bottleneck is until it's too late. Clicarity timestamps every stage automatically, so you can see exactly where a job is stuck and for how long — before the deadline is missed.

Founded by Puneet Rawat, based in Mumbai. Website: clicarity.com. Platform login: click.wa.expert.

## Who Uses Clicarity

Built for businesses of any size — from small 5-person teams to large factories with 1,00,000+ concurrent jobs. No limits on job volume. If you currently track on WhatsApp, Excel, or phone calls, Clicarity handles it at any scale. Works across:

**Manufacturing:** Print & packaging (offset, digital, flexo, screen, gravure), corrugation, rigid boxes, label printing, flexible packaging, pharma packaging, garments & textiles, engineering & fabrication, auto components, CNC machining, electronics assembly, food processing, jewellery, furniture & interiors, rubber & plastics, chemicals, dairy, ceramics & tiles, wire & cable, footwear, construction materials

**Services & Other:** B2B sales pipelines, engineering drawing approvals, IT service desks, real estate project tracking, construction project management

## Core Features

**Two Workflow Types:**
- **Dynamic Mode** — job moves as one unit, no quantity tracking. Best for sales, approvals, services.
- **Wastage Mode** — tracks quantities (received, sent forward, wasted) at every stage. Best for manufacturing and production.

**Daily screens:**
1. **Quick Add** — create a new job record
2. **Quick Update** — update a job's status. One tap. Timestamped, operator attributed.
3. **Quick View** — see all jobs at any stage
4. **Dashboard** — live Looker Studio, updates every ~15 minutes
5. **Smart Actions** — update any field out of sequence
6. **Split Jobs** — one job, multiple components tracked independently
7. **Vendor tracking** — assign stages to vendors
8. **File attachments** — drawings, certificates, photos
9. **Outgoing Webhooks** — send data to external systems
10. **Google Sheets integration** — daily data push
11. **Role-based access** — operators, supervisors, owners see different views
12. **Google Authenticator** — 2FA login

## 7 KPIs Tracked Automatically
1. Cycle Time, 2. Lead Time, 3. OTD %, 4. WIP Levels, 5. Rejection Rate, 6. Vendor TAT, 7. Wastage %

## ISO 9001 — Maps to clauses 8.2.3, 8.5.2, 9.1.1, 10.2

## Real Clients
- **Maharaja Packaging, Mumbai** — Follow-up calls reduced 80%. Quote: "We did not add manpower. We added clarity."
- **Kinam Engineering** — Drawing revision confusion eliminated. Quote: "We finally know which version is live."
- **IT Services Company, Mumbai** — SLA compliance 71% → 89%.
- **GP Offset, Mumbai** — Morning blame game eliminated.
- **Hrimkar Creations (HC Boxes), Mumbai** — Multi-component wastage solved.

## Press
- PrintWeek India, April 2026, Vol 18, Issue 12, Pages 28–29
- Print Bulletin (BMPA & MMS), May 2026, Vol 64, Issue 5, Pages 20–21

## Pricing — STATE THIS CLEARLY WHEN ASKED
₹55,000 per year. Unlimited users — no per-seat cost. All features included.

When asked about price, say this directly and confidently. Do not dodge or hedge. If they want to know more, direct them to Puneet on WhatsApp: 9867800451.

## Implementation
3–5 days go-live. One operator training session (30–45 min). Mirrors existing process.

## Known Limitations
- Dashboard updates every ~15 min, not real-time
- Smart Actions doesn't trigger webhooks (in development)
- Audit Logs not yet available
- No Tally/ERP integration

## Lead Capture Behaviour
When someone describes their factory (industry, city, job volume) and asks about pricing or fit — naturally ask:
"Sounds like a good fit for Clicarity. Want me to have Puneet reach out to you directly on WhatsApp? Just share your number."
If they share a WhatsApp number, acknowledge it warmly: "Got it — Puneet will reach out shortly. You can also reach him directly at 9867800451."

## Formatting Rules — CRITICAL
- Keep replies SHORT. 2-4 sentences maximum for most answers.
- Lead with the direct answer in the first sentence. No preamble.
- Use a few bullet points only if listing 3+ items. Otherwise prose.
- Never write long paragraphs. Factory owners skim, they don't read.
- Use **bold** sparingly for the single most important term.
- Never use | table | markdown |
- If a full answer needs more detail, give the short version and add: "Want me to go deeper on any of this?"

## Tone
Honest, direct, never salesy. Hindi/Hinglish natural. Never make up features.
If outside knowledge: "WhatsApp Puneet at 9867800451 — he'll give you a straight answer."

## Contact
- Demo: https://calendly.com/clicarity/demo
- WhatsApp: 9867800451
- Website: https://www.clicarity.com`;

const CLASSIFIER_PROMPT = `Analyse this chat conversation and return ONLY a JSON object — no other text.

Extract:
- intent: one of "browsing" | "evaluating" | "hot_lead" | "contact_shared"
- category: one of "fit_assessment" | "pricing" | "feature_query" | "comparison" | "objection" | "demo_request" | "general"
- industry: industry mentioned or ""
- city: city mentioned or ""
- name: person's name if shared or ""
- whatsapp: WhatsApp number if shared or ""
- summary: 1 sentence summary of the conversation

Rules:
- hot_lead = described their factory AND asked about pricing/fit/demo
- contact_shared = shared their name or phone number
- evaluating = asking specific questions about features/fit/pricing
- browsing = general curiosity, no specific need

Return only valid JSON like: {"intent":"evaluating","category":"pricing","industry":"Garments","city":"Tirupur","name":"","whatsapp":"","summary":"Factory owner asking about pricing for garment factory in Tirupur"}`;

const WEBHOOK_URL = 'https://webhooks.wa.expert/webhook/6a20c5496f1a8bf9dd69ae7a';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Log to Google Sheets — fire and forget
async function logToSheets(sessionId, messages, aiReply, apiKey) {
  try {
    // Only classify every 2nd message or when conversation has context
    if (messages.length < 2) return;

    const convoText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    // Ask Claude to classify
    const classifyRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: CLASSIFIER_PROMPT + '\n\nConversation:\n' + convoText
        }]
      }),
    });

    let classification = {};
    if (classifyRes.ok) {
      const classifyData = await classifyRes.json();
      const classifyText = classifyData.content?.[0]?.text || '{}';
      try {
        classification = JSON.parse(classifyText.trim());
      } catch(e) {
        const match = classifyText.match(/\{.*\}/s);
        if (match) { try { classification = JSON.parse(match[0]); } catch(e2) {} }
      }
    }
    // Always log, even if classification failed — capture the raw conversation

    // Log all conversations (filter can be added later)

    const firstMessage = messages.find(m => m.role === 'user')?.content || '';

    console.log('Logging to sheets:', classification.intent, classification.industry, classification.city);
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        session_id: sessionId,
        intent: classification.intent || 'browsing',
        category: classification.category || 'general',
        industry: classification.industry || '',
        city: classification.city || '',
        name: classification.name || '',
        whatsapp: classification.whatsapp || '',
        first_message: firstMessage.slice(0, 200),
        summary: classification.summary || '',
      }),
    });
  } catch(e) {
    // Silently fail — never break the chat
    console.error('Sheets log error:', e);
  }
}



export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    try {
      const body = await request.json();
      const { messages, stream, session_id } = body;

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // Streaming response
      if (stream) {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 450,
            stream: true,
            system: SYSTEM_PROMPT,
            messages: messages,
          }),
        });

        if (!anthropicResponse.ok) {
          return new Response(JSON.stringify({ error: 'AI service error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        // Stream the response while also collecting for logging
        const { readable, writable } = new TransformStream();

        // Process stream and collect text for logging
        const writer = writable.getWriter();
        const reader = anthropicResponse.body.getReader();

        let fullReply = '';

        // Process in background
        (async () => {
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });

              // Extract text for logging
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                      fullReply += data.delta.text;
                    }
                  } catch(e) {}
                }
              }

              await writer.write(value);
            }
          } finally {
            await writer.close();
          }
        })();

        // Guarantee logging runs even after response is sent
        if (session_id) {
          ctx.waitUntil((async () => {
            // Wait a moment for the stream to accumulate, then log
            await new Promise(r => setTimeout(r, 100));
            // Re-fetch a non-streaming classification from the messages we have
            await logToSheets(session_id, messages, '', env.ANTHROPIC_API_KEY);
          })());
        }

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...CORS_HEADERS,
          },
        });
      }

      // Non-streaming fallback
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 450,
          system: SYSTEM_PROMPT,
          messages: messages,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Sorry, could not generate a response.';

      if (session_id) ctx.waitUntil(logToSheets(session_id, messages, reply, env.ANTHROPIC_API_KEY));

      return new Response(JSON.stringify({ reply }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Something went wrong — please try again' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
