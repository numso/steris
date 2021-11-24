import React from 'react'
import ReactDOM from 'react-dom'

import Editor from './editor'
import raw from './example.strs'
import * as parser from './parser'

const initial = parser.parse(raw)

function App () {
  const [data, setData] = React.useState(initial)
  return (
    <>
      <Editor value={data} onChange={setData} />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  )
}

const el = document.getElementById('app')
ReactDOM.render(<App />, el)
