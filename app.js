const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const sqlite3 = require("sqlite3");
const fs = require('fs');
const { spawn } = require('child_process');
const { normalize } = require("path");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const db = new sqlite3.Database('./parmenides.db',sqlite3.OPEN_READWRITE, (err)=>{
    if (err) return console.error(err.message);
});

let tableArr = [];
const rels = fs.readFileSync('rels.txt').toString().split('\n');
for (i in rels) {
    rels[i] = rels[i].trim();
}

const pos = fs.readFileSync('pos.txt').toString().split('\n');
for (i in pos) {
    pos[i] = pos[i].trim();
}

const keys = [];
var sql = "SELECT metadata.key FROM metadata GROUP BY metadata.key;";
db.all(sql, [], (err, rows) => {
    if (err) return callback(err.message);
    rows.forEach((row) => {
        var key = JSON.stringify(row).substring(8, JSON.stringify(row).length-2);
        keys.push(key);    
    });    
});

app.get("/", function(req, res) {
    res.render("index", {
        data: tableArr,
        rels: rels,
        pos: pos,
        keys: keys
    });
    
});

app.get("/term-table", function(req, res) {
    if (req.body.flexRadioDefault == 'Documents') {
        res.redirect("/doc-table");
    }
    
    res.render("term-table", {
        data: tableArr,
        rels: rels,
        pos: pos,
        keys: keys
    })
});

app.get("/doc-table", function(req, res) {
    console.log(req.body.word);
    if (req.body.flexRadioDefault == 'Terms') {
        res.redirect("/term-table");
    }
    
    res.render("doc-table", {
        data: tableArr,
        rels: rels,
        pos: pos,
        keys: keys
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
        var sql1 = "SELECT tempTerm.representation AS normalized_representation, tempTerm.pos, IFNULL(tempTerm.rel, '') AS rel, IFNULL(tempHead.representation, '') AS head, IFNULL(tempDep.representation, '') AS dep, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, IFNULL(tempHead.representation, '') AS hypernym, IFNULL(tempHead.id, '') AS head_id, IFNULL(tempDep.id, '') AS dep_id FROM term tempTerm JOIN phrase ON tempTerm.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id LEFT JOIN term tempHead ON tempTerm.head_id = tempHead.id LEFT JOIN term tempDep ON tempTerm.dep_id = tempDep.id WHERE tempTerm.id = '" + termID + "' ORDER BY normalized_representation;";
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
        var sql3 = "SELECT SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase FROM term JOIN phrase ON term.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id WHERE term.id = '" + termID + "' GROUP BY nlp_phrase;";
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
                        similarTerms: simTermsArr,                
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
});

app.get("/termindoc/:term/:givenDoc", function(req, res) {
    var docID = req.params.givenDoc;
    var termID = req.params.term;
    
    function allDone(callback) {
        console.log("all done!");
        callback();
    }

    function alterTable (callback) {
        var sql="ALTER TABLE sentence RENAME COLUMN 'order' TO 'order_sentences';";
        db.all(sql, [], (err, rows) => {
            if (err) return callback(err.message);  
            callback();    
        });

    }

    function getDocContent(callback) {
        var sentences = [];
        var sql1 = "SELECT sentence.content FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE document.id = '" + docID + "' GROUP BY sentence.content ORDER BY sentence.order_sentences;";
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

    function getTermRep(callback) {
        var terms = [];
        var sql3 = "SELECT term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase FROM term JOIN phrase ON phrase.term_id = term.id JOIN sentence ON sentence.id = phrase.sentence_id WHERE term.id = '" + termID + "';";
        db.all(sql3, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                terms.push(JSON.stringify(row));
            
            });
            callback(terms);   
        });
    }

    function getOtherVersions(callback) {
        var allTerms = [];
        var sql4 = "SELECT SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE document.id = '" + docID + "' AND term.representation = (SELECT term.representation FROM term WHERE term.id = '" + termID + "') GROUP BY nlp_phrase ORDER BY sentence.order_sentences;";
        db.all(sql4, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                allTerms.push(JSON.stringify(row).substring(16, JSON.stringify(row).length-2));
            
            });
            callback(allTerms);   
        });
    }

    function runQueriesInOrder(callback) {
        alterTable(function(temp) {
            getDocInfo(function(docInfo) {
                getDocContent(function(docContent) {
                    getTermRep(function(terms) {
                        getOtherVersions(function(otherTerms) {
                            res.render('term-in-doc-display', {
                                termID: termID,
                                term: terms,
                                docTitle: docInfo,
                                docUrl: '/docs/' + docID,
                                content: docContent,
                                otherTerms: otherTerms
                            });
                            allDone(callback);
                        })
                    })
                })
            })
        })
        
    }
    
    runQueriesInOrder(function() {
        console.log('finished!');
    })
});

