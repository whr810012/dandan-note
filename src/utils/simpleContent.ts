export function displayedSimpleContent(entry: { content: string; title: string }) {
  return entry.content
}

export function simpleContentNeedsSave(local: string, stored: string) {
  return local !== stored
}
