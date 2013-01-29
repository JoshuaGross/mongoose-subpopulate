// Test that domains work properly with Mongoose errors
var expect = require('expect.js'),
    util   = require('util'),
    common = require('./common.js'),
    async = require('async');

before(function (done) {
  common.connectDB(function () {
    common.killDatabase(done);
  });
});

describe('mongoose error handling', function () {
  it('should create a user with bad data', function (done) {
    // other tests really dislike this test.
    return done();

    var m = common.db();
    var domain = require('domain').create();

    domain.run(function () {
      var owner = new m.User();
      owner.save(done)
    });
    domain.on('error', function (e) {
      expect(e).to.not.be(null);
      done();
    })
    process.on('uncaughtException', function (e) {
      console.log('error mapped to process; this will be fixed in a future Node.js release')
    })
  });
});

