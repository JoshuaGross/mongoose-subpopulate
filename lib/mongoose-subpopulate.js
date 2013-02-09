/**
 * Mongoose-subpopulate by Joshua Gross
 *
 * josh@spandex.io
 *
 * Started June, 2012.
 *
 * Released under the MIT license.
 */

var async = require('async');

var mongoose;

// Make Mongoose schema objects "safe", so that you don't always have to deal with 'err'
// in your callbacks. If there are any database errors, an exception will be thrown immediately
// so user code does not have to deal with errors directly.
// This will also wrap all returned objects and allow subpopulates in queries.
var wrapSchema = exports.wrapSchema = function wrapSchema (schema) {
  schema.populateStack = schema.populateStack || [];

  var db_callback =
   function (errMsg, callback) {
     if (callback.length > 2) {
       throw new Error('Database error: '+errMsg+' / callback expects more than 2 arguments');
     }
     return function (err, result) {
        if (callback.length === 2) {
          wrapModelObject(result, function (wrapped) {
            return callback(err, wrapped);
          });
        } else if (err) {
          throw new Error('Database error: '+errMsg+' / '+err);
        } else {
          wrapModelObject(result, function (wrapped) {
            return callback(wrapped);
          });
        }
     };
  };

  // Verify that conditions are valid for this schema, or throw Error
  var verifyConditions = function verifyConditions (conditions) {
    for (var path in conditions) {
      verifyPath(path);
    }
  };

  // Verify that a given path is valid and exists for this schema, or throw Error
  // For now we just care about the first atom of the path
  var verifyPath = function verifyPath (path) {
    if (path.indexOf('$') === 0) {
      return;
    }

    // TODO: this is duplicated twice, fix
    var splitPath = path.split('.');
    var fieldType = schema.modelName || schema.model.modelName;
    var traversedPath = '';
    for (var j in splitPath) {
      // Look up record for this particular field
      var field = mongoose.model(fieldType).schema.paths[splitPath[j]];
      if (!field || !field.options) {
        throw new Error('Bad path '+path);
      }
      fieldType = field.options.ref;
      if (typeof fieldType === 'undefined' && splitPath[j+1]) {
        throw new Error('Bad path '+path);
      }
    }
    return;
  };

  if (schema.findById && !schema.findById.mSubpopulateWrapped) {
    var findByIdOrig = schema.findById;
    schema.findById = function findByIdWrapped (idIn, fields, options, callback) {
      ('function' === typeof fields && (callback = fields) && (fields = undefined));
      ('function' === typeof options && (callback = options) && (options = undefined));
      var wrapCallback = (callback ? db_callback('findById failed', callback) : null);
      var id = mongoose.toID(idIn);
      if (id === null) {
        throw new Error('Invalid database ID passed to findById: '+idIn);
      }
      try { 
        return wrapSchema(findByIdOrig.call(schema, id, wrapCallback));
      } catch (mongooseError) {
        wrapCallback(mongooseError);
      }
    };
    schema.findById.mSubpopulateWrapped = true;
  }
  if (schema.init && !schema.init.mSubpopulateWrapped) {
    var initOrig = schema.init;
    schema.init = function initWrapped (obj, callback) {
      var wrapCallback = (callback ? db_callback('init failed', callback) : null);
      return wrapModelObject(initOrig.call(schema, (obj && obj.mongooseLink ? obj.mongooseLink : obj), wrapCallback));
    };
    schema.init.mSubpopulateWrapped = true;
  }
  if (schema.count && !schema.count.mSubpopulateWrapped) {
    var countOrig = schema.count;
    schema.count = function countWrapped (conditions, callback) {
      ('function' === typeof conditions && (callback = conditions) && (conditions = undefined));
      var wrapCallback = (callback ? db_callback('count failed', callback) : null);
      try {
        return wrapSchema(countOrig.call(schema, conditions, wrapCallback));
      } catch (mongooseError) {
        wrapCallback(mongooseError);
      }
    };
    schema.count.mSubpopulateWrapped = true;
  }
  if (schema.distinct && !schema.distinct.mSubpopulateWrapped) {
    var distinctOrig = schema.distinct;
    schema.distinct = function distinctWrapped (field, conditions, callback) {
      ('function' === typeof conditions && (callback = conditions) && (conditions = undefined));
      var wrapCallback = (callback ? db_callback('distinct failed', callback) : null);
      try {
        return wrapSchema(distinctOrig.call(schema, field, conditions, wrapCallback));
      } catch (mongooseError) {
        wrapCallback(mongooseError);
      }
    };
    schema.distinct.mSubpopulateWrapped = true;
  }
  if (schema.find && !schema.find.mSubpopulateWrapped) {
    var findOrig = schema.find;
    schema.find = function findWrapped (conditions, fields, options, callback) {
      ('function' === typeof fields && (callback = fields) && (fields = undefined));
      ('function' === typeof options && (callback = options) && (options = undefined));
      var wrapCallback = (callback ? db_callback('find failed', callback) : null);
      verifyConditions(conditions);
      try {
        var findResult = findOrig.call(schema, conditions, fields, options, wrapCallback);
        var findSchemaWrapped = wrapSchema(findResult);
        return findSchemaWrapped;
      } catch (mongooseError) {
        wrapCallback(mongooseError);
      }
    };
    schema.find.mSubpopulateWrapped = true;
  }
  if (schema.findOne && !schema.findOne.mSubpopulateWrapped) {
    var findOneOrig = schema.findOne;
    schema.findOne = function findOneWrapped (conditions, fields, options, callback) {
      ('function' === typeof fields && (callback = fields) && (fields = undefined));
      ('function' === typeof options && (callback = options) && (options = undefined));
      var wrapCallback = (callback ? db_callback('findOne failed', callback) : null); 
      verifyConditions(conditions);
      try {
        return wrapSchema(findOneOrig.call(schema, conditions, fields, options, wrapCallback));
      } catch (mongooseError) {
        console.log(mongooseError.stack);
        wrapCallback(mongooseError);
      }
    };
    schema.findOne.mSubpopulateWrapped = true;
  }

  if (schema.save && !schema.save.mSubpopulateWrapped) {
    var saveOrig = schema.save;
    schema.save = function saveWrapped (callback) {
      var wrapCallback = (callback ? db_callback('save failed', callback) : null); // TODO: guarantee that there is a callback fn
      try {
        return saveOrig.call(schema, wrapCallback);
      } catch (mongooseError) {
        wrapCallback(mongooseError);
      }
    };
    schema.save.mSubpopulateWrapped = true;
  }

  if (schema.populate && !schema.populate.mSubpopulateWrapped) {
    var populateOrig = schema.populate;
    schema.populate = function populateWrapped (path, fields, conditions, options) {
      schema.populateStack.push(path);
      verifyPath(path);
      return wrapSchema(populateOrig.call(schema, path, fields, conditions, options));
    };
    schema.populate.mSubpopulateWrapped = true;
  }
  if (schema.sort && !schema.sort.mSubpopulateWrapped) {
    var sortOrig = schema.sort;
    schema.sort = function sortWrapped (sort) {
      return wrapSchema(sortOrig.call(schema, sort));
    };
    schema.sort.mSubpopulateWrapped = true;
  }
  if (schema.skip && !schema.sort.mSubpopulateWrapped) {
    var skipOrig = schema.skip;
    schema.skip = function skipWrapped (skip) {
      return wrapSchema(skipOrig.call(schema, skip));
    };
    schema.skip.mSubpopulateWrapped = true;
  }
  if (schema.limit && !schema.limit.mSubpopulateWrapped) {
    var limitOrig = schema.limit;
    schema.limit = function limitWrapped (limit) {
      return wrapSchema(limitOrig.call(schema, limit));
    };
    schema.limit.mSubpopulateWrapped = true;
  }
  if (schema.select && !schema.select.mSubpopulateWrapped) {
    var selectOrig = schema.select;
    schema.select = function selectWrapped (selectString) {
      return wrapSchema(selectOrig.call(schema, selectString));
    };
    schema.select.mSubpopulateWrapped = true;
  }
  if (schema.exec && !schema.exec.mSubpopulateWrapped) {
    var execOrig = schema.exec;
    schema.exec = function execWrapped (callback) {
      if (!callback) {
        throw new Error('exec must be called with a callback function');
      }
      var wrapCallback = (callback ? db_callback('exec failed', callback) : null); // TODO: guarantee that there is a callback fn

      // postExec is where we double-check that all populate paths have been looked up
      // Mongoose does not support subpopulating in non-embedded documents so we take care of that here
      // TODO: verify all these paths
      // TODO: support embedded documents and arrays here
      // TODO: sub-sub populate
      var postExec = function postExec (err, result) {
        if (result) {
          async.forEach(schema.populateStack, function (path, iter) {
            var splitPath = path.split('.');
            var cursor = result;
            var cursorType = schema.modelName || schema.model.modelName;
            var traversedPath = '';
            for (var j in splitPath) {
              var parentCursor = cursor;
              cursor = cursor[splitPath[j]];
              cursorType = mongoose.model(cursorType).schema.paths[splitPath[j]].options.ref;
              if (typeof cursor == 'string') {
                // We traversed the `traversedPath`, now we must grab what is in splitPath[j]
                mongoose[cursorType].findById(cursor).exec(function (cursorObject) {
                  parentCursor[splitPath[j]] = cursorObject;
                  iter();
                });
                return;
              } else if (typeof cursor == 'undefined') {
                iter();
                return; // can't do anything, some ID hasn't even been set
              } else {
                traversedPath += (traversedPath ? '.' : '') + splitPath[j];
              }
            }
            iter();
          }, function () {
            schema.populateStack = {};
            wrapCallback(err, result);
          });
        } else {
          wrapCallback(err, result);
        }
        return;
      };

      try {
        return execOrig.call(schema, postExec);
      } catch (mongooseError) {
        console.log(mongooseError.trace);
        console.log(mongooseError.stack);
        wrapCallback(mongooseError);
      }
    };
    schema.exec.mSubpopulateWrapped = true;
  }

  if (schema.stream && !schema.stream.mSubpopulateWrapped) {
    var streamOrig = schema.stream;
    schema.stream = function streamWrapped () {
      var wrappedRes = wrapSchema(streamOrig.apply(schema, arguments));
      var dataListeners = [];
      var wrapDataEvents = function (data) {
        var wrappedData = wrapModelObject(data);
        dataListeners.map(function (listener) {
          listener(wrappedData);
        });
      };
      wrappedRes.on('data', wrapDataEvents);
      var onOrig = wrappedRes.on;
      wrappedRes.on = function (type, fn) {
        if (type === 'data') {
          dataListeners.push(fn);
        } else {
          onOrig.call(wrappedRes, type, fn);
        }
      };
      return wrappedRes;
    };
  }

  schema.mSubpopulateWrapped = true;

  // Wrap constructor
  // We only do this so that, fex, user.save() can be wrapped by wrapSchema
  // Keep in mind that Mongoose internals do not see this; only "user" code like
  // controllers, libraries outside of Mongoose, etc.
  if (!schema.mSubpopulateWrappedConstructor && 'function' === typeof schema) {
    var newSchema = function wrappedSchemaConstructor (doc, fields) {
      var schemaObj = new schema(doc, fields);
      var safeSchemaInst;
      this.__proto__ = schemaObj;
      safeSchemaInst = wrapSchema(this);
      safeSchemaInst = wrapModelObject(this);

      // NOTE: for whatever reason, any fields named "name" get wiped out. We need this
      // for our users collection. (`name` is wiped out by wrapSchema, evidently)
      
      return safeSchemaInst;
    };
    newSchema.__proto__ = schema;
    newSchema.prototype.__proto__ = schema;
    newSchema.mSubpopulateWrappedConstructor = true;

    for (var i in schema) {
      if (schema.hasOwnProperty(i) && !newSchema[i]) {
        newSchema[i] = schema[i];
      }
    }

    return newSchema;
  } else { 
    schema.mSubpopulateWrappedConstructor = true;
  }

  return schema;
}

