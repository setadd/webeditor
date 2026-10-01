import { parseDocument, type DiagramDocument } from "../domain/document";

const DATABASE = "configuration-editor";
const STORE = "documents";
const ACTIVE = "active-draft";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(request.error || new Error("无法打开本机存储。"));
    request.onblocked = () =>
      reject(new Error("本机存储被其他页面占用，请关闭其他组态页面后重试。"));
  });
}

export async function loadDocument(key = ACTIVE): Promise<DiagramDocument | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(key);
      transaction.oncomplete = () => {
        db.close();
        try {
          resolve(
            request.result === undefined ? null : parseDocument(request.result),
          );
        } catch (error) {
          reject(error);
        }
      };
      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("无法读取本机保存。"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

export async function saveDocument(document: DiagramDocument, key = ACTIVE): Promise<void> {
  const snapshot = parseDocument(JSON.parse(JSON.stringify(document)));
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(
          transaction.error ||
            new Error("写入被中断，未保存的内容仍保留在画布中。"),
        );
      };
      transaction.objectStore(STORE).put(snapshot, key);
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}
