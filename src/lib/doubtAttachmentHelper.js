// src/lib/doubtAttachmentHelper.js
// Multimodal attachment processing for AI Doubt Solver 2.0 (PDFs, Images, Camera Captures)

import { extractTextFromPdf } from './pdfTextExtractor';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Convert a File or Blob into a base64 string
 * Returns { dataUrl, base64 }
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = typeof dataUrl === 'string' && dataUrl.includes(',')
        ? dataUrl.split(',')[1]
        : dataUrl;
      resolve({ dataUrl, base64 });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Process an uploaded Image file
 */
export async function processImageFile(file) {
  if (!file) {
    throw new Error('No image file provided.');
  }

  // Type check
  const fileType = file.type?.toLowerCase() || '';
  const isImage = ALLOWED_IMAGE_TYPES.includes(fileType) || file.name.match(/\.(jpe?g|png|webp|gif)$/i);
  if (!isImage) {
    throw new Error('Unsupported image format. Please upload JPG, PNG, or WEBP.');
  }

  // Size check
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image is too large (${formatFileSize(file.size)}). Maximum allowed size is 10 MB.`);
  }

  const { dataUrl, base64 } = await fileToBase64(file);

  return {
    type: 'image',
    fileName: file.name,
    fileSize: file.size,
    formattedSize: formatFileSize(file.size),
    mimeType: file.type || 'image/jpeg',
    previewUrl: dataUrl,
    base64,
    file
  };
}

/**
 * Process an uploaded PDF document
 */
export async function processPdfFile(file) {
  if (!file) {
    throw new Error('No PDF file provided.');
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('Unsupported file type. Please upload a valid PDF document.');
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error(`PDF is too large (${formatFileSize(file.size)}). Maximum allowed size is 20 MB.`);
  }

  // Extract base64 and extract text in parallel
  const [base64Res, extractionRes] = await Promise.all([
    fileToBase64(file),
    extractTextFromPdf(file).catch((err) => {
      console.warn('[Doubt Solver] PDF text extraction warning:', err);
      return { text: '', pageCount: 1, isScanned: true };
    })
  ]);

  return {
    type: 'pdf',
    fileName: file.name,
    fileSize: file.size,
    formattedSize: formatFileSize(file.size),
    mimeType: 'application/pdf',
    pageCount: extractionRes.pageCount || 1,
    extractedText: extractionRes.text || '',
    isScanned: extractionRes.isScanned || false,
    base64: base64Res.base64,
    previewUrl: null, // PDFs use icon preview
    file
  };
}

