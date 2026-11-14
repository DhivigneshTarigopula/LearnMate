// src/lib/pdfTextExtractor.js
// Client-side text extraction engine for PDFs with support for text-based & scanned documents
// Includes multi-CDN loader, PDF.js extraction, and native stream decompression fallback

const PDFJS_CDNS = [
  {
    script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  },
  {
    script: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
    worker: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  },
  {
    script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  }
];

/**
 * Dynamically loads PDF.js from reliable CDNs if not already loaded on window.
 */
export async function loadPdfJsScript() {
  if (typeof window === 'undefined') return null;
  if (window.pdfjsLib && window.pdfjsLib.getDocument) {
    return window.pdfjsLib;
  }

  // Check if script is currently loading
  const existing = document.getElementById('learnmate-pdfjs-script');
  if (existing) {
    if (window.pdfjsLib) return window.pdfjsLib;
    await new Promise((resolve) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', resolve, { once: true });
    });
    if (window.pdfjsLib) return window.pdfjsLib;
  }

  // Try each CDN sequentially
  for (let i = 0; i < PDFJS_CDNS.length; i++) {
    const cdn = PDFJS_CDNS[i];
    try {
      const loaded = await new Promise((resolve) => {
        const script = document.createElement('script');
        script.id = 'learnmate-pdfjs-script';
        script.src = cdn.script;
        script.async = true;

        script.onload = () => {
          if (window.pdfjsLib) {
            try {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = cdn.worker;
            } catch {}
            resolve(window.pdfjsLib);
          } else {
            resolve(null);
          }
        };

        script.onerror = () => {
          script.remove();
          resolve(null);
        };

        document.head.appendChild(script);
      });

      if (loaded) return loaded;
    } catch {
      // Continue to next CDN
    }
  }

  return window.pdfjsLib || null;
}

/**
 * Determine if text segment has genuine readable characters (avoids binary glyph mappings)
 */
function isReadableText(str) {
  if (!str || str.length < 2) return false;
  let printableCount = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      printableCount++;
    }
  }
  return (printableCount / str.length) >= 0.70;
}

/**
 * Extract clean string from a decoded PDF content stream
 */
function parseStreamText(streamStr) {
  let result = '';
  // Match both Array TJ `[(Text) 12 (More)] TJ` and single `(Text) Tj`
  const tokenRegex = /(?:\[([\s\S]*?)\]\s*TJ|\(([\s\S]*?)\)\s*(?:Tj|'|"))/g;
  let match;

  while ((match = tokenRegex.exec(streamStr)) !== null) {
    if (match[1]) {
      // Array TJ
      const segMatches = match[1].match(/\((?:[^\\()]|\\.)*\)/g);
      if (segMatches) {
        const joined = segMatches
          .map((s) => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
          .join('');
        if (isReadableText(joined)) {
          result += joined + ' ';
        }
      }
    } else if (match[2]) {
      // Single Tj
      const clean = match[2].replace(/\\([()\\])/g, '$1');
      if (isReadableText(clean)) {
        result += clean + ' ';
      }
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Offline native fallback text extractor for PDF content streams
 * Parses /Contents streams, handles uncompressed and zlib compressed streams
 */
export async function fallbackExtractText(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const latinDecoder = new TextDecoder('latin1');
    const binaryStr = latinDecoder.decode(bytes);

    let extractedText = '';
    let pageCount = 0;

    // Count pages by counting /Type\s*\/Page\b
    const pageMatches = binaryStr.match(/\/Type\s*\/Page\b/g);
    pageCount = pageMatches ? pageMatches.length : 1;

    // Attempt native stream parsing across stream ... endstream blocks
    let pos = 0;
    let streamIdx = 0;
    let pageNum = 1;

    while ((streamIdx = binaryStr.indexOf('stream', pos)) !== -1) {
      let endIdx = binaryStr.indexOf('endstream', streamIdx);
      if (endIdx === -1) break;

      const dict = binaryStr.slice(Math.max(0, streamIdx - 350), streamIdx);

      let start = streamIdx + 6;
      if (binaryStr[start] === '\r') start++;
      if (binaryStr[start] === '\n') start++;

      let end = endIdx;
      while (binaryStr[end - 1] === '\r' || binaryStr[end - 1] === '\n') end--;

      let streamStr = '';

      // Decompress FlateDecode streams using native browser DecompressionStream
      if (dict.includes('/FlateDecode') && typeof DecompressionStream !== 'undefined') {
        const streamBytes = bytes.subarray(start, end);
        try {
          const ds = new DecompressionStream('deflate');
          const resp = new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(streamBytes);
                controller.close();
              }
            }).pipeThrough(ds)
          );
          const decompressedBuf = await resp.arrayBuffer();
          streamStr = latinDecoder.decode(decompressedBuf);
        } catch {
          // If standard zlib header fails, try raw deflate
          try {
            const dsRaw = new DecompressionStream('deflate-raw');
            const respRaw = new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(streamBytes);
                  controller.close();
                }
              }).pipeThrough(dsRaw)
            );
            const decompressedBuf = await respRaw.arrayBuffer();
            streamStr = latinDecoder.decode(decompressedBuf);
          } catch {}
        }
      } else if (!dict.includes('/DCTDecode') && !dict.includes('/JPXDecode')) {
        // Plain uncompressed stream
        streamStr = binaryStr.substring(start, endIdx);
      }

      if (streamStr.includes('ET') && streamStr.includes('BT')) {
        const textFromStream = parseStreamText(streamStr);
        if (textFromStream && textFromStream.length > 5 && isReadableText(textFromStream)) {
          extractedText += `[Page ${pageNum}]\n${textFromStream}\n\n`;
          pageNum++;
        }
      }

      pos = endIdx + 9;
    }

    return {
      text: extractedText.trim(),
      pageCount: Math.max(pageCount, pageNum - 1, 1),
      method: 'native-stream'
    };
  } catch (err) {
    console.warn('[LearnMate PDF Extractor] Native stream fallback notice:', err);
    return { text: '', pageCount: 1, method: 'failed' };
  }
}

