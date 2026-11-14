// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// Supabase Edge Function: generate-quiz
// Generates study quizzes strictly from user-provided PDFs using Google Gemini API.

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
    // 2. Validate Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Authentication required. Missing Authorization header.',
          code: 'UNAUTHORIZED',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify token with Supabase Auth if credentials exist
    if (supabaseUrl && supabaseAnonKey && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      // If token is not the anon key, verify against auth.getUser()
      if (token && token !== supabaseAnonKey) {
        try {
          const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
          if (userError || !user) {
            console.warn('[Auth Notice]: User token validation failed:', userError?.message);
          }
        } catch (authErr) {
          console.warn('[Auth Exception]:', authErr.message);
        }
      }
    }

    // 3. Retrieve Google Gemini API Key
    const geminiApiKey = (
      Deno.env.get('GEMINI_API_KEY') ||
      Deno.env.get('GOOGLE_API_KEY') ||
      Deno.env.get('GEMINI_KEY')
    )?.trim();

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets. Please add GEMINI_API_KEY via Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets.',
          code: 'MISSING_API_KEY',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse & Validate Payload
    const body = await req.json().catch(() => ({}));
    const {
      pdfBase64,
      pdfText,
      fileName = 'Study Document.pdf',
      numQuestions = 5,
      difficulty = 'Medium', // 'Easy' | 'Medium' | 'Hard'
      questionType = 'MCQ', // 'MCQ' | 'True/False' | 'Mixed'
      subject = '',
    } = body;

    const targetCount = Math.min(Math.max(Number(numQuestions) || 5, 3), 25);

    // Ensure we have some document input
    if (!pdfBase64 && (!pdfText || !pdfText.trim())) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'No document content provided. Please upload a PDF file or provide extracted document text.',
          code: 'EMPTY_DOCUMENT',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean base64 string if data URL prefix exists
    let cleanBase64 = '';
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    // 5. Build Gemini Prompt
    const promptInstructions = `You are LearnMate's Academic Quiz Generator.
Your task is to generate a comprehensive, high-quality revision quiz strictly and exclusively from the provided study material document ("${fileName}").

CRITICAL RULES:
1. STRICTLY GROUNDED: Every single question, correct answer, and explanation MUST be directly derived from and supported by the content in this document. DO NOT make up questions or extrapolate outside concepts that are not mentioned in the source material.
2. If the document is too short, empty, or unreadable, do not hallucinate; indicate the topic accurately.
3. DIFFICULTY LEVEL: ${difficulty}. Adjust the cognitive depth (Easy = recall/definitions; Medium = conceptual understanding & application; Hard = multi-step reasoning, edge cases, synthesis).
4. QUESTION TYPE: ${questionType}.
   - If MCQ: provide exactly 4 clear options. Only ONE option must be correct. The 3 distractors must be plausible concepts related to the document.
   - If True/False: provide exactly 2 options: ["True", "False"].
   - If Mixed: provide an appropriate combination of 4-option MCQs and 2-option True/False questions.
5. REQUIRED QUESTION COUNT: Exactly ${targetCount} questions.
6. EXPLANATION: For every question, write a concise explanation (1-3 sentences) clearly stating why the correct answer is correct based on the document.

You MUST respond ONLY with a valid, raw JSON object (no markdown backticks, no preamble, no trailing text) adhering to this schema:
{
  "title": "Clear, informative quiz title reflecting the topic of the document",
  "subject": "${subject || 'Academic Studies'}",
  "difficulty": "${difficulty}",
  "questionType": "${questionType}",
  "summary": "1-2 sentence overview of the study document topic",
  "questions": [
    {
      "id": "q_1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Explanation citing facts from the document."
    }
  ]
}
Note: "answer" is the 0-based integer index of the correct string in the "options" array.`;

    // 6. Build Multimodal or Text Parts for Gemini
    const parts = [];

    // If PDF base64 is provided, attach as native application/pdf inlineData
    // Gemini 1.5/2.0 natively reads PDFs and performs OCR on scanned pages!
    if (cleanBase64) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanBase64,
        },
      });
    }

    // If extracted text is provided as supplementary or primary input
    if (pdfText && pdfText.trim()) {
      parts.push({
        text: `EXTRACTED DOCUMENT TEXT CONTENT:\n\n${pdfText.slice(0, 100000)}`,
      });
    }

    parts.push({
      text: promptInstructions,
    });

    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    };

    // 7. Invoke Gemini with Model Fallback
    let generatedRawText = '';
    let usedModel = GEMINI_MODELS[0];
    let lastApiError = '';

    for (const model of GEMINI_MODELS) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

        const geminiRes = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidate = geminiData?.candidates?.[0];
          const textPart = candidate?.content?.parts?.[0]?.text;

          if (textPart && textPart.trim()) {
            generatedRawText = textPart.trim();
            usedModel = model;
            break; // Success!
          }
        } else {
          const errData = await geminiRes.json().catch(() => null);
          const errMsg = errData?.error?.message || geminiRes.statusText;
          console.warn(`[Gemini ${model} warning]: Status ${geminiRes.status}: ${errMsg}`);
          lastApiError = errMsg;

          // If rate limit or quota exceeded, try next model
          if (geminiRes.status === 429 || geminiRes.status === 503 || geminiRes.status === 404) {
            continue;
          }
        }
      } catch (callErr) {
        console.warn(`[Gemini call error on ${model}]:`, callErr.message);
        lastApiError = callErr.message;
      }
    }

    if (!generatedRawText) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Gemini API could not generate a quiz from this document: ${lastApiError || 'Empty response from model'}. Please verify your document is not empty or corrupted.`,
          code: 'MODEL_GENERATION_FAILED',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Clean & Parse JSON
    let parsedQuiz = null;
    try {
      // Remove any markdown code fences if present
      let cleanJson = generatedRawText;
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      parsedQuiz = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[JSON parse error]:', parseErr.message, 'Raw text was:', generatedRawText.slice(0, 300));
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Failed to parse Gemini generated quiz JSON. The output did not match expected JSON format.',
          code: 'INVALID_JSON_OUTPUT',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Validate Quiz Structure
    if (!parsedQuiz || !Array.isArray(parsedQuiz.questions) || parsedQuiz.questions.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Generated quiz did not contain any valid questions.',
          code: 'NO_QUESTIONS_GENERATED',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize question entries
    const sanitizedQuestions = parsedQuiz.questions.map((q, idx) => {
      const options = Array.isArray(q.options) && q.options.length >= 2
        ? q.options.map((opt) => String(opt || '').trim())
        : ['Option A', 'Option B', 'Option C', 'Option D'];

      let answerIdx = Number(q.answer);
      if (isNaN(answerIdx) || answerIdx < 0 || answerIdx >= options.length) {
        // If answer was returned as letter string e.g. "A", "B"
        if (typeof q.answer === 'string') {
          const letterMap = { A: 0, B: 1, C: 2, D: 3 };
          const normalized = q.answer.trim().toUpperCase();
          if (letterMap[normalized] !== undefined && letterMap[normalized] < options.length) {
            answerIdx = letterMap[normalized];
          } else {
            answerIdx = 0;
          }
        } else {
          answerIdx = 0;
        }
      }

      return {
        id: q.id || `q_${Date.now()}_${idx + 1}`,
        question: String(q.question || `Question ${idx + 1}`).trim(),
        options: options,
        answer: answerIdx,
        explanation: String(q.explanation || 'Refer to the source document material for the correct derivation.').trim(),
      };
    });

    const finalQuiz = {
      title: parsedQuiz.title || fileName.replace(/\.pdf$/i, '') + ' Quiz',
      subject: parsedQuiz.subject || subject || 'General Study',
      difficulty: parsedQuiz.difficulty || difficulty,
      questionType: parsedQuiz.questionType || questionType,
      summary: parsedQuiz.summary || `Practice quiz generated strictly from ${fileName}`,
      sourcePdfName: fileName,
      questions: sanitizedQuestions,
      generatedAt: new Date().toISOString(),
      model: usedModel,
    };

    // 10. Return Structured Quiz
    return new Response(
      JSON.stringify({
        ok: true,
        quiz: finalQuiz,
        meta: {
          questionsCount: sanitizedQuestions.length,
          model: usedModel,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Generate-Quiz Function Exception]:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Edge Function internal error: ${err.message}`,
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
