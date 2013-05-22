var t = require('tap'),
    async = require('async'),
    redismemoriser = require('../lib/redismemoriser');

t.test('memory', function (t) {

  t.test('creating a memory', function (t) {
    var memory = Object.create(redismemoriser);
    t.ok(memory, 'Memory is truthy');
    t.ok(memory.set, 'Set is truthy');
    t.ok(memory.get, 'Get is truthy');
    memory.end(1);
    t.end();
  });

  t.test('setting & getting from the memory', function (t) {
    var memory = Object.create(redismemoriser);
    async.parallel({
      hello: function (done) { return memory.set('hello', 'sup', done); },
      test: function (done) { return memory.set('test', '1', done); }
    }, function (err) {
      t.notOk(err);
      async.parallel({
        hello: function (done) { return memory.get('hello', done); },
        test: function (done) { return memory.get('test', done); }
      }, function (err, results) {
        t.notOk(err);
        t.equal(results.hello, 'sup');
        t.equal(results.test, '1');
        memory.end(2);
        t.end();
      });
    });
  });

  t.test('no overwriting', function (t) {
    var memory = Object.create(redismemoriser);
    async.series([
      function (done) { return memory.set('hello', 'sup', done); },
      function (done) { return memory.set('hello', 'no', done); }
    ], function (err) {
      t.notOk(err);
      memory.get('hello', function (err, result) {
        t.notOk(err);
        t.equal(result, 'sup', 'No overwriting');
        memory.end();
        t.end();
      });
    });
  });

  t.end();

});