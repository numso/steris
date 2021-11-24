import { nanoid } from 'nanoid'

const newItem = () => ({
  id: nanoid(),
  text: '',
  completed: false,
  hidden: false,
  children: []
})

export function parse (text) {
  const [, frontmatter, content] = text.split('---')
  const fm = parseFrontmatter(frontmatter)
  const children = parseContent(content)
  return { ...fm, children }
}

function parseFrontmatter (text) {
  const lines = text.trim().split('\n')
  const fm = {}
  for (const line of lines) {
    const [key, value] = line.split(':')
    fm[key.trim()] = value.trim()
  }
  return fm
}

function parseContent (content) {
  const lines = content.trim().split('\n')
  return parseChildren(lines, 0)
}

function parseChildren (lines, nestingLevel) {
  const children = []
  let curChild = null

  while (true) {
    const next = lines[0]
    if (!next) break
    // TODO:: Ensure this starts with spaces
    const [first] = next.split(/[<>] \[[ x]\]/)
    if (first.length === nestingLevel) {
      if (curChild) children.push(curChild)
      curChild = newItem()
      curChild.text = next.substr(nestingLevel + 6)
      if (next[nestingLevel + 3] === 'x') curChild.completed = true
      if (next[nestingLevel] === '<') curChild.hidden = true
      lines.shift()

      const next2 = lines[0] || ''
      // TODO:: Ensure this starts with spaces
      const [first2] = next2.split(/#/)
      if (first2.length === nestingLevel) {
        curChild.note = next2.substr(nestingLevel + 2)
        lines.shift()
      }
    } else if (first.length > nestingLevel) {
      if (!curChild) throw new Error('Unexpected nesting level')
      curChild.children = parseChildren(lines, nestingLevel + 2)
      children.push(curChild)
      curChild = null
    } else {
      break
    }
  }

  if (curChild) children.push(curChild)
  return children
}

export function stringify (data) {
  const { children, id, ...fm } = data
  const fmStr = Object.entries(fm)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  const content = stringifyContent(children, 0)
  return `---\n${fmStr}\n---\n${content}\n`
}

function stringifyContent (data, nestingLevel) {
  return data
    .map(item => {
      const { text, children, completed, hidden, note } = item
      const prefix = `${' '.repeat(nestingLevel)}`
      const dir = hidden ? '<' : '>'
      const done = completed ? 'x' : ' '
      const str = [`${prefix}${dir} [${done}] ${text}`]
      if (note) str.push(`${prefix}# ${note}`)
      if (children?.length) {
        str.push(stringifyContent(children, nestingLevel + 2))
      }
      return str.join('\n')
    })
    .join('\n')
}