// library - get details of calling function
function getCallerDetails () {
  // We generate an exception so we can peek at the stack trace and get details of the file/function that called us.
  // (What a fun piece of code!)
  try {
    i.dont.exist=0;
  } catch (e) {
    var stack = e.stack.split('\n');
    var callerDetails = stack[3].split(/\s/);
    var callerFile = callerDetails[callerDetails.length - 1];
    return { file: callerFile };
  }
}

// Here we wrap individual data objects to abstract them in a few nice ways:
// 1) Directly access the _id attribute as a string
// 2) Get and set attributes of the object; all changes are synced immediately with the mongoose link
// 3) Get a bare dictionary of the model and any populated descendants 
function wrapModelObject (object, cacheData, callback) {
  if ('function' === typeof cacheData) {
    callback = cacheData, cacheData = {};
  }
  cacheData = cacheData || {};

  if (object === null || object === undefined || 'number' === typeof object || object.mongooseLink) {
    return (callback ? callback(object, cacheData) : object);
  }

  // Is this an array?
  if (!object._schema /* 2.7 */ && !object.schema /* 3.x */) {
    if (callback) {
      return wrapModelObject(object[0], function (__wrapped, wrapCachedMetadata) {
        async.map(object, function (obj, iterate) {
          if (obj && (obj._schema || obj.schema)) {
            process.nextTick(function () {
              wrapModelObject(obj, wrapCachedMetadata, function (wrappedObject) {
                iterate(null, wrappedObject);
              });
            });
          } else {
            iterate(null, obj);
          }
        }, function (err, wrappedObject) {
          return callback(wrappedObject);
        });
      });
    } else {
      for (var i in object) {
        if (object[i] && (object[i]._schema || object[i].schema)) {
          object[i] = wrapModelObject(object[i]);
        }
      }
      return object;
    }
  }

  var wrappedObject = new (function wrapped () {})();
  wrappedObject.mongooseLink = object;
  wrappedObject.populatedObjects = {};
  
  var wrapPrototype = {
    0: /*wrapFunction*/ function (attr) {
      wrappedObject.__proto__[attr] = function () {
        return object[attr].apply(object, arguments);
      }
    },
    1: /*wrapAttribute*/ function (attr) {
      wrappedObject.__proto__.__defineGetter__(attr, function () {
        return object[attr];
      });
    }
  };
  if (!cacheData.protoGetters) {
    cacheData.protoGetters = {};
    for (var i in object) {
      if (typeof object[i] === 'function') {
        if ((i.substr(0,2) !== 'to' || i === 'toObject') && 'inspect' !== i) {
          cacheData.protoGetters[i] = 0;
        }
      } else {
        cacheData.protoGetters[i] = 1;
      }
    }
  }
  for (var i in cacheData.protoGetters) {
    wrapPrototype[cacheData.protoGetters[i]](i);
  }

  // Getters and setters for all schema attributes
  var schema = (object._schema || object.schema).paths;
  for (var i in schema) {
    (function (attr) {
      wrappedObject.__proto__.__defineGetter__(attr, function () {
        // Sometimes the object will have an undefined value, but something is hanging out in object._docs
        ('undefined' === typeof object[attr] && 'undefined' !== typeof object._doc && 'undefined' !== typeof object._doc[attr]) && (object[attr] = object._doc[attr]);

        // If our caller is in a Mongoose library, then just return the object attribute directly - 
        // we don't want to screw with Mongoose internals too much
        if (getCallerDetails().file.indexOf('/mongoose/') !== -1) {
          return object[attr];
        }

        if ('ObjectID' === schema[attr].instance) {
          var objectKey = ((object[attr] ? object[attr]._id : false) || object[attr]);
          objectKey = (objectKey && objectKey.toHexString ? objectKey.toHexString() : objectKey);
          var linkedObject = wrappedObject.populatedObjects[objectKey];
          if (linkedObject && '_id' !== attr) {
            // Don't return a string if it's a reference to another object that's in memory
            return linkedObject;
          } else if (schema[attr].options.ref && object[attr] && (object[attr]._schema || object[attr].schema)) {
            // Object should be linked, but was populated and hasn't been linked yet
            // TODO: remove this if it's redundant
            wrappedObject.populatedObjects[objectKey] = wrapModelObject(object[attr]);
            return wrappedObject.populatedObjects[objectKey];
          } else {
            // Allow _id, etc to be accessed directly as a string
            return (object[attr] && object[attr].toHexString ? object[attr].toHexString() : object[attr]);
          }
        } else {
          return object[attr];
        }
      });
      wrappedObject.__proto__.__defineSetter__(attr, function (value) {
        // Cache object references; Mongoose casts them to IDs and they're sort of lost.
        if (value && value.mongooseLink) {
          wrappedObject.populatedObjects[value._id] = value;
          object[attr] = value.mongooseLink;
          object.set(attr, value.mongooseLink);
        } else {
          object[attr] = value;
          object._doc[attr] = value;
          object.set(attr, value);
          wrappedObject.set(attr, value);
        }
      });
    })(i);
  }

  // Allow all methods (from plugins, etc) to be accessed
  for (var i in wrappedObject.schema.methods) {
    (function (methodName) {
      wrappedObject.__proto__[methodName] = wrappedObject.schema.methods[methodName];
    })(i);
  }

  wrappedObject.__proto__.getBare = function (keys, callback) {
    if ('function' === typeof keys) {
      callback = keys;
      keys = undefined;
    }

    var keys = keys || Object.keys(wrappedObject.schema.paths);

    var bareDictionary = {};
    async.map(keys, function (i, iter) {

      // Instead of passing a string, you can pass a dictionary in the form:
      // { 'populated_collection_ref': ['list', 'of', 'subfields'] }
      var subfields = undefined;
      if ('string' !== typeof i) {
        for (var collection in i) {
          subfields = i[collection];
          i = collection;
          break;
        }
      }

      var referencedObject = wrappedObject[i];
      if ('undefined' !== typeof referencedObject) {
        if (referencedObject && referencedObject.getBare) {
          referencedObject.getBare(subfields, function (err, dict) {
            bareDictionary[i] = dict;
            iter(null);
          });
        } else {
          bareDictionary[i] = referencedObject;
          iter(null);
        }
      } else {
        iter(null);
      }
    }, function () {
      callback(null, bareDictionary);
    });
  };

  return (callback ? callback(wrappedObject, cacheData) : wrappedObject);
}
exports.extendMongoose = function (mongooseIn, defineModels) {
  mongoose = mongooseIn;

  var connect_orig = mongoose.connect;
  var createConnection_orig = mongoose.createConnection;

  mongoose.hasConnected = false;

  mongoose.connect = function (url, options, callback) {
    ('function' === typeof options && (callback = options) && (options = {}));
    connect_orig.call(mongoose, url, options || {}, function (err) {
      if (err) {
        console.warn('Failed to connect to Mongoose database', err);
        process.exit();
      } else if (mongoose.hasConnected) {
        console.warn('Mongoose connect callback already happened');
        return console.trace();
      } else {
        console.log('Successfully connected to Mongoose database');
        mongoose.hasConnected = true;
        return defineModels(mongoose, callback);
      }
    });
  };

  mongoose.createConnection = function (url, options, callback) {
    var res = createConnection_orig.call(mongoose, url, options);
    async.map(res, function (item, done) {
      defineModels(item, done);
    }, function () {
      callback();
    });
  };

  exports.db = mongoose;

  // Supports object comparison by ID; object passed in can be actual object or ID,
  // so you don't need to worry about whether a field has been populated yet, and the
  // wrapped data objects always return strings for IDs instead of wrapped object IDs
  mongoose.toID = function (obj) {
    var str = (obj ? (obj._id ? obj._id : obj) : null);
    if (null === str) return null;
    if (str.toHexString) str = str.toHexString(); // for ObjectID type in Mongoose
    if (str && (str.toString()).match(/^[a-zA-Z0-9]+$/) && str.length === 24) return str;
    return null;
  };
  mongoose.toObjectID = function (obj) {
    return new mongoose.Types.ObjectId(mongoose.toID(obj));
  };
  mongoose.objectsEqual = function (obj1, obj2) {
    return mongoose.toID(obj1) === mongoose.toID(obj2);
  };

  return mongoose;
};