/**
 * Main PDF text extractor
 * Accepts File, Blob, or ArrayBuffer
 * Returns: { text, pageCount, isScanned, method, charCount }
 */
export async function extractTextFromPdf(fileOrBuffer) {
  let arrayBuffer;

  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error('Invalid input: Expected File, Blob, or ArrayBuffer');
  }

  let fullText = '';
  let pageCount = 0;
  let methodUsed = 'pdfjs';

  // Strategy 1: Attempt extraction using PDF.js
  try {
    const pdfjs = await loadPdfJsScript();
    if (pdfjs && pdfjs.getDocument) {
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
        disableFontFace: true,
      });

      const pdfDoc = await loadingTask.promise;
      pageCount = pdfDoc.numPages;

      const pageTextPromises = [];
      const maxPagesToProcess = Math.min(pageCount, 120); // Process up to 120 pages

      for (let i = 1; i <= maxPagesToProcess; i++) {
        pageTextPromises.push(
          (async (pageNum) => {
            try {
              const page = await pdfDoc.getPage(pageNum);
              const content = await page.getTextContent();
              const pageStrings = content.items
                .map((item) => (item && typeof item.str === 'string' ? item.str : ''))
                .filter((str) => str.trim().length > 0);

              const pageBody = pageStrings.join(' ').replace(/\s+/g, ' ').trim();
              return pageBody ? `[Page ${pageNum}]\n${pageBody}` : '';
            } catch (pErr) {
              console.warn(`[LearnMate PDF Extractor] Page ${pageNum} notice:`, pErr.message);
              return '';
            }
          })(i)
        );
      }

      const pagesResults = await Promise.all(pageTextPromises);
      fullText = pagesResults.filter(Boolean).join('\n\n').trim();
    }
  } catch (pdfJsErr) {
    console.warn('[LearnMate PDF Extractor] PDF.js extraction notice:', pdfJsErr.message);
  }

  // Strategy 2: If PDF.js produced empty text, try native stream fallback
  if (!fullText || fullText.trim().length < 50) {
    const fallback = await fallbackExtractText(arrayBuffer);
    if (fallback.text && fallback.text.length > fullText.length) {
      fullText = fallback.text;
      if (!pageCount) pageCount = fallback.pageCount;
      methodUsed = 'native-fallback';
    }
  }

  // Strategy 3: Check if document is scanned or image-based
  const cleanedText = fullText.replace(/\s+/g, ' ').trim();
  const isScanned = cleanedText.length < 60; // Less than 60 characters indicates image/scanned PDF

  // Limit maximum size to ~100,000 characters for token safety
  const MAX_TEXT_LENGTH = 100000;
  let finalFormattedText = fullText;
  if (finalFormattedText.length > MAX_TEXT_LENGTH) {
    finalFormattedText =
      finalFormattedText.substring(0, MAX_TEXT_LENGTH) +
      `\n\n[Document excerpt: First 100,000 characters from ${pageCount} pages included for study assistance]`;
  }

  return {
    text: finalFormattedText,
    pageCount: Math.max(pageCount, 1),
    charCount: finalFormattedText.length,
    isScanned,
    method: methodUsed,
  };
}
