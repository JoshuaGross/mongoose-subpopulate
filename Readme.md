Mongoose Subpopulate
====================

A monkey-patch of the populate Mongoose library for using MongoDB in Node.js apps. Subpopulate allows you to nest populate calls. 

It allows you to do this:

    m.User.find({}).populate('best_friend').populate('best_friend.best_friend').exec(function (err, result) {
        console.log('My BFF\'s BFF: ', result.best_friend.best_friend.username);
    });

Installation
============

You know the drill: 

    npm install mongoose-subpopulate

Look at example.js to see how I use mongoose-subpopulate.
