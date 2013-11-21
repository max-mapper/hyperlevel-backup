var fs = require('fs')
var path = require('path')
var dirtar = require('dir-tar-stream')
var tar = require('tar')
var rimraf = require('rimraf')
var ProgressBar = require('progress')
var extend = require('extend')
var request = require('request')
var zlib = require('zlib')

function noop(){}

module.exports.pack = pack
module.exports.unpack = unpack
module.exports.serve = serve
module.exports.clone = clone

function clone(remote, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = undefined
  }
  
  if (!cb) cb = noop
  if (!options) options = {}
  
  var defaults = {
    path: process.cwd(),
    showProgress: false
  }
  
  options = extend({}, defaults, options)
  
  var targz = request(remote)
  var gunzip = zlib.createGunzip()
  var unpackStream = unpack(options.path, cb)
  
  targz.pipe(gunzip).pipe(unpackStream)
  
  if (options.showProgress) {
    var bar
    
    targz.on('response', function(r) {
      var pending = +r.headers['x-file-count']
      bar = new ProgressBar('  [:bar] :elapseds elapsed, eta :etas', {
        width: 20,
        total: pending
      })
    })
    
    unpackStream.on('entry', function(entry) {
      if (entry.type === 'File') bar.tick()
    })
  }
  
  return unpackStream
}

function unpack(target, cb) {
  if (typeof target === 'function') {
    cb = target
    target = undefined
  }
  if (!cb) cb = noop
  if (!target) target = process.cwd()
    
  var untarStream = tar.Extract({ path: target, strip: 1 })
  var untarError = false
    
  untarStream.on('error', function(e) {
    untarError = true
    cb(e)
  })
  
  untarStream.on('end', function() {
    if (untarError) return
    cb()
  })
  
  return untarStream
}

function pack(opts, cb) {
  if (!opts.onCleanup) opts.onCleanup = noop
  if (!opts.backupName) opts.backupName = +new Date()
  if (!opts.dbFolder) opts.dbFolder = process.cwd()
  if (Object.keys(opts).indexOf('cleanup') === -1) opts.cleanup = true
  var hyper = opts.hyper
  var backupPath = path.join(opts.dbFolder, 'backup-' + opts.backupName)
  hyper.liveBackup(opts.backupName, function(err) {
    if (err) return cb(err)
    
    fs.readdir(backupPath, function(err, files) {
      if (err) return cb(err)
    
      var tarStream = dirtar(backupPath)
      
      if (opts.cleanup) {
        tarStream.on('end', function() {
          rimraf(backupPath, opts.onCleanup)
        })        
      }
      
      cb(null, tarStream, files)
    })
  })
}

function serve(hyper, dbFolder, httpResponse) {
  var opts = {
    hyper: hyper,
    dbFolder: dbFolder
  }
  pack(opts, function(err, packStream, files) {
    if (err) {
      httpResponse.statusCode = 500
      httpResponse.end(err.toString())
      return
    }
    httpResponse.setHeader('x-file-count', files.length)
    packStream.pipe(httpResponse)
  })
}