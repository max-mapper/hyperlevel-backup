# hyperlevel-backup

[![NPM](https://nodei.co/npm/hyperlevel-backup.png)](https://nodei.co/npm/hyperlevel-backup/)

High level API for replicating a hyperleveldb, taking advantage of the `.liveBackup` function provided by [hyperleveldb](http://hackingdistributed.com/2013/06/17/hyperleveldb/).

Unfortunately `.liveBackup` does not exist in stock google leveldb.

`.liveBackup` creates a consistent snapshot of a running hyperleveldb instance. the files are hardlinks where possible to the originals. this module implements methods for streaming the contents of a leveldb folder as a .tar.gz stream and unpacking them on the other end, for doing replication or backups of hyperleveldb instances.

```
var hlc = require('hyperlevel-backup')
```

##API

### `hlb.pack(opts, cb)`

creates a snapshot of a hyperleveldb instance, and then calls `cb` with a readable stream of the gzipped contents of the files in the snapshot

`opts` must have at least these keys:

```
{
  hyper: hyperleveldbInstance,
  dbFolder: pathToHyperleveldbFolder
}
```

and can optionally also have:

```
{
  onCleanup: function() {}, // gets called when the snapshot gets removed after replication
  backupName: string/int, // used to name the backup folder, default is a timestamp
  cleanup: boolean // default true, if false snapshot won't be removed after replication
}
```

### `hlb.unpack(target, cb)`

returns a writable stream that ungzips and unpacks data into `target`. calls optional `cb` when done with `(err)`


### `hlb.serve(hyper, dbFolder, httpResponse)`

function for mounting this module in an http API. streams `hlb.pack` to the `httpResponse`

### `hlb.clone(remoteURL, options, cb)`

makes HTTP request to `remoteURL` (which should be `hlb.serve` and/or the .tar.gz of a `hlb.pack`) and unpacks into `options.path`. default path is `process.cwd()`

you can also specify `options.showProgress` as either `true` or `false` (default is `false`) if you want to print progress messages to stdout

## license

BSD
