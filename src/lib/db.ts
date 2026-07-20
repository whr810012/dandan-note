import Database from '@tauri-apps/plugin-sql'
import type { Entry, EntryWithTags, Tag } from '../types/entry'

const DB_URL = 'sqlite:notebook.db'

let databasePromise: Promise<Database> | null = null

async function getDb() {
  if (!databasePromise) {
    databasePromise = Database.load(DB_URL).catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function asBool(value: unknown) {
  return value === true || value === 1 || value === '1'
}

async function ensureSchema() {
  const db = await getDb()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      is_todo INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)
}

function mapEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    dueDate: row.due_date ? String(row.due_date) : null,
    isTodo: asBool(row.is_todo),
    completed: asBool(row.completed),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function groupEntries(
  entries: Entry[],
  joinedTags: Array<Record<string, unknown>>,
): EntryWithTags[] {
  const tagMap = new Map<string, Tag[]>()

  for (const row of joinedTags) {
    const entryId = String(row.entry_id)
    if (!row.tag_id) continue
    const current = tagMap.get(entryId) ?? []
    current.push({
      id: String(row.tag_id),
      name: String(row.tag_name),
      color: String(row.tag_color),
    })
    tagMap.set(entryId, current)
  }

  return entries.map((entry) => ({
    ...entry,
    tags: tagMap.get(entry.id) ?? [],
  }))
}

export async function bootstrapDb() {
  await ensureSchema()
}

export async function listEntries() {
  await ensureSchema()
  const db = await getDb()

  const entries = (
    await db.select<Record<string, unknown>[]>(
      `SELECT * FROM entries
       ORDER BY
         CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
         due_date ASC,
         updated_at DESC`,
    )
  ).map(mapEntry)

  const tags = await db.select<Record<string, unknown>[]>(
    `SELECT entry_tags.entry_id,
            tags.id AS tag_id,
            tags.name AS tag_name,
            tags.color AS tag_color
       FROM entry_tags
       JOIN tags ON tags.id = entry_tags.tag_id`,
  )

  return groupEntries(entries, tags)
}

export async function listTags() {
  await ensureSchema()
  const db = await getDb()
  return db.select<Tag[]>(`SELECT id, name, color FROM tags ORDER BY name ASC`)
}

export async function createEntry(defaults?: {
  title?: string
  dueDate?: string | null
  isTodo?: boolean
}) {
  await ensureSchema()
  const db = await getDb()
  const id = randomId('entry')
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO entries (id, title, content, due_date, is_todo, completed, created_at, updated_at)
     VALUES ($1, $2, '', $3, $4, 0, $5, $5)`,
    [
      id,
      defaults?.title ?? '新条目',
      defaults?.dueDate ?? now.slice(0, 10),
      defaults?.isTodo ? 1 : 0,
      now,
    ],
  )

  return id
}

export async function updateEntry(
  entryId: string,
  patch: Pick<Entry, 'title' | 'content' | 'dueDate' | 'isTodo' | 'completed'>,
) {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE entries
        SET title = $1,
            content = $2,
            due_date = $3,
            is_todo = $4,
            completed = $5,
            updated_at = $6
      WHERE id = $7`,
    [
      patch.title,
      patch.content,
      patch.dueDate,
      patch.isTodo ? 1 : 0,
      patch.completed ? 1 : 0,
      now,
      entryId,
    ],
  )
}

export async function deleteEntry(entryId: string) {
  const db = await getDb()
  await db.execute(`DELETE FROM entry_tags WHERE entry_id = $1`, [entryId])
  await db.execute(`DELETE FROM entries WHERE id = $1`, [entryId])
}

export async function createTag(name: string, color: string) {
  const db = await getDb()
  const trimmedName = name.trim()
  if (!trimmedName) return null

  const existed = await db.select<Tag[]>(
    `SELECT id, name, color FROM tags WHERE lower(name) = lower($1)`,
    [trimmedName],
  )

  if (existed.length > 0) return existed[0]

  const id = randomId('tag')
  await db.execute(`INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)`, [
    id,
    trimmedName,
    color,
  ])
  return { id, name: trimmedName, color }
}

export async function replaceEntryTags(entryId: string, tagIds: string[]) {
  const db = await getDb()
  await db.execute(`DELETE FROM entry_tags WHERE entry_id = $1`, [entryId])

  for (const tagId of tagIds) {
    await db.execute(
      `INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES ($1, $2)`,
      [entryId, tagId],
    )
  }
}
