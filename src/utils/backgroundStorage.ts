const DATABASE_NAME = 'dandan-note-assets'
const DATABASE_VERSION = 1
const STORE_NAME = 'backgrounds'
const BACKGROUND_KEY = 'shared-background'

export const MAX_BACKGROUND_IMAGE_BYTES = 12 * 1024 * 1024
export const SUPPORTED_BACKGROUND_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function normalizeBackgroundColor(value: unknown, fallback = '#eef2f8') {
  if (typeof value !== 'string') return fallback
  const color = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(color)) return color
  if (/^#[0-9a-f]{3}$/.test(color)) {
    return `#${color
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`
  }
  return fallback
}

export function isDarkBackgroundColor(value: unknown) {
  const color = normalizeBackgroundColor(value)
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  return red * 0.299 + green * 0.587 + blue * 0.114 < 142
}

export function validateBackgroundImage(file: Pick<Blob, 'size' | 'type'>) {
  if (!SUPPORTED_BACKGROUND_IMAGE_TYPES.includes(file.type)) {
    return '仅支持 PNG、JPEG 或 WebP 图片'
  }
  if (file.size <= 0) return '图片文件为空'
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) return '图片不能超过 12 MB'
  return null
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('当前环境不支持本地图片存储'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开背景图片存储'))
  })
}

function completeTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('背景图片存储失败'))
    transaction.onabort = () => reject(transaction.error ?? new Error('背景图片存储已取消'))
  })
}

export async function loadBackgroundImage() {
  const database = await openDatabase()
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(BACKGROUND_KEY)
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null)
      request.onerror = () => reject(request.error ?? new Error('读取背景图片失败'))
    })
  } finally {
    database.close()
  }
}

export async function saveBackgroundImage(file: Blob) {
  const validationError = validateBackgroundImage(file)
  if (validationError) throw new Error(validationError)

  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, BACKGROUND_KEY)
    await completeTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deleteBackgroundImage() {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(BACKGROUND_KEY)
    await completeTransaction(transaction)
  } finally {
    database.close()
  }
}
