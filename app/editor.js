import { useImmerReducer } from 'use-immer'
import * as _ from 'lodash'
import { nanoid } from 'nanoid'
import React from 'react'
import styled, { css } from 'styled-components'

const newItem = () => ({
  id: nanoid(),
  text: '',
  completed: false,
  hidden: false,
  children: []
})

function focus (id, last) {
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${id}"]`)
    if (!el) return
    el.focus()
    if (!last) return
    if (window.getSelection && document.createRange) {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    } else if (document.body.createTextRange) {
      const textRange = document.body.createTextRange()
      textRange.moveToElementText(el)
      textRange.collapse(false)
      textRange.select()
    }
  }, 10)
}

function ensureValid (value) {
  if (!value) value = {}
  if (!value.children) value.children = []
  if (!value.children.length) value.children.push(newItem())
  if (!value.title) value.title = 'Untitled List'
  value.id = 'ROOT'
  return value
}

function findItemById (item, id) {
  if (item.id === id) return item
  for (const child of item.children) {
    const found = findItemById(child, id)
    if (found) return found
  }
  return null
}

function findParentById (item, id, parent, i) {
  if (item.id === id) return [parent, i, item]
  for (let i = 0; i < item.children.length; ++i) {
    const found = findParentById(item.children[i], id, item, i)
    if (found) return found
  }
  return null
}

function findNext (draft, id) {
  const item = findItemById(draft, id)
  if (!item.hidden && item.children.length) return item.children[0]
  let i
  let thing = item
  while (true) {
    ;[thing, i] = findParentById(draft, thing.id)
    if (i < thing.children.length - 1) return thing.children[i + 1]
    if (thing.id === 'ROOT') return null
  }
}

function findPrev (draft, id) {
  const [parent, i] = findParentById(draft, id)
  if (i === 0) return parent.id === 'ROOT' ? null : parent
  let thing = parent.children[i - 1]
  while (true) {
    if (!thing.hidden && thing.children.length) {
      thing = thing.children[thing.children.length - 1]
    } else {
      return thing
    }
  }
}

