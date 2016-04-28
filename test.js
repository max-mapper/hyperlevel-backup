var test = require('tape')
var level = require('level-hyper')
var os = require('os')
var path = require('path')
var rimraf = require('rimraf')
var http = require('http')
var backup = require('./index')
var zlib = require('zlib')
var tar = require('tar')
var fs = require('fs')
var after = require('after')

test('should be able to do a backup and leave the backup', function (t) {
  t.plan(1)
  var dbPath = path.join(os.tmpdir(), 'hyperlevel-backup-' + Date.now())
  var backupPath = path.join(os.tmpdir(), 'hyperlevel-backup-unpack-' + Date.now())
  var db = level(dbPath, function (err) {
    var server = http.createServer(function (req, res) {
      backup(db.db, { cleanup: false }, res)
    })
    server.listen(0, function () {
      http.get('http://localhost:' + server.address().port, function (res) {
        fs.readdir(dbPath, function (err, files) {
          if (err) throw err
          var expected = files.filter(isDatabaseBackupFile).sort()
          var results = []
          res
            .pipe(zlib.createGunzip())
            .pipe(tar.Parse())
            .on('entry', function (entry) {
              if (entry.type === 'File') {
                results.push(entry.path)
              }
            })
            .on('end', function () {
              t.deepEqual(expected, results.sort(), 'correct files present')
              var next = after(4, t.end.bind(t))
              rimraf(dbPath, next)
              rimraf(backupPath, next)
              db.close(next)
              server.close(next)
            })
        })
      })
    })
  })
})

test('should be able to do a backup and cleanup the backup', function (t) {
  t.plan(2)

  var dbPath = path.join(os.tmpdir(), 'hyperlevel-backup-' + Date.now())
  var backupPath = path.join(os.tmpdir(), 'hyperlevel-backup-unpack-' + Date.now())
  var db = level(dbPath, function (err) {
    var server = http.createServer(function (req, res) {
      backup(db.db, { cleanup: true, onCleanup: checkDir }, res)
    })

    function checkDir() {
      fs.readdir(dbPath, function (err, files) {
        if (err) throw err
        t.equal(files.filter(isBackup).length, 0, 'backup folder empty')
      })
    }

    server.listen(0, function () {
      http.get('http://localhost:' + server.address().port, function (res) {
        fs.readdir(dbPath, function (err, files) {
          if (err) throw err
          var expected = files.filter(isDatabaseBackupFile).sort()
          var results = []
          res
            .pipe(zlib.createGunzip())
            .pipe(tar.Parse())
            .on('entry', function (entry) {
              if (entry.type === 'File') {
                results.push(entry.path)
              }
            })
            .on('end', function () {
              t.deepEqual(expected, results.sort(), 'correct files present')
              var next = after(3, t.end.bind(t))
              rimraf(dbPath, next)
              rimraf(backupPath, next)
              server.close(next)
            })
        })
      })
    })
  })
})

function isDatabaseBackupFile(file) {
  return !(isBackup(file) || file === 'LOCK')
}

function isBackup(file) {
  return file.match(/^backup-/)
}
