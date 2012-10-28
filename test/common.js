var expect = require('expect.js');

process.env.NODE_ENV = 'test';

// allow tests to connect to the DB
var m = null;
exports.db = function () {
  m = require('./fixtures/model.js').db;
  for (var i in m.cachedObjects) {
    delete m.cachedObjects[i];
  }
  return m;
};
exports.connectDB = function (callback) {
  if (!m) {
    var mongooseExtender = require('./fixtures/model.js');
    if (mongooseExtender.db) { // otherwise, connects twice for some reason
      m = mongooseExtender.db;
      callback();
    } else {
      m = require('./fixtures/model.js').createMongooseObject(callback);
    }
  } else {
    callback();
  }
};

exports.killDatabase = function (done) {
  var m = exports.db();
  m.User.find().remove(function (err, users) {
    m.Document.find().remove(function (err, documents) {
      m.Project.find().remove(function (err, projects) {
        done();
      });
    });
  });
};

before(function (done) {
  exports.connectDB(function () {
    exports.killDatabase(done);
  });
});

describe('common', function (){
  it('should grab a database connection', function (done) {
    exports.connectDB(function () {
      var m = exports.db();
      expect(m).to.not.be(undefined);
      done();
    });
  });
});
