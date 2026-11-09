// Image processing utilities for Comic Studio
// Automatically cuts out solid/near-white backgrounds from characters and stickers

export async function removeWhiteBackground(imageUrl: string, threshold = 238): Promise<string> {
  const normalizedUrl = imageUrl.replace(/^\/src\/assets\/images\//, '/assets/images/');
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // BFS Flood fill strictly from outer perimeter edges so inner white clothing/eyes remain solid!
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const isBgPixel = (idx: number) => {
          const p = idx * 4;
          return data[p] >= threshold && data[p + 1] >= threshold && data[p + 2] >= threshold;
        };

        // Seed top and bottom borders
        for (let x = 0; x < width; x++) {
          const topIdx = x;
          const botIdx = (height - 1) * width + x;
          if (isBgPixel(topIdx) && !visited[topIdx]) {
            visited[topIdx] = 1;
            queue.push(topIdx);
          }
          if (isBgPixel(botIdx) && !visited[botIdx]) {
            visited[botIdx] = 1;
            queue.push(botIdx);
          }
        }

        // Seed left and right borders
        for (let y = 0; y < height; y++) {
          const leftIdx = y * width;
          const rightIdx = y * width + (width - 1);
          if (isBgPixel(leftIdx) && !visited[leftIdx]) {
            visited[leftIdx] = 1;
            queue.push(leftIdx);
          }
          if (isBgPixel(rightIdx) && !visited[rightIdx]) {
            visited[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // BFS flood fill
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          // Left
          if (cx > 0) {
            const n = curr - 1;
            if (!visited[n] && isBgPixel(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
          // Right
          if (cx < width - 1) {
            const n = curr + 1;
            if (!visited[n] && isBgPixel(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
          // Top
          if (cy > 0) {
            const n = curr - width;
            if (!visited[n] && isBgPixel(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
          // Bottom
          if (cy < height - 1) {
            const n = curr + width;
            if (!visited[n] && isBgPixel(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        // Only make pixels visited by outer flood fill transparent
        for (let i = 0; i < visited.length; i++) {
          if (visited[i] === 1) {
            data[i * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Could not remove background:', e);
        resolve(normalizedUrl);
      }
    };
    img.onerror = () => resolve(normalizedUrl);
    img.src = normalizedUrl;
  });
}