app.get("/docs/:givenDoc", function(req, res) {
    var docID = req.params.givenDoc;
    radioResult = req.body.flexRadioDefault;

    function allDone(callback) {
        console.log("all done!");
        callback();
    }

    function alterTable (callback) {
        var sql="ALTER TABLE sentence RENAME COLUMN 'order' TO 'order_sentences';";
        db.all(sql, [], (err, rows) => {
            if (err) return callback(err.message);  
            callback();    
        });

    }
    
    function getAllTerms(callback) {
        var terms = [];
        var sql1 = "SELECT term.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, IFNULL(term.rel, 'none') AS 'rel', term.pos, term.id FROM term JOIN phrase ON term.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id JOIN section ON section.id = sentence.section_id JOIN document ON document.id = section.document_id WHERE document.id = '" + docID + "' GROUP BY term.id ORDER BY term.representation;";
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

    function getAuthors (callback) {
        var authors = [];
        var sql6 = "SELECT author.id, author.name FROM author JOIN authored ON author.id = authored.author_id JOIN document ON authored.document_id = document.id WHERE document.id = '" + docID + "';";
        db.all(sql6, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                authors.push(JSON.stringify(row));
            
            });
            callback(authors);   
        });
    }

    function getPubDate (callback) {
        var pubDate = [];
        var sql7 = "SELECT document.published FROM document WHERE document.id = '" + docID + "';";
        db.all(sql7, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                pubDate.push(JSON.stringify(row));
            
            });
            callback(pubDate);   
        });
    }
    
    function getDocContent (callback) {
        var sentences = [];
        var sql4 = "SELECT sentence.content FROM sentence JOIN section ON sentence.section_id = section.id JOIN document ON document.id = section.document_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id WHERE document.id = '" + docID + "' GROUP BY sentence.content ORDER BY sentence.order_sentences;";
        db.all(sql4, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                sentences.push(JSON.stringify(row));
            
            });  
            callback(sentences);    
        });
    }

    function getOtherWorks (callback) {
        var documents = [];
        var sql5 = "SELECT document.id, document.title, author.name, author.id AS 'auth_id' FROM author JOIN authored ON author.id = authored.author_id JOIN document ON authored.document_id = document.id ORDER BY author.name;";
        db.all(sql5, [], (err, rows) => {
            if (err) return callback(err.message);
            rows.forEach((row) => {
                documents.push(JSON.stringify(row));
            
            });  
            callback(documents);    
        });
    }

    function runQueriesInOrder(callback) {
        alterTable(function(temp) {
            getDocInfo(function(docInfo) {
                getAllTerms(function(terms) {
                    getMetadata(function(metadata) {
                        getDocContent(function(content) {
                            getOtherWorks(function(works) {
                                getAuthors(function(authors) {
                                    getPubDate(function(pubDate) {
                                        res.render("doc-display", {
                                            docInfo: docInfo[0].split('","'),
                                            metadata: metadata,
                                            arr: terms,
                                            partial2: 'temp-partial2',
                                            content: content,
                                            otherWorks: works,
                                            authors: authors,
                                            pubDate: pubDate
                                        });
                                        allDone(callback);
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }
    
    runQueriesInOrder(function() {
        console.log('finished!');
    })
});

app.post("/", function(req, res) {
    var authors = [req.body.author];
    for (var i = 2; i <= req.body.numAuthors; i++) {
        var tempAuth = req.body[`author_${i}`];
        authors.push(tempAuth);
    } 

    var metadata = [[req.body.md_key, req.body.md_input]];
    for (var i = 2; i <= req.body.numMd; i++) {
        var tempMd = [req.body[`md_key_${i}`], req.body[`md_input_${i}`]];
        metadata.push(tempMd);
    }

    var dates = [req.body.startingDateInput, req.body.endingDateInput];

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
    var query;
    console.log('term: ' + req.body.word);
    
    let arr = [];
    normalizeTerm(req.body.word).then(response => {
        arr.push(response.trim());
        console.log(arr);
        return normalizeTerm(req.body.headInput);
    }).then(response => {
        arr.push(response.trim());
        console.log(arr);
        return normalizeTerm(req.body.depInput);
    }).then(response => {
        arr.push(response.trim());
        console.log(arr);
        return normalizeTerm(req.body.titleInput);
    }).then(response => {
        arr.push(response.trim());
        console.log(arr);
        if (radioResult == 'Terms') { 
            query = generateQuery(arr[0], req.body.flexRadioDefault, [req.body.partOfSpeechSelect, arr[1], arr[2], req.body.relSelect])
            console.log(query);
            usingItNow(myCallback, query);
            res.redirect("/term-table");
        } else if (radioResult == 'Documents') {
            query = generateQuery(response, req.body.flexRadioDefault, [arr[3], metadata, authors, dates]);
            console.log(query);
            usingItNow(myCallback, query);
            res.redirect("/doc-table");
        }
    }).catch(err => {
        console.log(err);
    })
});

app.listen(3000, function() {
    console.log("Server started on port 3000");
});

function generateQuery (givenTerm, selected, data) {
    var sql = "";
    var hasData = false;
    for (var i = 0; i < data.length; i++) {
        if (data[i].length > 0) {
            hasData = true;
        }
    }
    if (selected == 'Terms') {
        sql = "SELECT sentence.content,tempTerm.representation, SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, tempTerm.pos, IFNULL(tempTerm.rel, ''), tempTerm.id, IFNULL(tempHead.representation, ''), IFNULL(tempDep.representation, '') FROM term tempTerm JOIN phrase ON tempTerm.id = phrase.term_id JOIN sentence ON sentence.id = phrase.sentence_id JOIN section ON section.id = sentence.section_id JOIN document ON document.id = section.document_id LEFT JOIN term tempHead ON tempTerm.head_id = tempHead.id LEFT JOIN term tempDep ON tempTerm.dep_id = tempDep.id WHERE ";
        if (givenTerm != '' || (givenTerm == '' && !hasData)) {
            sql += "(tempTerm.representation = '" + givenTerm + "' OR TRIM(nlp_phrase) LIKE '" + givenTerm + "') ";
        } else if (givenTerm == '' && hasData) {
            sql += "1=1 ";
        }

        if (data[0] != '') {
            sql +="AND tempTerm.pos = '" + data[0] + "'"; 
        }
        if (data[1] != '') {
            sql += "AND TRIM(tempHead.representation) = '" + data[1] + "'";
        }
        if (data[2] != '') {
            sql += "AND TRIM(tempDep.representation) = '" + data[2] + "'";
        }
        if (data[3] != '') {
            sql += "AND tempTerm.rel = '" + data[3] + "'";
        }

        sql += "GROUP BY tempTerm.representation, tempTerm.pos ORDER BY tempTerm.representation;";
    } else if (selected == 'Documents') {
        sql = "SELECT document.title, author.name AS 'author', document.published AS 'pubDate', document.id, term.id AS 'term_id', SUBSTRING(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS 'nlp_phrase', COUNT(term.representation) AS 'num_occurrences_total' FROM document JOIN authored ON document.id = authored.document_id JOIN author ON author.id = authored.author_id JOIN section ON document.id = section.document_id JOIN sentence ON section.id = sentence.section_id JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON phrase.term_id = term.id JOIN metadata ON metadata.document_id = document.id WHERE ";
        if (givenTerm != '') {
            sql += "(term.representation = '" + givenTerm + "') ";
        } else if (givenTerm == '' && hasData) {
            sql += "1=1 ";
        } else if (givenTerm == '' && !hasData) {
            sql += "(term.representation = '" + givenTerm + "' OR TRIM(nlp_phrase) LIKE '" + givenTerm + "') ";
        }


        if (data[0] != '') {
            sql += "AND document.title LIKE TRIM('" + data[0] + "') ";
        }
        if (data[1][0][0] != '' || data[1][0][1] != '') {
            sql += "AND ((metadata.key LIKE TRIM('" + data[1][0][0] + "') AND metadata.value LIKE TRIM('" + data[1][0][1] + "')) ";
            for (var i = 1; i < data[1].length; i++) {
                sql += "OR (metadata.key LIKE TRIM('" + data[1][i][0] + "') AND metadata.value LIKE TRIM('" + data[1][i][1] + "')) ";
            }
            sql += ")";
        }
        
        if (data[2][0] != '') {
            sql += "AND (author.name LIKE TRIM('" + data[2][0] +"') ";
            for (var i = 1; i < data[2].length; i++) {
                sql += "OR author.name LIKE TRIM('"+ data[2][i] +"') ";
            }
            sql += ") ";
        }

        if (data[3][0] != '') {
            sql += "AND document.published >= '" + data[3][0] + "' ";
        }

        if (data[3][1] != '') {
            sql += "AND document.published <= '" + data[3][1] + "' ";
        }

        sql += "GROUP BY document.id ORDER BY num_occurrences_total DESC, document.title;";
    }
    return sql;
};

function normalizeTerm(term) {
    const python = spawn("python", ["normalize-single-term.py", term]);
    let processed_data = '';
    return new Promise((resolve, reject) => {
        python.stdout.on('data', function(data) {
            processed_data = data.toString();
        })
        python.stderr.on('data', data => {
            console.error('got an error! ' + processed_data);
        })
        python.on('exit', (code) => {
            if (processed_data != '') {
                resolve(processed_data);
            }
            else {
                resolve('');
            }
        })
    })
}