function reducer (draft, action) {
  switch (action.type) {
    case 'updateTitle': {
      draft.title = action.value
      break
    }
    case 'toggleHidden': {
      const item = findItemById(draft, action.id)
      item.hidden = !item.hidden
      break
    }
    case 'hide': {
      const item = findItemById(draft, action.id)
      if (item.children.length) item.hidden = true
      break
    }
    case 'show': {
      const item = findItemById(draft, action.id)
      item.hidden = false
      break
    }
    case 'toggleCompleted': {
      const item = findItemById(draft, action.id)
      item.completed = !item.completed
      break
    }
    case 'update': {
      const item = findItemById(draft, action.id)
      item.text = action.value
      break
    }
    case 'updateNote': {
      const item = findItemById(draft, action.id)
      item.note = action.value
      break
    }
    case 'addItem': {
      const [parent, i, item] = findParentById(draft, action.id)
      const newThing = newItem()
      if (item.children.length) {
        item.children.unshift(newThing)
      } else {
        parent.children.splice(i + 1, 0, newThing)
      }
      focus(newThing.id)
      break
    }
    case 'removeItem': {
      const [parent, i, item] = findParentById(draft, action.id)
      if (parent.id === 'ROOT' && parent.children.length === 1) return
      if (item.children.length) return
      parent.children.splice(i, 1)
      break
    }
    case 'indent': {
      const [parent, i, item] = findParentById(draft, action.id)
      if (i === 0) return
      parent.children.splice(i, 1)
      parent.children[i - 1].children.push(item)
      focus(item.id)
      break
    }
    case 'unindent': {
      const [parent, i, item] = findParentById(draft, action.id)
      if (parent.id === 'ROOT') return
      parent.children.splice(i, 1)
      const [grandparent, j] = findParentById(draft, parent.id)
      grandparent.children.splice(j + 1, 0, item)
      focus(item.id)
      break
    }
    case 'focusNext': {
      const item = findNext(draft, action.id)
      if (item) focus(item.id)
      break
    }
    case 'focusPrev': {
      const item = findPrev(draft, action.id)
      if (item) focus(item.id)
      else document.getElementById('title').focus()
      break
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`)
    }
  }
}

export default ({ value, onChange }) => {
  const [state, dispatch] = useImmerReducer(reducer, value, ensureValid)
  React.useEffect(() => {
    onChange(state)
  }, [state])
  return (
    <Container>
      <Title
        id='title'
        value={state.title}
        onKeyDown={e => {
          if (e.key !== 'ArrowDown') return
          e.preventDefault()
          document.querySelector('[data-id]').focus()
        }}
        onChange={e => dispatch({ type: 'updateTitle', value: e.target.value })}
      />
      <BulletPoint root item={state} dispatch={dispatch} />
    </Container>
  )
}

const Container = styled.div``
const Title = styled.input`
  font-size: 2em;
  font-weight: bold;
  border: none;
  outline: none !important;
  width: 100%;
  text-align: center;
  padding: 0.5em 0 0;
`

function BulletPoint ({ root, item, dispatch, parentCompleted }) {
  const { id } = item
  return (
    <BulletPointWrapper>
      {!root && (
        <BulletPointItem>
          <TopItem>
            {!!item.children?.length && (
              <ExpandIcon
                collapsed={item.hidden}
                onClick={() => dispatch({ type: 'toggleHidden', id })}
              >
                <svg width='20' height='20' viewBox='0 0 20 20'>
                  <path
                    d='M13.75 9.56879C14.0833 9.76124 14.0833 10.2424 13.75 10.4348L8.5 13.4659C8.16667 13.6584 7.75 13.4178 7.75 13.0329L7.75 6.97072C7.75 6.58582 8.16667 6.34525 8.5 6.5377L13.75 9.56879Z'
                    stroke='none'
                    fill='rgb(75, 81, 85)'
                  />
                </svg>
              </ExpandIcon>
            )}
            <Dot
              collapsed={item.hidden}
              onClick={() => dispatch({ type: 'toggleCompleted', id })}
            >
              <svg width='18' height='18' viewBox='0 0 18 18'>
                <circle cx='9' cy='9' r='3.5' />
              </svg>
            </Dot>
            <ContentEditable
              id={id}
              value={item.text}
              completed={item.completed}
              parentCompleted={parentCompleted}
              onChange={value => dispatch({ type: 'update', id, value })}
              onKeyDown={e => {
                const key = [e.metaKey && 'Cmd', e.shiftKey && 'Shift', e.key]
                  .filter(Boolean)
                  .join('-')
                const event = keyMap[key]
                if (!event) return
                e.preventDefault()
                dispatch({ type: event, id })
              }}
            />
          </TopItem>
          {item.note && (
            <ContentEditable
              id={`${id}-notes`}
              value={item.note}
              notes
              onChange={value => dispatch({ type: 'updateNote', id, value })}
            />
          )}
        </BulletPointItem>
      )}
      {!!item.children?.length && !item.hidden && (
        <ChildrenHolder root={root}>
          {_.map(item.children, (childItem, i) => (
            <BulletPoint
              key={childItem.id}
              item={childItem}
              dispatch={dispatch}
              parentCompleted={parentCompleted || item.completed}
            />
          ))}
        </ChildrenHolder>
      )}
    </BulletPointWrapper>
  )
}

function ContentEditable ({ id, value, onChange, ...rest }) {
  const ref = React.useRef(value)
  return (
    <StyledContentEditable
      data-id={id}
      onInput={e => onChange(e.target.innerHTML)}
      dangerouslySetInnerHTML={{ __html: ref.current }}
      {...rest}
    />
  )
}

const keyMap = {
  Enter: 'addItem',
  Tab: 'indent',
  'Shift-Tab': 'unindent',
  // Backspace: 'removeItem', only if !e.target.innerHTML
  'Cmd-Shift-Backspace': 'removeItem',
  ArrowDown: 'focusNext',
  ArrowUp: 'focusPrev',
  'Cmd-Enter': 'toggleCompleted',
  'Cmd-ArrowDown': 'show',
  'Cmd-ArrowUp': 'hide',
  'Shift-Enter': 'enterNoteMode'
}

const StyledContentEditable = styled.div.attrs({ contentEditable: true })`
  flex: 1;
  font-size: ${props => (props.notes ? 13 : 15)}px;
  color: ${props =>
    props.notes
      ? 'rgb(134, 140, 144)'
      : props.completed || props.parentCompleted
      ? 'rgb(183, 188, 191)'
      : 'rgb(42, 49, 53)'};
  outline: none;
  text-decoration: ${props => (props.completed ? 'line-through' : 'none')};
  margin-left: ${props => (props.notes ? '23px' : 0)};
`

const ExpandIcon = styled.div`
  opacity: 0;
  position: absolute;
  top: 7px;
  left: -20px;
  > svg {
    fill: rgb(75, 81, 85);
    transition: transform 200ms ease 0s;
    transform: rotate(${props => (props.collapsed ? 0 : 90)}deg);
  }
`

const BulletPointWrapper = styled.div`
  position: relative;
`

const TopItem = styled.div`
  display: flex;
  align-items: center;
  &:hover ${ExpandIcon} {
    opacity: 1;
  }
`

const BulletPointItem = styled.div`
  padding: 8px 0;
`

const Dot = styled.div`
  display: flex;
  border-radius: 50%;
  margin-right: 4px;

  > svg {
    fill: rgb(75, 81, 85);
  }

  ${props =>
    props.collapsed &&
    css`
      background: rgb(220, 224, 226);
    `}

  &:hover {
    background: rgb(183, 188, 191);
    cursor: pointer;
  }
`

const ChildrenHolder = styled.div`
  margin-left: 10px;
  padding-left: 25px;
  border-left: 1px solid;
  border-color: ${props => (props.root ? 'transparent' : 'rgb(236, 238, 240)')};
`
