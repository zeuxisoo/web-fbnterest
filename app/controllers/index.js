var sanitize = require('validator').sanitize,
	passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy;

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
}

module.exports.index = function(app, db, config) {
	passport.use(new FacebookStrategy({
		clientID: config.facebookAppId,
		clientSecret: config.facebookAppSecretKey,
		callbackURL: config.siteUrl + "/auth/facebook/callback"
	}, function(accessToken, refreshToken, profile, done) {
		var userModel = db.model('user');

		userModel.findOne({ facebookId: profile.id }, function (error, user) {
			if (user) {
				return done(error, user);
			}else{
				var user = new userModel();
				user.facebookId = profile.id;
				user.username = profile.username;
				user.displayName = profile.displayName;
				user.profileUrl = profile.profileUrl;
				user.emails = profile.emails.shift().value;
				user.save();

				return done(error, profile);
			}
		});
	}));

	app.get('/', function(req, res) {
		res.render('index', {
			user: req.user
		});
	});

	app.get('/is-signed', function(req, res) {
		if (req.user) {
			res.json({ signed: true });
		}
		res.json({ signed: false });
	});

	app.get('/signin', function(req, res) {
		res.redirect('/auth/facebook');
	});

	app.get('/signout', function(req, res){
		req.logout();
		res.redirect('/');
	});

	app.get('/auth/facebook', passport.authenticate('facebook', {
		scope: ['email', 'user_photos', 'offline_access']
	}), function(req, res) {
		// will not be called
	});

	app.get('/auth/facebook/callback', passport.authenticate('facebook', {
			failureRedirect: config.siteUrl
	}), function(req, res) {
		res.redirect('/');
	});

	app.get('/album/:facebookId', function(req, res, next) {
		var facebookId = req.params.facebookId,
			userModel = db.model('user');

		userModel.findOne({ facebookId: facebookId }, function(error, user) {
			if (!user) {
				next(new Error('Not found user album'));
			}else{
				req.flash('siteTitle', user.displayName + "' Albums");
				req.flash('facebookMetaUrl', config.siteUrl + '/album/' + facebookId);

				res.render('album', {
					facebookId: facebookId,
					profileUrl: user.profileUrl,
					displayName: user.displayName,
					content: new Buffer(user.containerHtml, 'base64').toString('ascii')
				});
			}
		});
	});

	app.post('/generate', ensureAuthenticated, function(req, res) {
		var user = req.user,
			userModel = db.model('user'),
			container_code = sanitize(req.body.container_code).xss().replace(/\[removed\]/g, '');

		var content = new Buffer(container_code).toString('base64');

		if (!user.facebookId) {
			user.facebookId = user.id;
		}

		userModel.update({ facebookId: user.facebookId }, {
			$set: {
				containerHtml: content,
				update_at: new Date()
			}
		}, function(error) {
			if (error) {
				res.json({ action: 'update', status: false, facebookId: user.facebookId });
			}else{
				res.json({ action: 'update', status: true, facebookId: user.facebookId });
			}
		});
	});

	app.get('/delete/:facebookId', function(req, res, next) {
		var facebookId = req.params.facebookId,
			userModel = db.model('user');

		userModel.findOne({ facebookId: facebookId }, function(error, user) {
			if (!user) {
				next(new Error('Not found user to delete'));
			}else{
				user.remove();

				userModel.count({ facebookId: facebook }, function(error, count) {
					if (count > 0) {
						res.send("FacebookId: " + facebookId + " can not remove");
					}else{
						res.send("FacebookId: " + facebookId + " removed");
					}
				});
			}
		});
	});
}