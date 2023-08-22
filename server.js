//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { Schema } = mongoose;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userAuthenticationDB").then(
  () => {
    console.log("mongoDB is connected...");
  },
  (err) => {
    console.log(err);
  }
);

const userSchema = new Schema({
  username: { 
    type: String, 
    unique: true, 
    sparse: true, 
    
  },
  password: String,
  googleId: {
    type: String,
    unique: true, 
    sparse: true, 
  },
  facebookId: {
    type: String,
    unique: true, 
    sparse: true, 
  },
  secret: [String]
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  //userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  //console.log(email)
  User.findOrCreate({ googleId: profile.id, username: profile.displayName}, function (err, user) {
    return cb(err, user);
  });
}

));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/callback"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", (req, res) => {
  res.render("home",{userIsAuthenticated:req.isAuthenticated()});
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/register", (req, res) => {
  res.render("register",{userIsAuthenticated:req.isAuthenticated()});
});

app.get("/login", (req, res) => {
  res.render("login",{userIsAuthenticated:req.isAuthenticated()});
});

app.get("/secrets", (req, res) => {
  User.find({"secret": { $exists: true, $not: { $size: 0 } }})
  .then((result) => {
      res.render("secrets", { users: result, userIsAuthenticated:req.isAuthenticated()});
  })
  .catch(err => {
      console.error('Error:', err);
      res.status(500).send('Server Error');
  });
});

app.get("/submit",(req,res)=>{
  if (req.isAuthenticated()) {
    res.render("submit",{userIsAuthenticated:req.isAuthenticated()});
  } 
  else {
    res.redirect("/login");
  }
})


app.post("/submit",(req,res)=>{
  User.findByIdAndUpdate(req.user.id,{$push: {secret: req.body.secret}}).then((result) => {
    res.redirect("/secrets")
}).catch((err) => {
    console.error("Update Error:", err);
});

})


app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post("/register", (req, res) => {
  User.register({ username: req.body.username }, req.body.password, (err) => {
    if (err) {
      console.log("There was a problem to make user!!!\n" + err);
      res.redirect("/register");
    } else {
      console.log("New user has been made");
      res.redirect("/login");
    }
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.log("Authentication error: " + err);
      return next(err);
    }
    if (!user) {
      console.log("User not found or password mismatch");
      return res.redirect("/login");
    }
    req.login(user, (err) => {
      if (err) {
        console.log("Session error: " + err);
        return next(err);
      }
      return res.redirect("/secrets");
    });
  })(req, res, next);
});


app.listen(3000, () => {
  console.log(
    'Server started on port 3000\nSo enter "localhost:3000" as your URL in address bar to access server'
  );
});
