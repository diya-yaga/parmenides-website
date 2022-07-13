SELECT sentence.content, term.representation, SUBSTR(sentence.content, phrase.start, phrase.end - phrase.start + 1) AS nlp_phrase, term.pos
FROM sentence
JOIN phrase ON sentence.id = phrase.sentence_id JOIN term ON term.id = phrase.term_id;