var express = require('express'),
	passport = require('passport'),
	mongoose = require('mongoose');

var appDirectory = __dirname + "/app",
	configsDriectory = __dirname + "/configs",
	controllers = require(appDirectory + '/controllers'),
	appConfig = require(configsDriectory + '/app');

var	app = module.exports = express.createServer(),
	db = mongoose.connect(appConfig.mongoDSN);

// Configuration
app.configure(function(){
	app.set('views', appDirectory + '/views');
	app.set('view engine', 'jade');
	app.set('view options', {
		pretty: true,
		layout: "layout/layout.jade"
	});
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'your secret here' }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(express.csrf());
	app.use(require('stylus').middleware({
		debug: true,
		src: __dirname + '/public'
	}));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	app.use(express.errorHandler());
});

app.helpers({
	facebookAppId: appConfig.facebookAppId,
	siteName: appConfig.siteName,
	siteUrl: appConfig.siteUrl
});

app.dynamicHelpers({
	csrf: function (req, res) {
		return req.session ? req.session._csrf : "";
	},

	siteTitle: function(req, res) {
		var siteTitle = req.flash('siteTitle');
		if (siteTitle && siteTitle.length > 0) {
			return siteTitle + ' - ' + appConfig.siteTitle;
		}
		return appConfig.siteTitle;
	},

	facebookMeta: function(req, res) {
		var facebookMetaUrl = req.flash('facebookMetaUrl');

		if (facebookMetaUrl && facebookMetaUrl.length > 0) {
			return { enable: true, url: facebookMetaUrl };
		}else{
			return { enable: false };
		}
	},

	randomColor: function(req, res) {
		return function() {
			var letters = '0123456789ABCDEF'.split('');
			var color = '';
			for (var i = 0; i < 6; i++ ) {
				color += letters[Math.round(Math.random() * 15)];
			}
			return color;
		}
	}
});

require(appDirectory + '/models/user')(db);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

controllers.index(app, db, appConfig);

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);