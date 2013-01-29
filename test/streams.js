// Test that Mongoose streams work properly
var expect = require('expect.js'),
    util   = require('util'),
    common = require('./common.js'),
    async = require('async');

before(function (done) {
  common.connectDB(function () {
    common.killDatabase(done);
  });
});

describe('mongoose streams', function () {
  it('should create many users', function (done) {
    var m = common.db();
    var emails = [];
    for (var i = 0; i < 10; i++) {
      emails.push('josh'+i+'@spandex.io');
    }
    async.map(emails, function (email, done) {
      var owner = new m.User();
      owner.email = email;
      owner.username = 'Streams Jorsh '+email;
      owner.save(done)
    }, done)
  });
  it('should be able to stream users', function (done) {
    var m = common.db();
    var query = m.User.find({ username: /^Streams Jorsh/ });
    var stream = query.stream();

    var usersFound = 0;

    stream.on('data', function (user) {
      expect(typeof user.getBare).to.be('function');
      usersFound++;
    });
    stream.on('close', function () {
      expect(usersFound).to.be(10);
      done();
    })
  });
});

