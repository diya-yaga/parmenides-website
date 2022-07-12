const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const sqlite3 = require("sqlite3");

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static("public"));

const db = new sqlite3.Database('./parmenides.db',sqlite3.OPEN_READWRITE, (err)=>{
    if (err) return console.error(err.message);
});

const requests = [];

app.get("/", function(req, res) {
    var arr = [];
    arr.push('{"content":"This is a document","representation":"document","nlp_phrase":"document", "pos":"noun"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word","nlp_phrase":"word", "pos":"NOUN"}');
    arr.push('{"content":"This is the final document","representation":"final","nlp_phrase":"final", "pos":"ADJ"}');
    arr.push('{"content":"We solve the world problem for free","representation":"free:0:double","nlp_phrase":"free double", "pos":"ADJ"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word","nlp_phrase":"word", "pos":"NOUN"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word:0:problem:1:translate","nlp_phrase":"translating it to the world problem", "pos":"ADJ"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word","nlp_phrase":"word", "pos":"NOUN"}');
    res.render("index", {
        data: arr
    })
    
});


app.get("/doc-display", function(req, res) {
    res.render("doc-display");
});

app.get("/term-display", function(req, res) {
    res.render("term-display");
});

app.get("/term-in-doc-display", function(req, res) {
    res.render("term-in-doc-display");
});

app.get("/term-table", function(req, res) {
    var arr = [];
    arr.push('{"content":"This is a document","representation":"document","nlp_phrase":"document", "pos":"noun"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word","nlp_phrase":"word", "pos":"NOUN"}');
    arr.push('{"content":"This is the final document","representation":"final","nlp_phrase":"final", "pos":"ADJ"}');
    arr.push('{"content":"We solve the world problem for free","representation":"free:0:double","nlp_phrase":"free double", "pos":"ADJ"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word","nlp_phrase":"word", "pos":"NOUN"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word:0:problem:1:translate","nlp_phrase":"translating it to the world problem", "pos":"ADJ"}');
    arr.push('{"content":"We solve the world problem for free","representation":"word","nlp_phrase":"word", "pos":"NOUN"}');
    console.log(req);
    res.render("term-table", {
        data: arr
    })
});

app.post("/", function(req, res) {
    var givenWord = req.body.word;
    var radioResult = req.body.flexRadioDefault;
    
    let sql = "SELECT sentence.content, term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, term.pos FROM sentence JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON term.id = phrase.term_id WHERE term.representation = '" + givenWord + "';";
    
    db.all(sql, [], (err, rows) => {
        if (err) return console.error(err.message);
        rows.forEach((row) => {
            //console.log(JSON.stringify(row));
            //arr.push(JSON.stringify(row))

        })
        //console.log(arr);
        //console.log(JSON.stringify(rows));
            
    });
    if (radioResult == 'Terms') {
        res.redirect("/term-table");
    } else {
        res.redirect("/doc-display")
    }
    
});

app.listen(3000, function() {
    console.log("Server started on port 3000");
});


function contentPartOfSpeech() {
    let sql = "SELECT subject.representation AS \"subject\", verb.representation AS \"verb\", object.representation AS \"object\" FROM term AS root JOIN term AS subject ON root.dep_id = subject.id JOIN term AS predicate ON root.head_id = predicate.id JOIN term AS object ON predicate.dep_id = object.id JOIN term AS verb on predicate.head_id = verb.id WHERE predicate.rel = 'dobj' AND root.pos = 'VERB';";
    db.each(sql, (err, row) => {
        if (err) return console.error(err.message);
        var s = new String(row.subject);
        console.log(s);
        
    });

}

