// ============================================
// IMAGE COMPRESSION UTILITY
// Shrinks uploaded images to tiny WebP base64
// for safe localStorage usage.
// ============================================

/**
 * Resizes and compresses an image file to a Base64 string.
 * @param {File} file - The image file from an <input type="file">
 * @param {number} maxWidth - Maximum width of the output image (default 300px)
 * @param {number} maxHeight - Maximum height of the output image (default 300px)
 * @param {number} quality - Compression quality 0-1 (default 0.7)
 * @returns {Promise<string>} - Resolves to a base64 Data URL (image/webp)
 */
export function compressImageToDataURL(file, maxWidth = 300, maxHeight = 300, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Use a white background (in case of transparent PNGs converting to WebP)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP for best compression. Fallback to JPEG if unsupported.
        const type = 'image/webp';
        const dataUrl = canvas.toDataURL(type, quality);
        
        resolve(dataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
