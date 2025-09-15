
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

module.exports = function(passport) {
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            console.log('Passport authentication attempt:', { username });
            const user = await User.findOne({ username: username });
            if (!user) {
                console.log('User not found:', username);
                return done(null, false, { message: 'No user found.' });
            }

            const isMatch = await user.comparePassword(password);
            if (isMatch) {
                console.log('Authentication successful for:', username);
                return done(null, user);
            } else {
                console.log('Password incorrect for:', username);
                return done(null, false, { message: 'Password incorrect.' });
            }
        } catch (err) {
            console.error('Passport authentication error:', err);
            return done(err);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};
