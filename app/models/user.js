module.exports = function(db) {
	var userSchema = new db.Schema({
		facebookId: String,
		username: String,
		displayName: String,
		profileUrl: String,
		emails: String,
		containerHtml: String,
		create_at: { type: Date, default: Date.now },
		update_at: { type: Date, default: Date.now }
	});

	return db.model('user', userSchema);
}