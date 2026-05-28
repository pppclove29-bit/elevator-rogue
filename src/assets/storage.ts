/**
 * 사용자 업로드 에셋 저장소 (IndexedDB Blob).
 *
 * 키 컨벤션:
 *   sounds/<key>      — 사운드 (예: sounds/ding)
 *   sprites/<key>     — 스프라이트 (예: sprites/elevator-cab)
 *
 * 사용자가 sounds.html / sprites.html 에서 파일 드래그앤드롭 하면 저장.
 * 게임 부팅 시 (main.ts top-level await) 모두 로드 → BootScene 이 public/ 보다 우선 사용.
 *
 * 저장은 브라우저 단위 (origin 별). Electron 도 same-origin 이라 작동.
 * 용량 한계는 브라우저별 다름 (일반적으로 50MB~기가 단위).
 */

const DB_NAME = 'elevator-rogue-assets';
const DB_VERSION = 1;
const STORE = 'assets';

export interface StoredAsset {
  key: string;
  blob: Blob;
  mime: string;
  filename: string;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAsset(key: string, file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const record: StoredAsset = {
      key, blob: file, mime: file.type, filename: file.name, savedAt: Date.now(),
    };
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAsset(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllStoredAssets(): Promise<Map<string, StoredAsset>> {
  try {
    const db = await openDB();
    return await new Promise<Map<string, StoredAsset>>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const out = new Map<string, StoredAsset>();
        for (const item of req.result as StoredAsset[]) out.set(item.key, item);
        resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB 미지원 환경 등 — silent fallback
    return new Map();
  }
}

export async function listStoredKeys(): Promise<string[]> {
  try {
    const all = await loadAllStoredAssets();
    return Array.from(all.keys());
  } catch {
    return [];
  }
}

export async function clearAllStoredAssets(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** main.ts 부팅 시 결과를 window 에 stash. BootScene 이 동기적으로 사용. */
export interface BootedAssets {
  sounds: Map<string, StoredAsset>;
  sprites: Map<string, StoredAsset>;
}

declare global {
  // eslint-disable-next-line no-var
  var __bootedAssets: BootedAssets | undefined;
}

export async function loadBootedAssets(): Promise<BootedAssets> {
  const all = await loadAllStoredAssets();
  const sounds = new Map<string, StoredAsset>();
  const sprites = new Map<string, StoredAsset>();
  for (const [storageKey, asset] of all) {
    if (storageKey.startsWith('sounds/')) {
      sounds.set(storageKey.slice('sounds/'.length), asset);
    } else if (storageKey.startsWith('sprites/')) {
      sprites.set(storageKey.slice('sprites/'.length), asset);
    }
  }
  return { sounds, sprites };
}
