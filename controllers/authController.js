
const passport = require('passport');
const User = require('../models/user');

const getRegister = (req, res) => {
    res.render('register', { title: 'Register' });
};

const postRegister = async (req, res) => {
    const { username, password, password2 } = req.body;
    let errors = [];

    if (!username || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password != password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            username,
            password,
            password2,
            title: 'Register'
        });
    } else {
        try {
            const user = await User.findOne({ username: username });
            if (user) {
                errors.push({ msg: 'Username already exists' });
                res.render('register', {
                    errors,
                    username,
                    password,
                    password2,
                    title: 'Register'
                });
            } else {
                const newUser = new User({
                    username,
                    password
                });
                await newUser.save();
                // You can decide to log them in directly or redirect to login
                res.redirect('/login');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }
};

const getLogin = (req, res) => {
    res.render('login', { title: 'Login' });
};

const postLogin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        
        if (!user) {
            return res.redirect('/login');
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            
            // Session will be automatically saved by MongoDB store
            return res.redirect('/app');
        });
    })(req, res, next);
};

const logout = (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
      });
};

module.exports = {
    getRegister,
    postRegister,
    getLogin,
    postLogin,
    logout
};