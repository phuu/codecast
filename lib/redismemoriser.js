var redis          = require("redis-url"),
    crypto         = require('crypto'),
    microtime      = require('microtime');

module.exports = {
  init: function (opts) {
    if (!this.prefix) this.prefix = this.createPrefix();
    if (!this.client) this.client = opts.client || redis.connect(opts.url);
  },
  createPrefix: function () {
    var shasum = crypto.createHash('sha1');
    shasum.update(''+microtime.now());
    return 'memo:' + shasum.digest('hex').substr(0, 7) + ':';
  },
  get: function (key, cb) {
    this.init();
    return this.client.get(this.prefix + key, cb);
  },
  set: function (key, value, cb) {
    this.init();
    this.client.get(this.prefix + key, function (err, reply) {
      if (err) return cb(err);
      if (reply !== null) return cb(null, null);
      return this.client.set(this.prefix + key, value, cb);
    }.bind(this));
  },
  end: function (id) {
    if (!this.client) return;
    this.client.quit();
  }
};