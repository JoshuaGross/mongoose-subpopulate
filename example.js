/**
 * This is your server.js.
 */
var m = require('./models.js').createMongooseObject();
db = m.connect('mongodb://localhost/spandex-test', function () {
  console.log('connected to database');
  m.User.find({}).populate('best_friend').populate('best_friend.best_friend').exec(function (err, result) {
    console.log('My BFF\'s BFF: ', result.best_friend.best_friend.username);
  });
});

/**
 * This is models.js.
 */
var mongooseSubpopulate = require('./lib/mongoose-subpopulate.js');

// Defines models and places accessors into the mongoose object for each schema
var defineModels = function defineModels (mongoose, callback) {
  var Schema = function (schemaDictionary) {
    var schema = new mongoose.Schema(schemaDictionary);
    schema.virtual('id').get(function () {
      return this._id.toHexString();
    });

    return schema;
  };
  var ObjectId = mongoose.Schema.ObjectId;

  var UserSchema = Schema({
    'created': { type: Date, default: Date.now },
    'username': { type: String, required: true },
    'email': { type: String, index: {unique: true}, required: true },
    'password': { type: String },
    'best_friend': { type: ObjectId, ref: 'User' }
  });
  mongoose.model('User', UserSchema);

  mongoose.User = mongooseSubpopulate.wrapSchema(mongoose.model('User'));

  callback();
};

exports.createMongooseObject = function (callback) {
  exports.db = mongooseSubpopulate.extendMongoose(require('mongoose'), defineModels);
  return exports.db;
};
