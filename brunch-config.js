module.exports = {
  // See http://brunch.io for documentation.
  files: {
    javascripts: {joinTo: 'app.js'},
    stylesheets: {joinTo: 'app.css'},
    templates: {joinTo: 'app.js'}
  },
  watcher: {
    usePolling: true
    // ignored: [/.*#.*/],
    // atomic: 5000,
    // awaitWriteFinish: true
  }
}
