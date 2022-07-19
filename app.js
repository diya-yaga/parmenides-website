const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const sqlite3 = require("sqlite3");

const app = express();

let tableArr = [];
let radioResult = 0;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const db = new sqlite3.Database('./parmenides.db',sqlite3.OPEN_READWRITE, (err)=>{
    if (err) return console.error(err.message);
});

app.get("/", function(req, res) {
    res.render("index", {
        data: tableArr
    });
    
});

app.get("/termindoc/:term/:givenDoc", function(req, res) {
    var docID = req.params.givenDoc;
    var term = req.params.term;
    
    function allDone(callback) {
        console.log("all done!");
        callback();
    }
    
    function getDocContent(callback) {
        var sentences = [];
        var sql1 = "SELECT sentence.content FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE document.id = '" + docID + "' GROUP BY sentence.content;";
        db.all(sql1, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                sentences.push(JSON.stringify(row));
            
            });   
            callback(sentences);    
        });
    }
    
    function getDocInfo (callback) {
        var arr = [];
        var sql2 = "SELECT document.title, document.id FROM document WHERE document.id = '" + docID + "';"; 
        db.all(sql2, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                arr.push(JSON.stringify(row));
            
            });
            callback(arr);   
        });
        
    }

    function getTermID(callback) {
        var ids = [];
        var sql3 = "SELECT term.id FROM term WHERE term.representation='" + term + "';";
        db.all(sql3, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                ids.push(JSON.stringify(row));
            
            });
            callback(ids);   
        });
    }

    function runQueriesInOrder(callback) {
        getDocInfo(function(docInfo) {
            getDocContent(function(docContent) {
                getTermID(function(termID) {
                    res.render('term-in-doc-display', {
                        term: term,
                        termID: termID[0],
                        docTitle: docInfo,
                        docUrl: '/docs/' + docID,
                        content: docContent
                    });
                    allDone(callback);
                })
            })
        })
    }
    
    runQueriesInOrder(function() {
        console.log('finished!');
    })
})


app.get("/docs/:givenDoc", function(req, res) {
    var docID = req.params.givenDoc;
    radioResult = req.body.flexRadioDefault;

    function allDone(callback) {
        console.log("all done!");
        callback();
    }
    
    function getAllTerms(callback) {
        var terms = [];
        var sql1 = "SELECT term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, IFNULL(term.rel, 'null') AS 'rel', term.pos, term.id FROM term JOIN phrase ON term.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id JOIN section ON section.id = sentence.section_id JOIN document ON document.id = section.document_id WHERE document.id = '" + docID + "' ORDER BY term.representation;";
        db.all(sql1, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                terms.push(JSON.stringify(row));
            
            });   
            callback(terms);    
        });
    }
    
    function getDocInfo (callback) {
        var arr = [];
        var sql2 = "SELECT document.title, document.id FROM document WHERE document.id = '" + docID + "';"; 
        db.all(sql2, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                arr.push(JSON.stringify(row));
            
            });
            callback(arr);   
        });
        
    }

    function getMetadata (callback) {
        var metadata = [];
        var sql3 = "SELECT metadata.key, metadata.value FROM metadata JOIN document ON document.id = metadata.document_id WHERE document.id = '" + docID + "';";
        db.all(sql3, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                metadata.push(JSON.stringify(row));
            
            });
            callback(metadata);   
        });
    }

    function runQueriesInOrder(callback) {
        getDocInfo(function(docInfo) {
            getAllTerms(function(terms) {
                getMetadata(function(metadata) {
                    
                    res.render("doc-display", {
                        docInfo: docInfo[0].split('","'),
                        metadata: metadata,
                        arr: terms,
                        partial2: 'temp-partial2'
                    });
                    allDone(callback);
                })
            })
        })
    }
    
    runQueriesInOrder(function() {
        console.log('finished!');
    })
});


app.get("/term-table", function(req, res) {
    if (req.body.flexRadioDefault == 'Documents') {
        res.redirect("/doc-table");
    }
    
    res.render("term-table", {
        data: tableArr
    })
});

app.get("/doc-table", function(req, res) {
    console.log(req.body.word);
    if (req.body.flexRadioDefault == 'Terms') {
        res.redirect("/term-table");
    }
    
    res.render("doc-table", {
        data: tableArr
    })
});

