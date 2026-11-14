// Supabase Edge Function: ai-doubt-solver
// Multimodal Academic Tutor & Doubt Solver powered by Google Gemini API
// Supports Text Questions, PDFs, Images, and Camera Captures with Conversational Memory

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

const SYSTEM_INSTRUCTIONS = `You are LearnMate AI, a patient, brilliant, and engaging academic tutor and multimodal doubt solver.
Your mission is to help students learn, understand, and master academic subjects including:
- Mathematics (Calculus, Linear Algebra, Probability, Statistics, Algebra, Trigonometry)
- Computer Science & Programming (Python, JavaScript/TypeScript, Java, C/C++, Web Dev, Data Structures, Algorithms)
- Engineering (Electrical, Mechanical, Electronics, Civil, Systems)
- Natural Sciences (Physics, Chemistry, Biology)
- General Academics, Assignments, and Exam Preparation

MULTIMODAL INSTRUCTION:
- The student may provide questions via text, uploaded documents (PDF), photos/diagrams, or live camera captures of textbook problems, handwritten equations, or code.
- Carefully examine any attached image or document. Read text, numbers, diagrams, equations, tables, and handwritten notes accurately.
- If the image contains multiple questions or problems, identify and address the one the user specifies (or solve the first one and ask if they'd like help with the rest).
- Always ground your answers in the provided material.

PEDAGOGICAL TEACHING STYLE:
1. Step-by-Step Breakdown: Do not just give the final answer. Walk through the reasoning step-by-step with clear logic.
2. Math & Formulas: Use standard LaTeX formatting: inline math with $...$ and block display equations with $$...$$. Always define variables and state relevant theorems/formulas first.
3. Code & Programs: Provide clean, bug-free, fully commented code inside markdown code blocks with correct language identifiers. Explain the time/space complexity where helpful.
4. Concept Clarification: If the user's premise contains a misconception or the question is ambiguous, gently point it out, explain the standard convention, and solve under the most likely interpretation.
5. Follow-Up Engagement: Conclude with a helpful one-sentence tip or suggestive follow-up question to encourage deeper student mastery.`;

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 2. Verify Supabase Auth Header (soft check or token verification)
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (supabaseUrl && supabaseAnonKey && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token && token !== supabaseAnonKey) {
        try {
          const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          await supabaseClient.auth.getUser();
        } catch (authErr) {
          console.warn('[Doubt Solver Auth Notice]:', authErr.message);
        }
      }
    }

    // 3. Retrieve Google Gemini API Key
    const geminiApiKey = (
      Deno.env.get('GEMINI_API_KEY') ||
      Deno.env.get('GOOGLE_API_KEY') ||
      Deno.env.get('GEMINI_KEY')
    )?.trim();

    // Secondary fallback: OpenAI API Key if Gemini is not present
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')?.trim();

    if (!geminiApiKey && !openAiApiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets. Please configure GEMINI_API_KEY in your Supabase dashboard.',
          code: 'MISSING_API_KEY',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse Request Body
    const body = await req.json().catch(() => ({}));
    const {
      question,
      messages,
      attachment,
      fileBase64,
      mimeType,
      fileText,
      fileName
    } = body;

    // Resolve prompt text
    let userPrompt = (question || '').trim();

    // Resolve attachment details
    const attObj = attachment || {};
    let rawBase64 = attObj.base64 || fileBase64 || '';
    let attMimeType = attObj.mimeType || mimeType || '';
    const attFileName = attObj.fileName || fileName || 'Attached Document';
    const attExtractedText = attObj.extractedText || fileText || '';

    // Clean base64 prefix if exists
    if (rawBase64 && typeof rawBase64 === 'string') {
      if (rawBase64.includes(',')) {
        rawBase64 = rawBase64.split(',')[1];
      }
      rawBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    // Default prompt if user submitted image/PDF without typing text
    if (!userPrompt && rawBase64) {
      if (attMimeType.includes('pdf')) {
        userPrompt = `Please analyze this study document ("${attFileName}"), explain its core concepts, and solve any problems or doubts within it.`;
      } else {
        userPrompt = 'Please solve and explain the question, equation, or diagram shown in this image step-by-step.';
      }
    }

    if (!userPrompt && !rawBase64 && (!messages || messages.length === 0)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Please enter a question or attach a document/image to ask.',
          code: 'EMPTY_INPUT',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // Primary Provider: Google Gemini Multimodal API
    // =========================================================================
    if (geminiApiKey) {
      // Build conversation history contents for Gemini
      const contents = [];

      // Add prior conversation turns if provided
      if (Array.isArray(messages) && messages.length > 0) {
        // Take up to last 8 turns for context
        const historySlice = messages.slice(-8);
        for (const msg of historySlice) {
          if (!msg || typeof msg !== 'object') continue;
          const role = msg.role === 'assistant' ? 'model' : 'user';
          const text = (msg.content || '').trim();
          if (text) {
            contents.push({
              role,
              parts: [{ text }]
            });
          }
        }
      }

      // Build the current turn parts
      const currentParts = [];

      // Add inline image or PDF if present
      if (rawBase64) {
        let validMime = attMimeType || 'image/jpeg';
        if (validMime.includes('pdf')) validMime = 'application/pdf';
        else if (validMime.includes('png')) validMime = 'image/png';
        else if (validMime.includes('webp')) validMime = 'image/webp';
        else validMime = 'image/jpeg';

        currentParts.push({
          inlineData: {
            mimeType: validMime,
            data: rawBase64
          }
        });
      }

      // Add extracted text if document has text
      if (attExtractedText && attExtractedText.trim()) {
        currentParts.push({
          text: `[DOCUMENT TEXT FROM "${attFileName}"]:\n${attExtractedText.slice(0, 40000)}`
        });
      }

      // Add current question
      currentParts.push({
        text: userPrompt || 'Please explain this concept and answer any doubts.'
      });

      // Append current turn to contents
      contents.push({
        role: 'user',
        parts: currentParts
      });

      const geminiPayload = {
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTIONS }]
        },
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };

      let answerText = '';
      let usedModel = GEMINI_MODELS[0];
      let lastGeminiError = '';

      // Model fallback iteration
      for (const model of GEMINI_MODELS) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const geminiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResult && textResult.trim()) {
              answerText = textResult.trim();
              usedModel = model;
              break;
            }
          } else {
            const errData = await geminiRes.json().catch(() => null);
            lastGeminiError = errData?.error?.message || `HTTP ${geminiRes.status}`;
            console.warn(`[Gemini ${model} warning]:`, lastGeminiError);
          }
        } catch (fetchErr) {
          lastGeminiError = fetchErr.message;
          console.warn(`[Gemini ${model} fetch exception]:`, fetchErr);
        }
      }

      if (answerText) {
        return new Response(
          JSON.stringify({
            ok: true,
            message: {
              role: 'assistant',
              content: answerText,
            },
            model: usedModel,
            provider: 'Google Gemini'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If Gemini failed with specific error and no OpenAI fallback
      if (!openAiApiKey) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Gemini API service notice: ${lastGeminiError || 'No response returned from model.'}`,
            code: 'GEMINI_ERROR'
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // =========================================================================
    // Secondary Fallback: OpenAI API
    // =========================================================================
    if (openAiApiKey) {
      const openAiMessages = [
        { role: 'system', content: SYSTEM_INSTRUCTIONS }
      ];

      if (Array.isArray(messages)) {
        for (const m of messages.slice(-6)) {
          if (m?.content) {
            openAiMessages.push({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            });
          }
        }
      }

      let openAiUserContent = userPrompt;
      if (attExtractedText) {
        openAiUserContent += `\n\n[Attached Document Text]:\n${attExtractedText.slice(0, 10000)}`;
      }

      openAiMessages.push({
        role: 'user',
        content: openAiUserContent
      });

      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.5,
          max_tokens: 1800
        })
      });

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          return new Response(
            JSON.stringify({
              ok: true,
              message: { role: 'assistant', content },
              model: 'gpt-4o-mini',
              provider: 'OpenAI'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Unable to process your doubt at this time. Please try again.',
        code: 'GENERATION_FAILED'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[Supabase Edge Function Internal Exception]:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Edge Function internal error: ${err.message}`,
        code: 'INTERNAL_EXCEPTION'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
