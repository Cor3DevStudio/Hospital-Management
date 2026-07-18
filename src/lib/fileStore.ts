// Simple IndexedDB helper for storing binary files (PDFs)
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_LABEL,
  getFileSizeLabel,
} from "./attachmentValidation";

const DB_NAME = "cms_files_db";
const STORE_NAME = "files";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

export async function saveFile(
  key: string,
  file: Blob,
  meta: { filename?: string; mime?: string; size?: number } = {},
) {
  const fileSize = meta.size ?? (file as Blob & { size?: number }).size ?? 0;
  if (fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `File "${meta.filename || (file as Blob & { name?: string }).name || key}" is too large (${getFileSizeLabel(fileSize)}). Maximum allowed size is ${MAX_ATTACHMENT_SIZE_LABEL}.`,
    );
  }

  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry = {
      key,
      blob: file,
      filename: meta.filename || (file as Blob & { name?: string }).name || key,
      mime: meta.mime || (file as Blob & { type?: string }).type || "application/pdf",
      size: fileSize,
      createdAt: new Date().toISOString(),
    };
    const r = store.put(entry);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

export async function getFile(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const r = store.get(key);
    r.onsuccess = () => {
      const val = r.result;
      if (!val) return resolve(null);
      resolve(val.blob as Blob);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function deleteFile(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const r = store.delete(key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

export async function listFiles(): Promise<
  { key: string; filename: string; mime: string; size: number; createdAt: string }[]
> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const r = store.getAll();
    r.onsuccess = () => {
      resolve(
        (r.result || []).map(
          (e: {
            key: string;
            filename: string;
            mime: string;
            size: number;
            createdAt: string;
          }) => ({
            key: e.key,
            filename: e.filename,
            mime: e.mime,
            size: e.size,
            createdAt: e.createdAt,
          }),
        ),
      );
    };
    r.onerror = () => reject(r.error);
  });
}

export default { saveFile, getFile, deleteFile, listFiles };
