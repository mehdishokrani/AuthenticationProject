//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
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
  email: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } 
  else {
    res.redirect("/login");
  }
});

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
