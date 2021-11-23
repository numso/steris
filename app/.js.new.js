const fs = require('fs')

module.exports = config => {
  return {
    ...config,
    builders: {
      ...config.builders,
      strs: ({ url, filePath, dev, babel }) => {
        const contents = fs.readFileSync(filePath, 'utf8')
        return `export default ${JSON.stringify(contents)}`
      }
    },
    template: 'react',
    outputDir: '.dist',
    ignore: /^\./,
    skipTransform: /\.html$|\.toml$/
  }
}
