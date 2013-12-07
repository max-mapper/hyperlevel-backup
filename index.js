var fbackup = require('folder-backup')
var path = require('path')
var rimraf = require('rimraf')

module.exports = serve

function noop() {}

function serve(hyper, opts, httpResponse) {
  if (!opts) opts = {}
  if (!opts.onCleanup) opts.onCleanup = noop
  if (!opts.backupName) opts.backupName = +new Date()
  if (!opts.dir) opts.dir = process.cwd()
  if (Object.keys(opts).indexOf('cleanup') === -1) opts.cleanup = true
  var backupPath = path.join(opts.dir, 'backup-' + opts.backupName)
  hyper.liveBackup(opts.backupName, function(err) {
    if (err) return cb(err)
    fbackup.serve(backupPath, httpResponse, function() {
      if (opts.cleanup) rimraf(backupPath, opts.onCleanup)
    })
  })  
}
