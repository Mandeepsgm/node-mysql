const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const async = require("hbs/lib/async");
const { promisify } = require('util');

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

exports.register = (req, res) => {
    console.log(req.body);

    // const name = req.body.name;
    // const email = req.body.email;
    // const password = req.body.password;
    // const passwordConfirm = req.body.passwordConfirm;
    // use destructuring like below
    const { name, email, password, passwordConfirm } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async(error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length > 0) {
            return res.render('register', {
                message: 'Oops! It seems you already have an account with us'
            });
        } else if (password !== passwordConfirm) {
            return res.render('register', {
                message: 'Passwords do not match'
            });
        }

        // getting hash of password using 8 rounds of bcrypt
        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        db.query('INSERT INTO users SET ? ', { name: name, email: email, password: hashedPassword }, (error, results) => {
            if (error) {
                console.log(error);
            } else {
                return res.render('register', {
                    message: 'User registered Succesfully'
                });
            }
        });
    });
}


//login

exports.login = async(req, res) => {
    console.log(req.body);
    try {

        // const email = req.body.email;
        // const password = req.body.password;
        // use destructuring like below
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).render('login', { message: 'Please enter email and password' });
        }
        db.query('SELECT * FROM users WHERE email = ?', [email], async(error, results) => {
            if (error) {
                console.log(error);
            }
            console.log(results);
            if (results.length > 0) {
                console.log(results[0].password);
                if (await bcrypt.compare(password, results[0].password)) {
                    console.log('Login OHK');
                    const id = results[0].id;

                    const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

                    const cookieOptions = {
                        expires: new Date(
                            Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                        ),
                        httpOnly: true
                    }

                    res.cookie('jwt', token, cookieOptions);
                    res.status(200).redirect('/');
                    return res.render('index');
                } else {
                    return res.status(401).render('login', {
                        message: 'Invalid Credentials'
                    });
                }

            } else {
                return res.render('login', {
                    message: 'Oops! It seems you Don\'t have an account with us'
                });
            }
        });
    } catch (error) {
        console.log(error);
        return res.render('login', {
            message: 'Something went wrong'
        });
    }
}


exports.isLoggedIn = async(req, res, next) => {
    console.log(req.cookies);
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET);

            console.log(decoded);

            // check the 
            db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
                console.log(result);
                if (!result) {
                    return next();
                }
                req.user = result[0];
                return next();
            });
        } catch (error) {
            console.log(error);
            return next();
        }
    } else {
        next();
    }
}

exports.logout = async(req, res, next) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });

    res.status(200).redirect('/');
}