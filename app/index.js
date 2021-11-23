import React from 'react'
import ReactDOM from 'react-dom'

import Editor from './editor'

function App () {
  const [data, setData] = React.useState(null)
  return (
    <>
      <Editor value={data} onChange={setData} />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  )
}

const el = document.getElementById('app')
ReactDOM.render(<App />, el)
