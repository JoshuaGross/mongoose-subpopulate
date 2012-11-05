// This is a set of tests for our additions to the database layer
var expect = require('expect.js'),
    util   = require('util'),
    common = require('./common.js'),
    async = require('async');

before(function (done) {
  common.connectDB(function () {
    common.killDatabase(done);
  });
});

describe('mongoose helpers', function () {
  var stringID = '111122223333444455556666';
  var anotherID ='011222233334444555566667';
  it('should cast objects to strings properly', function (done) {
    var m = common.db();
    expect(m.toID({ _id: stringID })).to.be(stringID);
    expect(m.toID(stringID)).to.be(stringID);
    expect(m.toID({ some: 'properties', and: 'stuff' })).to.be(null);
    expect(m.toID(null)).to.be(null);
    expect(m.toID(undefined)).to.be(null);
    expect(m.toID([])).to.be(null);
    done();
  });
  it('should compare objects properly', function (done) {
    var m = common.db();
    
    expect(m.objectsEqual(stringID, anotherID)).to.be(false);
    expect(m.objectsEqual({ _id: stringID }, anotherID)).to.be(false);
    expect(m.objectsEqual({ _id: stringID }, { _id: anotherID })).to.be(false);
    expect(m.objectsEqual(stringID, { _id: anotherID })).to.be(false);

    expect(m.objectsEqual(stringID, stringID)).to.be(true);
    expect(m.objectsEqual({ _id: stringID }, stringID)).to.be(true);
    expect(m.objectsEqual({ _id: stringID }, { _id: stringID })).to.be(true);
    expect(m.objectsEqual(stringID, { _id: stringID })).to.be(true);

    done();
  });
});

