var mongooseSubpopulate = require('../../');

// Defines models and places accessors into the mongoose object for each schema
var defineModels = function defineModels (mongoose, callback) {
  var Schema = mongoose.Schema;
  var ObjectId = mongoose.Schema.ObjectId;

  var ProjectSchema = new Schema({
    'title': { type: String, index: true },
    'owner': { type: ObjectId, ref: 'User', required: true },
    'main_document': { type: ObjectId, ref: 'Document' }
  });
  mongoose.model('Project', ProjectSchema);

  var DocumentSchema = new Schema({
    'project': { type: ObjectId, ref: 'Project', required: true },
    'body': String,
    'filename': String,
    'owner': { type: ObjectId, ref: 'User' }
  });
  mongoose.model('Document', DocumentSchema);

  // WARNING: `name` cannot be used as the name of any field 
  // see wrapSchema
  var UserSchema = new Schema({
    'username': { type: String, required: true },
    'email': { type: String, index: {unique: true}, required: true },
    'password': { type: String }
  });
  mongoose.model('User', UserSchema);

  // 
  mongoose.Document = mongooseSubpopulate.wrapSchema(mongoose.model('Document'));
  mongoose.User = mongooseSubpopulate.wrapSchema(mongoose.model('User'));
  mongoose.Project = mongooseSubpopulate.wrapSchema(mongoose.model('Project'));

  callback();
};

exports.createMongooseObject = function (callback) {
  exports.db = mongooseSubpopulate.extendMongoose(require('mongoose'), defineModels);

  var connectOrig = exports.db.connect;
  exports.db.connect = function (callback) {
    // TOP SECRET AND STUFF
    // move to a config file?
    if ('test' === process.env.NODE_ENV) {
      return connectOrig('mongodb://localhost/mongoose-subpopulate-test', callback);
    } else {
      throw new Error('This is only meant for testing.');
    }

    console.warn('Cannot connect to mongoose, unknown environment', process.env.NODE_ENV);
  };

  return exports.db;
};

exports.cache = function () {
  return exports.db.cache;
};
