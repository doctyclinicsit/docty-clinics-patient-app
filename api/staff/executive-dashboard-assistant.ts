import { readAdminStaffSession } from '../../server/staff-admin.js';

const EXECUTIVE_DASHBOARD_SHARE_TOKEN =
  process.env.EXECUTIVE_DASHBOARD_SHARE_TOKEN || 'dcty-investor-2026-6fb7b688c6fd4b8fbf61a95e8c1b35d2';
const EXECUTIVE_DASHBOARD_SHARE_CODE = process.env.EXECUTIVE_DASHBOARD_SHARE_CODE || '742619';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncateJson(value: unknown, maxLength = 24000) {
  const json = JSON.stringify(value || {});
  return json.length > maxLength ? `${json.slice(0, maxLength)}... [truncated]` : json;
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  const shareToken = text(request.body?.shareToken);
  const shareCode = text(request.body?.shareCode);
  const hasShareToken = shareToken && shareToken === EXECUTIVE_DASHBOARD_SHARE_TOKEN;
  const hasShareAccess = hasShareToken && shareCode === EXECUTIVE_DASHBOARD_SHARE_CODE;
  if (adminSession.status !== 200 && hasShareToken && !hasShareAccess) {
    return response.status(403).json({ message: 'Please enter the 6-digit investor access code.' });
  }
  if (adminSession.status !== 200 && !hasShareAccess) {
    return response.status(401).json({ message: 'Please sign in as an admin staff member.' });
  }

  const question = text(request.body?.question);
  if (!question) return response.status(400).json({ message: 'Please enter a question.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ message: 'AI assistant is not configured. Please set OPENAI_API_KEY in Vercel.' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const dashboardContext = truncateJson(request.body?.context);

  try {
    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content:
              'You are an executive dashboard analyst for Docty Clinics. Answer only from the provided dashboard JSON. Be concise, quantify insights in INR/footfall/percent where possible, and clearly say when the data is insufficient.',
          },
          {
            role: 'user',
            content: `Dashboard JSON:\n${dashboardContext}\n\nQuestion: ${question}`,
          },
        ],
        max_output_tokens: 700,
      }),
    });

    const body = await aiResponse.json().catch(() => null);
    if (!aiResponse.ok) {
      return response.status(502).json({ message: body?.error?.message || 'AI assistant is temporarily unavailable.' });
    }

    const answer =
      body?.output_text ||
      body?.output
        ?.flatMap((item: any) => item?.content || [])
        ?.map((item: any) => item?.text || '')
        ?.filter(Boolean)
        ?.join('\n')
        ?.trim();

    return response.status(200).json({ answer: answer || 'I could not generate an answer from the available data.' });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'AI assistant is temporarily unavailable.',
    });
  }
}
