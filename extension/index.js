const vscode = require('vscode')

// When a .strs is first opened or created, activate the extension.
exports.activate = function activate (context) {
  console.log('activating steris')
  try {
    context.subscriptions.push(SterisEditorProvider.register(context))
  } catch (e) {
    console.error(e)
  }
}

class SterisEditorProvider {
  constructor (context) {}

  // static newTDFileId = 1

  static viewType = 'steris.strs'

  static register = context => {
    return vscode.window.registerCustomEditorProvider(
      SterisEditorProvider.viewType,
      new SterisEditorProvider(context),
      {
        webviewOptions: {
          // See https://code.visualstudio.com/api/extension-guides/webview#retaincontextwhenhidden
          retainContextWhenHidden: true
        },

        // See https://code.visualstudio.com/api/extension-guides/custom-editors#custom-editor-lifecycle
        supportsMultipleEditorsPerDocument: true
      }
    )
  }

  // When our custom editor is opened, create a SterisWebviewManager to
  // configure the webview and set event listeners to handle events.
  async resolveCustomTextEditor (document, webviewPanel) {
    new SterisWebviewManager(this.context, document, webviewPanel)
  }
}

/**
 * When a new editor is opened, an instance of this class will
 * be created to configure the webview and handle its events.
 */
class SterisWebviewManager {
  disposables = []

  constructor (context, document, webviewPanel) {
    this.context = context
    this.document = document
    this.webviewPanel = webviewPanel

    // Configure the webview. For now all we do is enable scripts and also
    // provide the initial webview's html content.
    Object.assign(webviewPanel.webview, {
      options: { enableScripts: true },
      html: this.getHtmlForWebview(context, document, webviewPanel)
    })

    // Listen for changes to the document when saved from VS Code.m
    vscode.workspace.onDidSaveTextDocument(
      this.handleDidSaveTextDocument,
      undefined,
      this.disposables
    )

    // Listen for changes made to the text document by VS Code or by some other app.
    vscode.workspace.onDidChangeTextDocument(
      this.handleDidChangeTextDocument,
      undefined,
      this.disposables
    )

    // Listen for messages sent from the extensions webview.
    webviewPanel.webview.onDidReceiveMessage(
      this.handleMessageFromWebview,
      undefined,
      this.disposables
    )

    // Send the initial document content to bootstrap the Steris component.
    webviewPanel.webview.postMessage({
      type: 'openedFile',
      text: document.getText()
    })

    // Clean up disposables when the editor is closed.
    webviewPanel.onDidDispose(this.handleDidDispose)
  }

  handleDidDispose = () => {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  handleDidSaveTextDocument = () => {
    const { webviewPanel, document } = this
    if (!(webviewPanel && document)) return

    webviewPanel.webview.postMessage({
      type: 'fileSaved',
      text: document.getText()
    })
  }

  handleDidChangeTextDocument = event => {
    // TODO
    // If we can figure out whether the change came from inside of the
    // editor vs. from some other app, we can update the document to
    // show that external change.
  }

  handleMessageFromWebview = e => {
    const { document } = this
    if (!document) return

    switch (e.type) {
      case 'editorUpdated': {
        const edit = new vscode.WorkspaceEdit()

        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          e.text
        )

        vscode.workspace.applyEdit(edit)

        break
      }
    }
  }

  getHtmlForWebview = () => {
    const { context, document, webviewPanel } = this
    const documentContent = JSON.stringify(document.getText())
    let jsUrl = 'http://localhost:3000/extension.js'

    if (process.env.NODE_ENV === 'production') {
      jsUrl = webviewPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'editor/', 'index.js')
      )
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>steris</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              min-height: 100vh;
              background: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                'Helvetica Neue', Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          <div id="app"></div>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <script>var currentFile = ${documentContent};</script>
          <script type="module" src="${jsUrl}"></script>
        </body>
      </html>
    `
  }
}
