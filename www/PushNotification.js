var exec = require('cordova/exec');

function Push() {

    this.handlers = {
        registration: [],
        notification: [],
        error: []
    };

}

Push.prototype.on = function(event, callback) {

    if (this.handlers[event]) {
        this.handlers[event].push(callback);
    }

};

Push.prototype.emit = function(event, data) {

    if (!this.handlers[event]) return;

    this.handlers[event].forEach(function(cb) {
        try { cb(data); } catch(e){}
    });

};

Push.prototype.init = function(options) {

    var self = this;

    exec(function(msg){

        if(msg && msg.type) {
            self.emit(msg.type, msg.data);
        }

    }, function(err){

        self.emit('error', err);

    }, 'APNSPush', 'init', [options]);

    return self;

};

module.exports = new Push();