app.get("/terms/:givenTerm", function(req, res) {
    var termID = req.params.givenTerm;

    function allDone(callback) {
        console.log("all done!");
        callback();
    }
    
    function getTermInfo(callback) {
        var arr = [];
        var sql1 = "SELECT tempTerm.representation AS normalized_representation, tempTerm.pos, IFNULL(tempTerm.rel, '<none>') AS rel, IFNULL(tempHead.representation, '<none>') AS head, IFNULL(tempDep.representation, '<none>') AS dep, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, IFNULL(tempHead.representation, 'none') AS hypernym, tempDep.id AS dep_id, tempDep.representation AS dep_rep FROM term tempTerm JOIN phrase ON tempTerm.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id LEFT JOIN term tempHead ON tempTerm.head_id = tempHead.id LEFT JOIN term tempDep ON tempTerm.dep_id = tempDep.id WHERE tempTerm.id = '" + termID + "' ORDER BY normalized_representation;";
        db.all(sql1, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                arr.push(JSON.stringify(row));
            
            });   
            callback(arr);    
        });
    }
    
    function getHyponyms (callback) {
        var hyponyms = [];
        var sql2 = "SELECT tempHead.id AS head_id, tempTerm.id AS hyponym_id, tempTerm.representation AS hyponym_rep FROM term tempTerm LEFT JOIN term tempHead ON tempTerm.head_id = tempHead.id LEFT JOIN term tempDep ON tempTerm.dep_id = tempDep.id WHERE tempHead.id = '" + termID + "';"; 
        db.all(sql2, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                hyponyms.push(JSON.stringify(row));
            
            });
            callback(hyponyms);   
        });
        
    }

    function getNLPPhrases (callback) {
        var nlpPhrases = [];
        var sql3 = "SELECT SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase FROM term JOIN phrase ON term.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id WHERE term.id = '" + termID + "' OR nlp_phrase LIKE (SELECT '%' || term.representation || '%' FROM term WHERE term.id = '" + termID + "') GROUP BY nlp_phrase;";
        db.all(sql3, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                nlpPhrases.push(JSON.stringify(row));
            });
            console.log(nlpPhrases);
            callback(nlpPhrases);
        });
    }

    function getSimilarTerms (callback) {
        var simTerms = [];
        var sql4 = "SELECT term.id, term.representation FROM term WHERE term.representation = (SELECT term.representation FROM term WHERE term.id = '" + termID + "') AND term.id != '" + termID + "';";
        db.all(sql4, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                simTerms.push(JSON.stringify(row));
            });
            console.log(simTerms);
            callback(simTerms);
        });
    }
    
    function runQueriesInOrder(callback) {
        getHyponyms(function(hypoData) {
            getTermInfo(function(termData) {
                getNLPPhrases(function(nlpPhraseData) {
                    getSimilarTerms(function(simTermData) {
                    var pieces = [];
                    for (var i = 0; i < termData.length; i++) {
                        pieces.push(termData[i].split('","'));
                    }
                    
                    var hyponymArr = [];
                    for (var i = 0; i < hypoData.length; i++) {
                    hyponymArr.push(hypoData[i].split('","')) 
                    }

                    var simTermsArr = [];
                    for (var i = 0; i < simTermData.length; i++) {
                        simTermsArr.push(simTermData[i].split('","'))
                    }
                    
                    res.render("term-display", {
                        data: pieces[0],
                        nlpPhrase: nlpPhraseData,
                        hyponyms: hyponymArr,
                        similarTerms: simTermsArr
                
                    });
                    allDone(callback);
                    })
                })
            })
        })
    }
    
    runQueriesInOrder(function() {
        console.log('finished!');
    })
})


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
        usingItNow(myCallback, "SELECT sentence.content, term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, term.pos, term.id FROM sentence JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON term.id = phrase.term_id WHERE term.representation = '" + req.body.word + "';");
        res.redirect("/term-table");
    } else if (radioResult == 'Documents') {
        usingItNow(myCallback, "SELECT document.title AS 'title', document.id AS 'id', term.representation AS 'term', COUNT(term.representation) AS 'num_occurrences_total' FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE sentence.content LIKE '%" + req.body.word + "%' AND term.representation = '" + req.body.word + "' GROUP BY document.title;");
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


