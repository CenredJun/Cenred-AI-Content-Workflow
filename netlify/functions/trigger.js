// ============================================================
// AI Content Workflow — Netlify Function (n8n proxy)
// Receives the demo form submission, validates the payload,
// and forwards it to the private n8n webhook URL. The n8n URL
// stays server-side via the N8N_WEBHOOK_URL env var.
//
// NOTE on timing: the full pipeline (3 Claude calls + Ghost
// publish) typically runs 60-90s. Netlify's standard sync
// function timeout is 26s on Pro / 10s on Free. If the demo
// will exceed that, either:
//   1) Switch this to a Netlify Background Function and add a
//      polling endpoint, or
//   2) Have index.html POST directly to the n8n webhook URL
//      (set TRIGGER_URL in index.html to your n8n production URL).
// ============================================================

const FETCH_TIMEOUT_MS = 60_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return jsonError(500, 'Server misconfigured: N8N_WEBHOOK_URL is not set.');
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonError(400, 'Invalid JSON in request body.');
  }

  const topic = (payload.topic || '').trim();
  if (!topic) {
    return jsonError(400, 'Missing required field: topic.');
  }
  if (topic.length > 200) {
    return jsonError(400, 'Topic must be 200 characters or fewer.');
  }

  const forwardBody = {
    topic,
    keyword: typeof payload.keyword === 'string' ? payload.keyword.trim() : null,
    language: typeof payload.language === 'string' ? payload.language : 'English',
    startTs: Number.isFinite(payload.startTs) ? payload.startTs : Date.now(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardBody),
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }

    if (!res.ok) {
      const msg = parsed?.message || parsed?.error || text || `n8n returned ${res.status}`;
      return jsonError(502, `Pipeline error: ${msg}`);
    }

    if (!parsed) {
      return jsonError(502, 'n8n returned a non-JSON response.');
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return jsonError(504, `Pipeline took longer than ${FETCH_TIMEOUT_MS / 1000}s and was aborted.`);
    }
    return jsonError(500, err.message || 'Unexpected server error.');
  } finally {
    clearTimeout(timer);
  }
};

function jsonError(statusCode, message) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ ok: false, error: message }),
  };
}
