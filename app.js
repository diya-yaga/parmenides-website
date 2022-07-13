const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const sqlite3 = require("sqlite3");

const app = express();

let arrOfData = [];

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const db = new sqlite3.Database('./parmenides.db',sqlite3.OPEN_READWRITE, (err)=>{
    if (err) return console.error(err.message);
});

app.get("/", function(req, res) {
    console.log("word: "  + req.body.word);
    res.render("index", {
        data: arrOfData
    })
    
});

app.get("/doc-display", function(req, res) {
    res.render("doc-display", {
        docTitle: 'docTitle',
        uniqueID: 'uniqueID',
        pubDate: 'pubDate',
        authors: ['steve', 'bob', 'joe'],
        metadata: [1, 2, 3, 4, 5]
    });
});

app.get("/term-display", function(req, res) {
    res.render("term-display", {
        term: 'word',
        normRep: 'hello',
        posTag: 'hello',
        rei: 'hello',
        head: 'hello',
        dep: 'hello',
        nlpPhrases: 'hello there',
        hypernym: 'hypernym',
        hyponyms: [1, 2, 3, 4, 5],
        similarTerms: [1,2,3,4,5]

    });
});

app.get("/term-in-doc-display", function(req, res) {
    res.render("term-in-doc-display");
});

app.get("/term-table", function(req, res) {
    if (req.body.flexRadioDefault == 'Documents') {
        res.redirect("/doc-table");
    }
    console.log("array: " + arrOfData);
    res.render("term-table", {
        data: arrOfData
    })
});

app.get("/doc-table", function(req, res) {
    console.log(req.body.word);
    if (req.body.flexRadioDefault == 'Terms') {
        res.redirect("/term-table");
    }
    console.log("array: " + arrOfData);
    res.render("doc-table", {
        data: arrOfData
    })
});

app.post("/", function(req, res) {
    var radioResult = req.body.flexRadioDefault;
    arrOfData = [];
    var myCallback = function(data) {
        for (var i = 0; i < data.length; i++) {
            arrOfData.push(data[i]);
        };
        console.log('got data: ' + data);
    }

    var usingItNow = function(callback, sql) {
        var arr = [];
        db.all(sql, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                arr.push(JSON.stringify(row));
            });       
            callback(arr);
        });
    }
    console.log("arrOfData: " + arrOfData);


    if (radioResult == 'Terms') {
        usingItNow(myCallback, "SELECT sentence.content, term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, term.pos FROM sentence JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON term.id = phrase.term_id WHERE term.representation = '" + req.body.word + "';");
        res.redirect("/term-table");
    } else if (radioResult == 'Documents') {
        usingItNow(myCallback, "SELECT document.title AS 'title', document.id AS 'id', term.representation AS 'term', COUNT(term.representation) AS 'num_occurrences_total' FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE sentence.content LIKE '%" + req.body.word + "%' GROUP BY document.title;");
        res.redirect("/doc-table")
    }
    
});

app.post("/term-table", function(req, res) {
    console.log(10);
})

app.post("/doc-table", function(req, res) {
    
    console.log(10);
})

app.listen(3000, function() {
    console.log("Server started on port 3000");
});


