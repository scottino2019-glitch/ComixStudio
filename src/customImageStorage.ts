// Storage service for user's personal uploaded images using IndexedDB with localStorage fallback
export interface CustomImageItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

const DB_NAME = 'MangaComicMaker_AssetsDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_images';
const LOCAL_STORAGE_KEY = 'manga_comic_custom_images_v1';

// Open IndexedDB database with safety fallback
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result as IDBDatabase);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

// Fallback to localStorage
function getFromLocalStorage(): CustomImageItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read custom images from localStorage:', err);
    return [];
  }
}

function saveToLocalStorage(items: CustomImageItem[]): void {
  try {
    // Only keep up to the 10 most recent items or under 4MB in localStorage to prevent QuotaExceededError
    const serialized = JSON.stringify(items);
    if (serialized.length < 4 * 1024 * 1024) {
      localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.warn('localStorage quota exceeded for custom images (IndexedDB remains primary):', err);
  }
}

// Retrieve all personal images, newest first
export async function getStoredCustomImages(): Promise<CustomImageItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as CustomImageItem[]) || [];
        // Sort descending by createdAt
        results.sort((a, b) => b.createdAt - a.createdAt);
        // Also sync to localStorage as mirror
        saveToLocalStorage(results);
        resolve(results);
      };

      req.onerror = () => {
        console.warn('IndexedDB getAll failed, falling back to localStorage');
        resolve(getFromLocalStorage());
      };
    });
  } catch (err) {
    console.warn('Falling back to localStorage for custom images:', err);
    return getFromLocalStorage();
  }
}

// Downscale excessively large images (e.g. 4000px phone camera photos) to max 1600px
// preserving aspect ratio and transparency for PNGs
export async function processFileForStorage(file: File): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossibile leggere il file'));
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Impossibile caricare i dati immagine'));
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        const maxDimension = 1600;

        // If within bounds, keep original
        if (naturalWidth <= maxDimension && naturalHeight <= maxDimension && file.size < 2 * 1024 * 1024) {
          resolve({
            dataUrl: originalDataUrl,
            width: naturalWidth,
            height: naturalHeight,
            sizeBytes: file.size,
          });
          return;
        }

        // Downscale gently to optimize memory and canvas speed
        const scale = Math.min(maxDimension / naturalWidth, maxDimension / naturalHeight, 1);
        const targetWidth = Math.round(naturalWidth * scale);
        const targetHeight = Math.round(naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: originalDataUrl,
            width: naturalWidth,
            height: naturalHeight,
            sizeBytes: file.size,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const isPng = file.type === 'image/png';
        const optimizedDataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88);

        resolve({
          dataUrl: optimizedDataUrl,
          width: targetWidth,
          height: targetHeight,
          sizeBytes: Math.round((optimizedDataUrl.length * 3) / 4),
        });
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Save a new personal image to storage
export async function saveCustomImage(item: { name: string; dataUrl: string; sizeBytes?: number; width?: number; height?: number }): Promise<CustomImageItem> {
  const newItem: CustomImageItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: item.name || 'Immagine Personale',
    dataUrl: item.dataUrl,
    createdAt: Date.now(),
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(newItem);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB, fallback to localStorage only:', err);
  }

  // Also update localStorage
  const current = getFromLocalStorage();
  const updated = [newItem, ...current.filter(c => c.id !== newItem.id)];
  saveToLocalStorage(updated);

  return newItem;
}

// Delete an individual personal image by ID
export async function deleteCustomImage(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete from IndexedDB:', err);
  }

  const current = getFromLocalStorage();
  saveToLocalStorage(current.filter(item => item.id !== id));
}

// Clear all stored personal images
export async function clearAllCustomImages(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
