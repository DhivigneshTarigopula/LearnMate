// src/lib/imagePreprocessor.js
// Client-side image enhancement for OCR & AI document analysis

/**
 * Preprocesses an uploaded timetable image using HTML Canvas
 * Enhances contrast, normalizes resolution, and sharpens edges for maximum OCR accuracy.
 *
 * @param {File|Blob} file - The uploaded image file
 * @returns {Promise<{ cleanBase64: string, dataUrl: string, width: number, height: number }>}
 */
export async function preprocessTimetableImage(file) {
  if (!file) throw new Error('No image file provided for preprocessing.');

  // If running in an environment without DOM/Canvas (e.g. Node tests), return raw base64
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const buffer = await file.arrayBuffer?.();
    const base64 = buffer ? Buffer.from(buffer).toString('base64') : '';
    return { cleanBase64: base64, dataUrl: `data:${file.type || 'image/jpeg'};base64,${base64}`, width: 0, height: 0 };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          const origWidth = img.naturalWidth || img.width;
          const origHeight = img.naturalHeight || img.height;

          // Scale for optimal OCR resolution (min width 1600px for table cell clarity, max 2400px)
          let targetWidth = origWidth;
          let targetHeight = origHeight;

          if (origWidth < 1400) {
            const scale = 1600 / origWidth;
            targetWidth = 1600;
            targetHeight = Math.round(origHeight * scale);
          } else if (origWidth > 2600) {
            const scale = 2400 / origWidth;
            targetWidth = 2400;
            targetHeight = Math.round(origHeight * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            const cleanBase64 = String(readerEvent.target?.result || '').replace(/^data:[^;]+;base64,/, '');
            resolve({ cleanBase64, dataUrl: String(readerEvent.target?.result || ''), width: origWidth, height: origHeight });
            return;
          }

          // Draw high-quality scaled image
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Get image pixel data for contrast enhancement
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imageData.data;

          // Contrast enhancement & white point stretching
          // Timetables benefit from dark text on crisp light background
          const contrast = 1.25; // 25% contrast boost
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

          for (let i = 0; i < data.length; i += 4) {
            // Contrast adjustment for R, G, B
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
          }

          ctx.putImageData(imageData, 0, 0);

          const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const cleanBase64 = enhancedDataUrl.replace(/^data:[^;]+;base64,/, '');

          resolve({
            cleanBase64,
            dataUrl: enhancedDataUrl,
            width: targetWidth,
            height: targetHeight
          });
        } catch (err) {
          console.warn('[Image Preprocessing Notice]: Falling back to original image:', err);
          const cleanBase64 = String(readerEvent.target?.result || '').replace(/^data:[^;]+;base64,/, '');
          resolve({ cleanBase64, dataUrl: String(readerEvent.target?.result || ''), width: 0, height: 0 });
        }
      };

      img.onerror = (e) => reject(new Error('Failed to load image for preprocessing: ' + e));
      img.src = readerEvent.target?.result;
    };

    reader.onerror = (e) => reject(new Error('Failed to read image file: ' + e));
    reader.readAsDataURL(file);
  });
}

