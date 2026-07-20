export type Entry = {
  id: string
  title: string
  content: string
  dueDate: string | null
  isTodo: boolean
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type EntryWithTags = Entry & {
  tags: Tag[]
}

export type FilterMode = 'today' | 'all' | 'calendar' | 'tag'

export type UiMode = 'standard' | 'simple'

export type AppSettings = {
  opacity: number
  alwaysOnTop: boolean
  uiMode: UiMode
}
