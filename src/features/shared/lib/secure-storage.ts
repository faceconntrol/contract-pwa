/**
 * Шифрование локальных персональных данных (AES-GCM).
 * Ключ неэкспортируемый, хранится в IndexedDB на этом устройстве.
 * Защищает от чтения plaintext в localStorage; не заменяет полноценный доступ с PIN.
 */

const DB_NAME = 'contract-pwa-secure'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const KEY_RECORD = 'aes-gcm-v1'
const ENC_PREFIX = 'enc:v1:'

/** Ключи localStorage с ПДн — чистим вместе. */
export const PERSONAL_DATA_KEYS = [
  'contract-pwa:draft:lease',
  'contract-pwa:draft:osgop',
  'contract-pwa:draft:osgop:include',
  'contract-pwa:draft:osgop:exclude',
  'contract-pwa:landlord-history',
] as const

type PersonalDataKey = (typeof PERSONAL_DATA_KEYS)[number]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB недоступен'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function readStoredKey(): Promise<CryptoKey | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(KEY_RECORD)
    request.onerror = () => reject(request.error ?? new Error('Не удалось прочитать ключ'))
    request.onsuccess = () => {
      const value = request.result
      resolve(value instanceof CryptoKey ? value : null)
    }
    tx.oncomplete = () => db.close()
  })
}

async function writeStoredKey(key: CryptoKey): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(key, KEY_RECORD)
    request.onerror = () => reject(request.error ?? new Error('Не удалось сохранить ключ'))
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('Ошибка записи ключа'))
  })
}

async function deleteStoredKey(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(KEY_RECORD)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('Не удалось удалить ключ'))
  })
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await readStoredKey()
  if (existing) return existing

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
  await writeStoredKey(key)
  return key
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function encryptPayload(value: unknown): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(value))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plain),
  )
  const cipher = new Uint8Array(cipherBuf)
  const packed = new Uint8Array(iv.length + cipher.length)
  packed.set(iv, 0)
  packed.set(cipher, iv.length)
  return `${ENC_PREFIX}${bytesToBase64(packed)}`
}

async function decryptPayload<T>(raw: string): Promise<T | null> {
  if (!raw.startsWith(ENC_PREFIX)) return null
  const key = await getOrCreateKey()
  const packed = base64ToBytes(raw.slice(ENC_PREFIX.length))
  if (packed.length < 13) return null
  const iv = packed.subarray(0, 12)
  const cipher = packed.subarray(12)
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(cipher),
    )
    const text = new TextDecoder().decode(plainBuf)
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function isEncryptedBlob(raw: string | null): boolean {
  return Boolean(raw && raw.startsWith(ENC_PREFIX))
}

export async function secureGetJson<T>(key: PersonalDataKey | string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    if (isEncryptedBlob(raw)) {
      return await decryptPayload<T>(raw)
    }
    // Миграция со старого plaintext
    const parsed = JSON.parse(raw) as T
    await secureSetJson(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function secureSetJson(
  key: PersonalDataKey | string,
  value: unknown,
): Promise<{ ok: boolean; warned: boolean }> {
  try {
    const payload = await encryptPayload(value)
    localStorage.setItem(key, payload)
    return { ok: true, warned: false }
  } catch {
    const warnKey = 'contract-pwa:secure-storage-warn'
    const already = sessionStorage.getItem(warnKey) === '1'
    if (!already) {
      sessionStorage.setItem(warnKey, '1')
      return { ok: false, warned: true }
    }
    return { ok: false, warned: false }
  }
}

export async function secureRemove(key: PersonalDataKey | string): Promise<void> {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** Удаляет черновики, историю арендодателей и криптоключ устройства. */
export async function clearAllPersonalData(): Promise<void> {
  for (const key of PERSONAL_DATA_KEYS) {
    await secureRemove(key)
  }
  try {
    await deleteStoredKey()
  } catch {
    // ignore
  }
  try {
    indexedDB.deleteDatabase(DB_NAME)
  } catch {
    // ignore
  }
}
