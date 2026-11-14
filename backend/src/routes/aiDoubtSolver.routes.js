import { Router } from 'express';

const router = Router();

const SYSTEM_PROMPT = `You are LearnMate AI, an expert, patient, and engaging academic tutor and doubt solver for students.
Your primary mission is to help students learn and master academic subjects including:
- Computer Science & Programming (Python, JavaScript, C++, Java, Web Development, Data Structures, Algorithms)
- Mathematics (Algebra, Calculus, Linear Algebra, Probability, Statistics, Discrete Math)
- Engineering (Electrical, Mechanical, Civil, Computer Systems)
- Natural Sciences (Physics, Chemistry, Biology)
- General Academic Study & Exam Prep

GUIDELINES:
1. Explain concepts in clear, intuitive, and pedagogical language suited to a student's level.
2. For coding questions:
   - Provide working, clean code wrapped in markdown code blocks with language identifiers.
   - Explain the underlying logic and step-by-step reasoning.
   - Mention edge cases and best practices when relevant.
3. For math, physics, and engineering calculations:
   - Break down problems into structured, step-by-step solutions.
   - Show formulas explicitly, explain the variables, and provide intermediate calculation steps.
4. If a question is ambiguous, underspecified, or missing vital details, provide a helpful partial answer and ask a polite clarifying question.
5. Use organized formatting: headings (##, ###), bullet lists, bold text for key terms, and code blocks for readability.
6. Be encouraging and supportive. Foster critical thinking.
7. Do not invent citations or make claims beyond factual knowledge.
8. Maintain the context of ongoing discussions when answering follow-up queries.`;

/**
 * @route   GET /api/doubt-solver/status
 * @desc    Check whether OpenAI credentials are configured without leaking the secret
 */
router.get('/status', (req, res) => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  const hasKey = apiKey.length > 0 && !apiKey.includes('your_openai_api_key_here');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  res.json({
    ok: true,
    isConfigured: hasKey,
    model: model,
    provider: 'OpenAI Compatible API',
  });
});

/**
 * @route   POST /api/doubt-solver/chat
 * @desc    Send student questions and conversation history to OpenAI and get educational answers
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    // 1. Validate request payload
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid request: "messages" must be a non-empty array of message objects.',
      });
    }

    // 2. Validate message structures and enforce length bounds
    const MAX_MESSAGE_CHARS = 4000;
    const sanitizedMessages = [];

    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') continue;
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      let content = typeof msg.content === 'string' ? msg.content.trim() : '';

      if (content.length > MAX_MESSAGE_CHARS) {
        content = content.substring(0, MAX_MESSAGE_CHARS);
      }

      if (content) {
        sanitizedMessages.push({ role, content });
      }
    }

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Please enter a non-empty question or doubt to continue.',
      });
    }

    // 3. Keep the last 10 messages for conversational context
    const contextualMessages = sanitizedMessages.slice(-10);

    // 4. Verify API Key configuration
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey || apiKey.includes('your_openai_api_key_here')) {
      return res.status(503).json({
        ok: false,
        error: 'OpenAI API key is not configured on the LearnMate server.',
        hint: 'Add your OPENAI_API_KEY to backend/.env and restart the backend server to enable real-time AI responses.',
        code: 'MISSING_API_KEY',
      });
    }

    // 5. Call OpenAI API (supports OpenAI Responses API with Chat Completions fallback)
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    let replyContent = '';
    let usedModel = model;

    // Try OpenAI Responses API (/v1/responses)
    try {
      const responsesPayload = {
        model,
        instructions: SYSTEM_PROMPT,
        input: contextualMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_output_tokens: 2000,
      };

      const respRes = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(responsesPayload),
      });

      if (respRes.ok) {
        const respData = await respRes.json();
        usedModel = respData.model || model;
        if (typeof respData.output_text === 'string' && respData.output_text.trim()) {
          replyContent = respData.output_text.trim();
        } else if (Array.isArray(respData.output)) {
          for (const item of respData.output) {
            if (item.type === 'message' && Array.isArray(item.content)) {
              for (const part of item.content) {
                if (part.type === 'text' && part.text) replyContent += part.text;
              }
            } else if (item.role === 'assistant' && typeof item.content === 'string') {
              replyContent += item.content;
            }
          }
        }
      } else if (respRes.status === 401 || respRes.status === 429) {
        const errJson = await respRes.json().catch(() => null);
        const errorMsg = errJson?.error?.message || respRes.statusText;
        return res.status(respRes.status).json({
          ok: false,
          error: `OpenAI API Error (${respRes.status}): ${errorMsg}`,
          code: respRes.status === 401 ? 'INVALID_API_KEY' : 'RATE_LIMIT_EXCEEDED',
        });
      }
    } catch (respErr) {
      console.warn('[Responses API call notice]:', respErr.message);
    }

    // Fallback: If Responses API did not populate replyContent, use Chat Completions
    if (!replyContent) {
      const apiPayload = {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...contextualMessages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);

      let response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(apiPayload),
          signal: controller.signal,
        });
      } catch (networkError) {
        clearTimeout(timeoutId);
        if (networkError.name === 'AbortError') {
          return res.status(504).json({
            ok: false,
            error: 'The AI service took too long to respond. Please try again.',
          });
        }
        return res.status(502).json({
          ok: false,
          error: `Could not reach AI provider endpoint: ${networkError.message}`,
        });
      }

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.error?.message || response.statusText || 'AI Provider API error';
        console.error('[AI Doubt Solver Error]:', response.status, errorMsg);

        if (response.status === 401) {
          return res.status(401).json({
            ok: false,
            error: 'Authentication failed with OpenAI. Please verify that your OPENAI_API_KEY is valid and has active credits.',
            code: 'INVALID_API_KEY',
          });
        }

        if (response.status === 429) {
          return res.status(429).json({
            ok: false,
            error: 'OpenAI rate limit or quota exceeded. Please check your account quota and billing status.',
            code: 'RATE_LIMIT_EXCEEDED',
          });
        }

        return res.status(response.status).json({
          ok: false,
          error: `AI Error (${response.status}): ${errorMsg}`,
        });
      }

      replyContent = data?.choices?.[0]?.message?.content?.trim();
      usedModel = data?.model || model;
    }
    if (!replyContent) {
      return res.status(502).json({
        ok: false,
        error: 'The AI model returned an empty response. Please try rephrasing your question.',
      });
    }

    return res.json({
      ok: true,
      message: {
        role: 'assistant',
        content: replyContent,
      },
      model: usedModel,
      usage: data?.usage || null,
    });
  } catch (err) {
    console.error('[AI Doubt Solver Server Error]:', err);
    return res.status(500).json({
      ok: false,
      error: 'An unexpected internal error occurred while processing your doubt.',
      details: err.message,
    });
  }
});

export default router;
