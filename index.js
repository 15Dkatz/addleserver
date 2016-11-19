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
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var port = process.env.PORT || 8080;

app.get('/test', function(req, res) {
  res.json({
    test: "Working app"
  })
})


// **************************************************************

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

app.get('/rankings', function(req, res) {
  console.log('looking for rankings');
  var mydate = new Date(Date.now()).toLocaleString();
  month = mydate.slice(0, 2);
  day = mydate.slice(3, 5);
  console.log('mydate', mydate);

  var request = {
    method: 'GET',
    url: 'https://sensortower.com/api/ios/rankings/get_category_rankings',
    data: {
      "date": "2016-" + month + "-" + day + "T00:00:00.000Z",
      "hour": null,
      "category": 0,
      "identifier": "IPHONE",
      "country": "US",
      "offset": 0,
      "limit": 50
    }
  }

  fetch(request.url, {method: request.method, data: request.data})
    .then(function(res) {
      return res.json();
    }).then(function(json) {
      res.json(json);
    })
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
    .then(function(user) {
      if (user) {
        console.log('signed in');
        res.json(user);
      } else {
        console.log('user signed out');
      }
    })
    .catch(function(error) {
      // Handle Errors
      var errorCode = error.code;
      var errorMessage = error.message;
      if (errorCode == 'auth/weak-password') {
        res.json({
          'error': 'The password is too weak.'
        });
      } else {
        res.json({
          'error': errorMessage
        });
      }
      res.json({
        'error': error
      });
    });
});

// login
app.post('/signin', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;

  auth.signInWithEmailAndPassword(email, password)
    .then(function(user) {
      if (user) {
        console.log('signed in');
        res.json(user);
      } else {
        console.log('user signed out');
      }
    })
    .catch(error => {
      res.json({
        'error': error.message
      });
    });
});

// reset password
app.post('/reset_password', function(req, res) {
  var email = req.body.email;
  auth.sendPasswordResetEmail(email)
    .then(() => {
      res.json({
        result: 'Password reset sent successfully.'
      });
    }, (error) => {
      res.json({
        result: error.message
      })
    })
});

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



console.log('listening on port', port);
app.listen(port);
