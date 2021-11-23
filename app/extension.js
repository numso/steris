import React from 'react'
import ReactDOM from 'react-dom'

import Editor from './editor'
import * as parser from './parser'

const vscode = window.acquireVsCodeApi()

function App () {
  let value = null
  try {
    value = parser.parse(window.currentFile)
  } catch (err) {
    console.error(err)
    console.error('invalid steris format')
  }

  const onChange = React.useCallback(newValue => {
    const text = parser.stringify(newValue)
    vscode.postMessage({ type: 'editorUpdated', text })
  }, [])

  return <Editor value={value} onChange={onChange} />
}

const el = document.getElementById('app')
ReactDOM.render(<App />, el)
