/**
 * Image compression utility for el Ciruelo (Checklist & OS).
 * Shrinks multi-megabyte smartphone camera photos into lightweight (~80-120KB) high-quality JPEGs
 * before saving to localStorage or uploading to the central server.
 * Prevents mobile memory spikes and localStorage QuotaExceededError crashes.
 */

export async function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 960,
  maxHeight = 960,
  quality = 0.68
): Promise<string> {
  return new Promise((resolve) => {
    // If it's an SVG data URL (sample icons), return as-is
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/svg')) {
      resolve(fileOrDataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;

    const cleanup = () => {
      if (objectUrlToRevoke) {
        try {
          URL.revokeObjectURL(objectUrlToRevoke);
        } catch {}
        objectUrlToRevoke = null;
      }
    };

    img.onload = () => {
      cleanup();
      let { width, height } = img;

      // Calculate scaled dimensions keeping aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (e) {
        console.warn('Canvas export error, falling back:', e);
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      }
    };

    img.onerror = () => {
      cleanup();
      console.warn('Failed to load image for compression');
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else if (fileOrDataUrl && typeof fileOrDataUrl === 'object' && fileOrDataUrl instanceof Blob) {
      objectUrlToRevoke = URL.createObjectURL(fileOrDataUrl);
      img.src = objectUrlToRevoke;
    } else {
      resolve('');
    }
  });
}

/**
 * Safe localStorage setter that swallows QuotaExceededError and prunes if necessary,
 * preventing white screen crashes.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`SafeLocalStorage: Quota exceeded or error writing key "${key}".`, error);
    try {
      // Clear old large items if quota is exceeded
      const current = localStorage.getItem(key);
      if (current) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    return false;
  }
}
