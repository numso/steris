import React from 'react'
import ReactDOM from 'react-dom'

import Editor from './editor'
import * as parser from './parser'

const vscode = window.acquireVsCodeApi()

function App () {
  const ref = React.useRef(window.currentFile)
  let value = null
  try {
    value = parser.parse(window.currentFile)
  } catch (err) {
    console.error(err)
    console.error('invalid steris format')
  }

  const onChange = React.useCallback(newValue => {
    const text = parser.stringify(newValue)
    if (ref.current === text) return
    ref.current = text
    vscode.postMessage({ type: 'editorUpdated', text })
  }, [])

  return <Editor value={value} onChange={onChange} />
}

const el = document.getElementById('app')
ReactDOM.render(<App />, el)
