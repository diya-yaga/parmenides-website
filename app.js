const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const sqlite3 = require("sqlite3");

const app = express();

let tableArr = [];
let termArr = [];

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const db = new sqlite3.Database('./parmenides.db',sqlite3.OPEN_READWRITE, (err)=>{
    if (err) return console.error(err.message);
});

app.get("/", function(req, res) {
    res.render("index", {
        data: tableArr
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

app.get("/term-in-doc-display", function(req, res) {
    res.render("term-in-doc-display");
});

app.get("/term-table", function(req, res) {
    if (req.body.flexRadioDefault == 'Documents') {
        res.redirect("/doc-table");
    }
    //console.log("array: " + arrOfData);
    res.render("term-table", {
        data: tableArr
    })
});

app.get("/doc-table", function(req, res) {
    console.log(req.body.word);
    if (req.body.flexRadioDefault == 'Terms') {
        res.redirect("/term-table");
    }
    //console.log("array: " + arrOfData);
    res.render("doc-table", {
        data: tableArr
    })
});

app.get("/terms/:givenTerm", function(req, res) {
    var termID = req.params.givenTerm;
    var myCallback2 = function(data) {
        console.log('got data: ' + data);
        var info = data[0];
        console.log("word info: " + info);
        var pieces = info.split(",");

        res.render("term-display", {
            data: pieces,
            hypernym: 'hypernym',
            hyponyms: [1, 2, 3, 4, 5],
            similarTerms: [1,2,3,4,5]
    
        });
        
        
    }
    console.log(termArr);
    var usingItNow2 = function(callback, sql) {
        var arr = [];
        db.all(sql, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                arr.push(JSON.stringify(row));
            });   
            callback(arr);
        });
        
    }
    
    usingItNow2(myCallback2, "SELECT tempTerm.representation AS normalized_representation, tempTerm.pos, IFNULL(tempTerm.rel, '<none>') AS rel, IFNULL(tempHead.representation, '<none>') AS head, IFNULL(tempDep.representation, '<none>') AS dep, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase FROM term tempTerm JOIN phrase ON tempTerm.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id LEFT JOIN term tempHead ON tempTerm.head_id = tempHead.id LEFT JOIN term tempDep ON tempTerm.dep_id = tempDep.id WHERE tempTerm.id = '" + termID + "' ORDER BY normalized_representation;");
    
    
    // res.render("term-display", {
    //     normRep: termArr[0],
    //     posTag: termArr[1],
    //     rei: termArr[2],
    //     head: termArr[3],
    //     dep: termArr[4],
    //     nlpPhrases: 'hello there',
    //     hypernym: 'hypernym',
    //     hyponyms: [1, 2, 3, 4, 5],
    //     similarTerms: [1,2,3,4,5]

    // });
})

// app.post("/terms/:givenTerm", function(req, res) {
//     res.redirect("/terms/:givenTerm");
// })

app.post("/", function(req, res) {
    
    tableArr = [];
    var myCallback = function(data) {
        for (var i = 0; i < data.length; i++) {
            tableArr.push(data[i]);
        };
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

    var radioResult = req.body.flexRadioDefault;
    if (radioResult == 'Terms') {
        usingItNow(myCallback, "SELECT sentence.content, term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, term.pos, term.id FROM sentence JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON term.id = phrase.term_id WHERE term.representation LIKE '%" + req.body.word + "%';");
        res.redirect("/term-table");
    } else if (radioResult == 'Documents') {
        usingItNow(myCallback, "SELECT document.title AS 'title', document.id AS 'id', term.representation AS 'term', COUNT(term.representation) AS 'num_occurrences_total' FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE sentence.content LIKE '%" + req.body.word + "%' GROUP BY document.title;");
        res.redirect("/doc-table")
    }
    
});

app.post("/term-table", function(req, res) {
    console.log("my word: " + req.body.word);
})

app.post("/doc-table", function(req, res) {
    console.log(10);
})

app.listen(3000, function() {
    console.log("Server started on port 3000");
});


