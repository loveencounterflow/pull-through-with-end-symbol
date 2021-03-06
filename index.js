var looper = require('looper')
const end_sym = Symbol( 'end' )

const pull_through = function (writer, ender) {
  return function (read) {
    var queue = [], ended, error

    function enqueue (data) {
      queue.push(data)
    }

    writer = writer || function (data) {
      this.queue(data)
    }

    ender = ender || function () {
      this.queue( end_sym )
    }

    var emitter = {
      emit: function ( event, data ) {
        if ( event === 'data'   ) { enqueue(data); };
        if ( event === 'end'    ) { ended = true, enqueue( end_sym ); };
        if ( event === 'error'  ) { error = data; };
      },
      queue: enqueue
    }
    var _cb
    return function (end, cb) {
      ended = ended || end
      if ( end ) {
        return read(end, function () {
          if(_cb) {
            var t = _cb; _cb = null; t(end)
          }
          cb(end)
        }) };

      _cb = cb
      const pull = function ( next ) {
        //if it's an error
        if ( !_cb ) { return; };
        cb = _cb;
        if ( error ) {
          _cb = null;
          cb( error ); }
        else if ( queue.length > 0 ) {
          var data  = queue.shift();
          _cb       = null;
          cb( data === end_sym, data );
          }
        else {
          // ...............................................................................................
          read( ended, function ( end, data ) {
            // console.log( 'pull-through 88744-1 ' + require('util').inspect(data));
             // null has no special meaning for pull-stream
             // but now `Symbol.for( 'pipestreams:end' )` has
            if( end && end !== true ) {
              error = end;
              return next(); };
            // .............................................................................................
            if( ended = ended || data === end_sym || end ) {
              ender.call( emitter ); }
            else if( data !== end_sym ) {
              writer.call( emitter, data );
              if ( error || ended ) {
                return read( error || ended, function () {
                  _cb = null; cb( error || ended )
                }) };
              };
            next( pull );
          })
        }
      };

      looper( pull );
    }
  }
}

pull_through.symbols = { end: end_sym, };
module.exports = pull_through;


