// TODO
// [] test endpoints with more than one word at a time. i.e. baseball%20cards || 'baseball cards'

// MODULES
var express = require('express');
var bodyParser = require('body-parser');
var fetch = require('node-fetch');
var store = require('app-store-scraper');
var firebase = require('firebase');

// API KEYS
var grepword_key = require('./secrets').grepword_key;

// APP
var app = express();
app.use(bodyParser.json());

var port = process.env.PORT || 8080;

app.get('/test', function(req, res) {
  res.json({test: "Working app"})
})


// **************************************************************
// OUR API
// **************************************************************

// usage:
// http://localhost:8080/keyword?keyword=baseball
app.get('/keyword', function(req, res) {
  var keyword = req.query.keyword;
  console.log('keyword: ', keyword);

  var request = 'http://api.grepwords.com/related?' + 'q=' + keyword + '&apikey=' + grepword_key;
  fetch(request)
    .then(function(res) {
      console.log('in fetch');
      return res.text();
    }).then(function(body) {
      // grepwords returns 100 related words by default but there is still a way to limit it.
      var related_words = JSON.parse(body);
      var new_body = {};
      new_body["keyword"] = keyword;
      new_body["related_words"] = related_words;
      res.json(new_body);
    })
})

// usage:
// http://localhost:3000/suggest?keyword=baseball
app.get('/suggest', function(req, res) {
  var keyword = req.query.keyword;
  console.log('keyword: ', keyword);

  // var request =
  store.suggest(keyword)
    .then(function(response) {
      console.log('res', response);
      res.json(response);
    })
    .catch(console.log);
})

app.get('/search', function(req, res) {
  var keyword = req.query.keyword;
  console.log('keyword: ', keyword);

  store.search({
    term: keyword,
    num: 100,
    device: store.device.IOS
  })
  .then(function(response) {
    console.log('res', response);
    res.json(response);
  })
  .catch(console.log);
})


// AUTHENTICATION
var config = {
  apiKey: "AIzaSyBRzUr3dxejmn9zxx71Il5UTYYEuEkB_4Q",
  authDomain: "admuffin-556a3.firebaseapp.com",
  databaseURL: "https://admuffin-556a3.firebaseio.com",
  storageBucket: "admuffin-556a3.appspot.com",
  messagingSenderId: "574531191456"
};
var firebaseApp = firebase.initializeApp(config);
var auth = firebaseApp.auth();

// registering
app.post('/signup', function(req, res) {
  console.log('req.body', req.body);
  var email = req.body.email;
  var password = req.body.password;

  auth.createUserWithEmailAndPassword(email, password)
    .catch(function(error) {
    // Handle Errors
    var errorCode = error.code;
    var errorMessage = error.message;
    if (errorCode == 'auth/weak-password') {
      console.log('The password is too weak.');
    } else {
      console.log(errorMessage);
    }
    console.log(error);
  });

  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log('signed in');
      res.json(user);
    } else {
      console.log('user signed out');
      setTimeout(res.json({result: 'user signed out'}), 5000);
    }
  })
});

// login
app.post('/signin', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;

  auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      console.log('error:', error.message);
    });

  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log('signed in');
      res.json(user);
    } else {
      console.log('user signed out');
    }
  })
});

// reset password
app.post('/reset_password', function(req, res) {
  var email = req.body.email;
  auth.sendPasswordResetEmail(email)
    .then(() => {
      res.json({result: 'Password reset sent successfully.'});
    }, (error) => {
      res.json({result: error.message})
    })
});

// **************************************************************
// **************************************************************

app.post('/send_email', function(req, res) {
  console.log('req.body', req.body.email);
  // console.log('req.body', req.body);
  var email = req.body.email;
  var data_keywords = req.body.body.data_keywords;
  var suggested_keywords = req.body.body.suggested_keywords;
  var emailContent = "";

  emailContent += "****\n"
  Object.keys(data_keywords).forEach(function(keyword) {
    var kw = data_keywords[keyword];
    var keyword = kw.keyword;
    emailContent += "\n Keyword: " + keyword;
    var competition = kw.cmp;
    emailContent += ",\n Competition: " + competition;
    var cpc = kw.cpc;
    emailContent += ",\n Cpc: " + cpc;
    var ams = kw.ams;
    emailContent += ",\n Average Monthly Searches: " + ams;
  });
  emailContent += "\n****\n";

  emailContent += "****\n";
  Object.keys(suggested_keywords).forEach(function(keyword) {

    var kw = suggested_keywords[keyword];
    var keyword = kw.term;
    emailContent += "\n Keyword " + keyword;
    var priority = kw.priority;
    emailContent += ", \n Priority: " + priority;

  })
  emailContent += "\n****\n";

  console.log('email content ', emailContent);

  var helper = require('sendgrid').mail

  from_email = new helper.Email("dtkatz@dons.usfca.edu")
  to_email = new helper.Email(email)
  subject = "Sending keywords"
  content = new helper.Content("text/plain", "for your better marketing results! \n" + emailContent)
  mail = new helper.Mail(from_email, subject, to_email, content)

  var sg = require('sendgrid')('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');

  var request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON()
  });

  sg.API(request, function(error, response) {
    console.log(response.statusCode)
    console.log(response.body)
    console.log(response.headers)
  })
})


// **************************************************************
// **************************************************************

console.log('listening on port', port);
app.listen(port);
