var exec = require('cordova/exec');

function Push() {
  this._handlers = { registration: [], notification: [], error: [] };
  this._inited = false;
}

Push.prototype.on = function (event, cb) {
  if (this._handlers[event]) this._handlers[event].push(cb);
};

Push.prototype._emit = function (event, payload) {
  (this._handlers[event] || []).forEach(function (cb) {
    try { cb(payload); } catch (e) {}
  });
};

Push.prototype.init = function (options) {
  var self = this;
  options = options || {};

  if (self._inited) return self;
  self._inited = true;

  exec(
    function (msg) {
      if (msg && msg.type) self._emit(msg.type, msg.data);
    },
    function (err) {
      self._emit('error', { message: String(err || 'Unknown error') });
    },
    'APNSPush',
    'init',
    [options]
  );

  return self;
};

Push.prototype.requestPermissions = function (cb) {
  exec(
    function (res) { if (cb) cb(res); },
    function (err) { if (cb) cb({ granted: false, error: String(err || 'Unknown error') }); },
    'APNSPush',
    'requestPermissions',
    []
  );
};

module.exports = new Push();