describe('mongoose data object wrapper', function () {
  it('should allow access to _id as a string by default', function (done) {
    var m = common.db();
    var project = new m.Project();
    expect(project._id).to.not.be(undefined);
    expect(project._id).to.not.be(null);
    expect(typeof project._id).to.be('string');
    done();
  });
  it('should properly handle setting a sub-prop to an object', function (done) {
    var m = common.db();
    var proj = new m.Project();
    var owner = new m.User();
    owner.email = 'j@g.edu';
    owner.username = 'Jorsh';
    owner.save(function () {
      proj.owner = owner;
      expect(proj.owner).to.not.be(undefined);
      expect(proj.owner._id).to.not.be(undefined);
      proj.save(function () {
        m.User.findById(owner._id).exec(function (foundOwner) {
          expect(foundOwner).to.not.be(undefined);
          m.Project.findById(proj._id).populate('owner').exec(function (projFound) {
            expect(projFound).to.not.be(undefined);
            expect(projFound.owner).to.not.be(undefined);
            expect(projFound.owner._id).to.not.be(undefined);
            done();
          });
        });
      });
    });
  });
  it('should properly handle setting a sub-prop to a string ID', function (done) {
    // by default Mongoose doesn't support setting a string ID, you need to cast it to ObjectID
    var m = common.db();
    var proj = new m.Project();
    var owner = new m.User();
    proj.owner = owner._id;
    owner.email = 'k@g.edu';
    owner.username = 'Jorsh';
    owner.save(function () {
      proj.save(function () {
        m.Project.findById(proj._id).populate('owner').exec(function (projFound) {
          expect(projFound).to.not.be(undefined);
          expect(projFound.owner).to.not.be(undefined);
          expect(projFound.owner._id).to.not.be(undefined);
          done();
        });
      });
    });
  });
});
describe('mongoose wrapping of find, exec, etc', function () {
  var findOneID;

  it('should wrap all schemas with MakeSafe', function (done) {
    var m = common.db();
    expect(m.User).to.have.property('mSubpopulateWrappedConstructor');
    expect(m.Document).to.have.property('mSubpopulateWrappedConstructor');
    expect(m.Project).to.have.property('mSubpopulateWrappedConstructor');
    done();
  });
  
  // Normally the callback is function (err, results) and we just ensure that no error is passed in
  it('should wrap errors from find', function (done) {
    var m = common.db();
    var u = new m.User();
    u.email = 'l@g.edu';
    u.username = 'josh';
    u.save(function () {
      m.User.find().exec(function (users) {
        expect(users).to.not.be(undefined);
        for (var i in users) {
          expect(users[i]).to.have.property('_id');
          expect(users[i]._id).to.not.be(undefined);
          findOneID = users[i]._id;
        }
        done();
      });
    });
  });
  it('should wrap errors from findById', function (done) {
    var m = common.db();
    m.User.findById(findOneID, [], {}, function (user) {
      expect(user).to.not.be(undefined);
      expect(user).to.not.be(null);
      expect(user).to.have.property('_id');
      expect(user._id).to.not.be(undefined);
      done();
    });
  });
  it('should handle errors from findOne', function (done) {
    var m = common.db();
    // pass in invalid ID type
    try {
      m.User.findOne({ _id: [{rage:findOneID}] }, [], {}, function (user) {
        expect(false).to.be(true); // should not reach here
      });
    } catch (e) {
      var mongoose2_7 = (e.toString() === 'Error: Database error: findOne failed / Error: Invalid ObjectId')
      var mongoose3_x = (e.toString() === 'Error: Database error: findOne failed / TypeError: Invalid select() argument. Must be a string or object.')
      expect(mongoose2_7 || mongoose3_x).to.be(true);
      done();
    }
  });
  // TODO: rigorously test this
  //it('should handle errors from object creation', function (done) {
    //var m = common.db();
    // leave necessary fields empty
    //var u = new m.User();
    //u.save(done);
  //});
  it('should wrap errors from findOne', function (done) {
    var m = common.db();
    m.User.findOne({ _id: findOneID }, function (user) {
      expect(user).to.not.be(undefined);
      expect(user).to.not.be(null);
      expect(user).to.have.property('_id');
      expect(user._id).to.not.be(undefined);
      done();
    });
  });
  it('should support chaining', function (done) {
    var m = common.db();
    var project = new m.Project();
    project.owner = findOneID;
    project.save(function () {
      var findChain = m.Project.findOne({ _id: project._id });
      expect(typeof(findChain.populate)).to.be('function');

      var findChainPopulate = findChain.populate('owner');
      expect(findChainPopulate).to.have.property('mSubpopulateWrappedConstructor');
      expect(typeof(findChainPopulate.exec)).to.be('function');

      findChainPopulate.exec(function (projectInner) {
        expect(projectInner).to.not.be(undefined);
        expect(projectInner).to.not.be(null);
        expect(projectInner).to.have.property('owner');
        expect(projectInner.owner).to.not.be(undefined);
        expect(projectInner.owner).to.have.property('_id');
        expect(projectInner.owner._id).to.not.be(undefined);
        done();
      });
    });
  });
  it('should allow traditional save callback', function (done) {
    var m = common.db();
    var project = new m.Project();
    project.owner = findOneID;
    project.save(function (err, result) {
      expect(err).to.be(null);
      expect(result).to.not.be(undefined);
      expect(result).to.have.property('_id');
      done();
    });
  });
  it('should wrap calls to save', function (done) {
    var m = common.db();
    var project = new m.Project();
    project.owner = findOneID;
    project.save(function (result) {
      expect(result).to.not.be(undefined);
      expect(result).to.have.property('_id');
      done();
    });
  });
});
describe('mongoose additions for population', function () {
  var projectID;
  // TODO: ensure this works with just .find(), .run(), etc
  it('should not cast objects to useless stubs; silly mongoose', function (done) {
    var m = common.db();
    var project = new m.Project();
    var main_document = new m.Document();
    project.main_document = main_document;
    expect(project.main_document._id).to.not.be(null);
    expect(project.main_document._id).to.not.be(undefined);
    expect(typeof project.main_document._id).to.be('string');
    done();
  });
  it('should allow sub-objects to be manipulated and saved', function (done) {
    var m = common.db();
    var project = new m.Project();
    var main_document = new m.Document();
    project.main_document = main_document;
    projectID = project._id;
    main_document.filename = '1.tex';
    main_document.project = project;
    main_document.owner = new m.User();
    main_document.owner.username = 'Jash';
    main_document.owner.email = 'm@g.edu';
    main_document.project.owner = main_document.owner;
    main_document.owner.save(function (u) {
      main_document.save(function (doc) {
        project.save(function (_project) {
          expect(typeof project.main_document).to.be('object');
          expect(typeof project.main_document._id).to.be('string');
          expect(typeof _project.main_document).to.be('string');
          expect(typeof _project.main_document._id).to.be('undefined'); // not desirable, but "correct" since we're not caching populatedObjects
          expect(project.main_document.filename).to.be('1.tex');
          project.main_document.filename = '2.tex';
          expect(project.main_document.mongooseLink.filename).to.be('2.tex');
          project.main_document.save(function (doc) {
            expect(doc.filename).to.be('2.tex');
            expect(project.main_document.filename).to.be('2.tex');
            done();
          });
        });
      });
    });
  });
  it('should allow populated sub-objects to be manipulated and saved through parent', function (done) {
    var m = common.db();
    m.Project.findById(projectID).populate('main_document').exec(function (project) {
      expect(project.main_document.filename).to.be('2.tex');
      project.main_document.filename = '3.tex';
      project.save(function () {
        project.main_document.save(function () {
          expect(project.main_document.filename).to.be('3.tex');
          m.Project.findById(projectID).populate('main_document').exec(function (_project) {
            expect(typeof _project.main_document).to.be('object');
            expect(_project.main_document.filename).to.be('3.tex');
            done();
          });
        });
      });
    });
  });
  it('should support sub-population', function (done) {
    var m = common.db();
    m.Project.findById(projectID).populate('main_document').populate('main_document.owner').exec(function (project) {
      expect(typeof project._id).to.be('string');
      expect(typeof project.main_document._id).to.be('string');
      expect(typeof project.main_document.owner._id).to.be('string');
      expect(project.main_document.owner.username).to.be('Jash');
      done();
    });
  });
  it('should support sub-population manipulation through grandparent', function (done) {
    var m = common.db();
    m.Project.findById(projectID).populate('main_document').populate('main_document.owner').exec(function (project) {
      expect(typeof project._id).to.be('string');
      expect(typeof project.main_document._id).to.be('string');
      expect(typeof project.main_document.owner._id).to.be('string');
      project.main_document.owner.username = 'Josh';
      project.save(function () {
        expect(project.main_document.owner.username).to.be('Josh');
        expect(project.main_document.owner.mongooseLink.username).to.be('Josh');
        project.main_document.owner.save(function () {
          done();
        });
      });
    });
  });
  it('should verify that subdocument modifications stuck through cascade save', function (done) {
    var m = common.db();
    m.Project.findById(projectID).populate('main_document').populate('main_document.owner').exec(function (project) {
      expect(project.main_document.owner.username).to.be('Josh');
      done();
    });
  });
});
describe('mongoose additions bugs', function () {
  it('should not crash when setting a property to undefined', function (done) {
    var m = common.db();
    var project = new m.Project();
    project.owner = undefined;
    done();
  });
  it('should not crash when setting a property to null', function (done) {
    var m = common.db();
    var project = new m.Project();
    project.owner = null;
    done();
  });
  it('should not crash when searching for an object [instead of ID] in findById', function (done) {
    var m = common.db();
    var project = new m.Project();
    project.owner = new m.User();
    project.save(function () {
      m.Project.findById(project).exec(function (p) {
        expect(p).to.not.be(undefined);
        expect(p).to.not.be(null);
        expect(typeof p._id).to.be('string');
        done();
      });
    });
  });
  it('should not crash when searching for an object [instead of ID] as property', function (done) {
    var m = common.db();
    var project = new m.Project();
    var u = new m.User();
    u.username = 'gruggs';
    u.email = 'gruggs@kanatzid.is';

    u.save(function () {
      project.owner = u;
      project.save(function () {
        m.Project.find({owner: u}).exec(function (p) {
          expect(p).to.not.be(undefined);
          expect(p).to.not.be(null);
          expect(p).to.not.be([]);
          expect(typeof p[0]._id).to.be('string');
          done();
        });
      });
    });
  });
  it('should not crash when you search for a non-existent field', function (done) {
    var m = common.db();
    var project = new m.Project();
    var u = new m.User();
    u.username = 'gruggs';
    u.email = 'gruggs2@kanatzid.is';

    u.save(function () {
      project.owner = u;
      project.save(function () {
        try {
          m.Project.find({does_not_exist: u}).exec(function (p) {
            expect(false).to.be(true);
          });
        } catch (e) {
          expect(e.toString()).to.match(/Bad path/);
          done();
        }
      });
    });
  });
});
describe('mongoose large record handling', function () {
  var doc;
  var project;
  it('should set up multiple-level populate', function (done) {
    var m = common.db();
    project = new m.Project();
    project.owner = new m.User();
    project.title = 'The Coolest Project';
    project.save(function () {
      doc = new m.Document();
      doc.project = project;
      doc.save(function () {
        done();
      });
    });
  });
  it('should be able to create large amounts of records', function (done) {
    this.timeout(0);
    var m = common.db();
    var ids = [];
    for (var i = 0; i < 1000; i++) {
      ids[i] = i;
    }
    async.forEachLimit(ids, 20, function (i, iter) {
      var u = new m.User();
      u.username = 'username__'+i;
      u.email = 'test'+(500+i)+'@test.edu';
      u.favorite_document = doc;
      u.save(function () {
        iter(null);
        u = null;
      });
    }, function (err) {
      done();
    });
  });
  it('should be able to fetch large amounts of records', function (done) {
    this.timeout(0);
    var m = common.db();
    console.time('get users');
    m.User.find().exec(function (users) {
      console.timeEnd('get users');
      expect(users.length).to.be.greaterThan(1000);
      console.time('resave users');
      async.map(users, function (u, iterate) {
        var newEmail = u.email+'.uk';
        u.email = newEmail;
        u.save(function (err, newU) {
          expect(newU.email).to.be(newEmail);
          iterate(null, null);
        });
      }, function () {
        console.timeEnd('resave users');
        done();
      });
    });
  });
  it('should be able to fetch and populate large amounts of records', function (done) {
    this.timeout(0);
    var m = common.db();
    console.time('get users');
    m.User.find({ favorite_document: { $ne: null } }).populate('favorite_document').exec(function (users) {
      console.timeEnd('get users');
      expect(users.length).to.be(1000);
      console.time('resave users');
      async.map(users, function (u, iterate) {
        expect(!!u.favorite_document).to.be(true);
        var newEmail = u.email+'.uk';
        u.email = newEmail;
        u.save(function (err, newU) {
          expect(newU.email).to.be(newEmail);
          iterate(null, null);
        });
      }, function () {
        console.timeEnd('resave users');
        done();
      });
    });
  });
  it('should be able to fetch and sub-populate large amounts of records', function (done) {
    this.timeout(0);
    var m = common.db();
    console.time('get users');
    m.User.find({ favorite_document: { $ne: null } }).populate('favorite_document').populate('favorite_document.project').exec(function (users) {
      console.timeEnd('get users');
      expect(users.length).to.be(1000);
      console.time('resave users');
      async.map(users, function (u, iterate) {
        expect(!!u.favorite_document.project).to.be(true);
        var newEmail = u.email+'.uk';
        u.email = newEmail;
        u.save(function (err, newU) {
          expect(newU.email).to.be(newEmail);
          iterate(null, null);
        });
      }, function () {
        console.timeEnd('resave users');
        done();
      });
    });
  });
});
