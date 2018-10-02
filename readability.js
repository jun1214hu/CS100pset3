const fs = require("fs");
const md5File = require('md5-file');
const sqlite3 = require('sqlite3');
const Tokenizer = require('tokenize-text');
const tokenize = new Tokenizer();
const tokenizeEnglish = require("tokenize-english")(tokenize);

// make new database
let db = new sqlite3.Database('bookDatabase.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        throw err;
    }
});

// Parses a text file into words, sentences, characters
function readability(filename, callback) {
    fs.readFile(filename, "utf8", (err, contents) => {
        if (err) throw err;


        // Execute some sql
        let filepath = process.argv[2];
        callback("REPORT FOR " + filepath);

        const hash = md5File.sync(filename);
        let hashed;

        db.each('SELECT * FROM book WHERE hash = ' + hash, [], (err) => {
            if (err) {
                throw err;
            }
            else {
                hashed = rows.hash;
            }
        });

        let hashTitle;
        let hashCharacters;
        let hashSentences;
        let hashWords;
        let hashNum;
        let hashColeman;
        let hashReadability;

        if (hashed === hash) {
            db.get('SELECT * FROM book WHERE hash = ' + hash, [], (err, rows) => {
                if (err) {
                    throw err;
                }
                 hashTitle = rows.title;
                 hashCharacters = rows.characters;
                 hashSentences = rows.sentences;
                 hashWords = rows.words;
                 hashNum = rows.numbers;
                 hashColeman = rows.coleman;
                 hashReadability = rows.readability;

            });
            callback(hashCharacters + " characters");
            callback(hashSentences + " sentences");
            callback(hashWords+ " words");
            callback("Coleman-Liau Score: " + hashColeman);
            callback("Automated Readability Index: " + hashReadability);

        }

        else {
            // tokenize the files provided into characters (letters and numbers)
            let totChars = tokenize.characters()(contents);
            let extractChars = tokenize.filter(function (word, current, prev) {
                return (prev && /[A-Za-z]/.test(word[0]));
            });

            let char = extractChars(totChars);
            callback(char.length + " characters");

            let num = totChars.length - char.length;

            // tokenize into sentences
            const nonewlines = contents.split(/\n/).join(' ');
            let sentences = tokenizeEnglish.sentences()(nonewlines);
            callback(sentences.length + " sentences");

            // tokenize into words
            let words = tokenize.words()(contents);
            callback(words.length + " words");

            callback("----------------------------");
            let coleman = colemanLiau(char.length, words.length, sentences.length);
            let readability = automatedReadabilityIndex(char.length, num, words.length, sentences.length);
            callback("Coleman-Liau Score: " + coleman);
            //letters, numbers, words, sentences
            callback("Automated Readability Index: " + readability);

            addToSQL(process.argv[2], char.length, sentences.length, words.length, num, coleman, readability, hash);
        }
    });
}

// Computes Coleman-Liau readability index
function colemanLiau(letters, words, sentences) {
    return (0.0588 * (letters * 100 / words))
        - (0.296 * (sentences * 100 / words))
        - 15.8;
}

// Computes Automated Readability Index
function automatedReadabilityIndex(letters, numbers, words, sentences) {
    return (4.71 * ((letters + numbers) / words))
        + (0.5 * (words / sentences))
        - 21.43;

}

function addToSQL (file, chars, sents, wrds, nums, cols, reads, hash) {
    db.run('INSERT INTO book (title, characters, sentences, words, numbers,coleman, readability, hash) VALUES (?,?,?,?,?,?,?,?)',
        [file, chars, sents, wrds, nums,cols, reads, hash], (err) => {
        if (err) {
            throw err;
        }
        });
}

// Calls the readability function on the provided file and defines callback behavior
if (process.argv.length >= 3) {
    readability(process.argv[2], data => {
        console.log(data);
    });
}
else {
    console.log("Usage: node readability.js <file>");
}
