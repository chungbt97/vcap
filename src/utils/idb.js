const DB_NAME = 'vcap'
const STORE_CHUNKS = 'videoChunks'
const DB_VERSION = 1

let cachedDB = null
let dbPromise = null

/** @returns {Promise<IDBDatabase>} */
function openDB() {
  if (cachedDB) return Promise.resolve(cachedDB)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        db.createObjectStore(STORE_CHUNKS, { autoIncrement: true })
      }
    }
    req.onsuccess = (e) => {
      cachedDB = e.target.result
      dbPromise = null
      resolve(cachedDB)
    }
    req.onerror = (e) => {
      dbPromise = null
      reject(e.target.error)
    }
  })
  return dbPromise
}

export function closeDB() {
  if (cachedDB) {
    cachedDB.close()
    cachedDB = null
  }
  dbPromise = null
}

/** Append a video Blob chunk to IndexedDB. */
export async function appendChunk(blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readwrite')
    tx.objectStore(STORE_CHUNKS).add(blob)
    tx.oncomplete = resolve
    tx.onerror = (e) => {
      const err = e.target.error
      if (err && err.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded — export recording to free space.'))
      } else {
        reject(err)
      }
    }
  })
}

/** Read all chunks in order and return as a single Blob. */
export async function readAllChunks(mimeType = 'video/webm') {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readonly')
    const req = tx.objectStore(STORE_CHUNKS).getAll()
    req.onsuccess = (e) => resolve(new Blob(e.target.result, { type: mimeType }))
    req.onerror = (e) => reject(e.target.error)
  })
}

/** Clear all chunks after export. */
export async function clearChunks() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readwrite')
    tx.objectStore(STORE_CHUNKS).clear()
    tx.oncomplete = resolve
    tx.onerror = (e) => {
      const err = e.target.error
      if (err && err.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded — export recording to free space.'))
      } else {
        reject(err)
      }
    }
  })
}
