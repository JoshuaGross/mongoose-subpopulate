Mongoose Subpopulate
====================

Mongoose-subpopulate was created for my needs on SpanDeX.io. It's monkey-patch of the populate Mongoose library for using MongoDB in Node.js apps. Subpopulate allows you to nest populate calls. 

It allows you to do this:

    m.User.find({}).populate('best_friend').populate('best_friend.best_friend').exec(function (err, result) {
        console.log('My BFF\'s BFF: ', result.best_friend.best_friend.username);
    });

Mongoose-subpopulate also allows you to ignore "err" in your callbacks:

    m.User.find({}).populate('best_friend').populate('best_friend.best_friend').exec(function (result) {
        console.log("My BFF's BFF: ", result.best_friend.best_friend.username);
    });

... and if you don't handle the errors, Mongoose-subpopulate will. Use a global exception handler like webkit-devtools-agent if you plan to do this.

Mongoose-subpopulate also handles ObjectIDs better than vanilla mongoose, and allows you to save a sub-object to another object without fear of it being cast to an ObjectId, as with vanilla Mongoose. 

Currently Mongoose-subpopulate is only working with Mongoose 2.7 (untested in Mongoose 3 because I haven't upgraded yet). If you need to use Mongoose 3, please fork, fix, and send me a pull request.

Installation
============

You know the drill: 

    npm install mongoose-subpopulate

Look at example.js to see how I use mongoose-subpopulate.
