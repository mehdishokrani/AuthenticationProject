//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5")

const { Schema } = mongoose;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userAuthenticationDB").then(
  () => {
    console.log("mongoDB is connected...");
  },
  (err) => {
    console.log(err);
  }
);

const userSchema = new Schema(
    { 
        email: String, 
        password: String 
    }
    );



const User = mongoose.model("User",userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", (req, res) => {
  email = req.body.username;
  password = md5(req.body.password);
  if (email != "" && email && password) {
    const newuser = new User({ email: email, password: password });
    newuser
      .save()
      .then(() => {
        console.log("New user with username " + email + " hase been added");
        res.redirect("/login");
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

app.post("/login", (req, res) => {
  const email = req.body.username;
  const password = md5(req.body.password);
  User.findOne({ email: email })
    .then((result) => {
      if (!result) {
        console.log("No user found");
        res.redirect("/login");
      } else {
        if (password === result.password) {
          res.render("secrets");
        } else {
          console.log("Wrong password");
          res.redirect("/login");
        }
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.listen(3000, () => {
  console.log(
    'Server started on port 3000\nSo enter "localhost:3000" as your URL in address bar to access server'
  );
});
