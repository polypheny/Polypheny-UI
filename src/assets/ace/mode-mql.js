// A very simple syntax highlighter for MQL, created using ChatGPT and
// - https://ace.c9.io/#nav=higlighter
// - https://ace.c9.io/tool/mode_creator.html

ace.define( "ace/mode/mql_highlight_rules", ["require", "exports", "ace/lib/oop", "ace/mode/text_highlight_rules"], function ( require, exports ) {
    const oop = require( "ace/lib/oop" );
    const TextHighlightRules = require( "ace/mode/text_highlight_rules" ).TextHighlightRules;

    const MongoHighlightRules = function () {
        const operators = (
                "$match|$group|$project|$limit|$skip|$sort|$unwind|$lookup|" +
                "$in|$and|$or|$not|$eq|$gt|$gte|$lt|$lte|$ne|$exists|$regex|" +
                "$push|$addToSet|$sum|$avg|$min|$max|$first|$last|$count"
        );

        const keywordMapper = this.createKeywordMapper( {
            "support.function": operators
        }, "identifier", true );

        this.$rules = {
            "start": [
                // Comments
                { token: "comment", regex: /\/\/.*$/ },
                { token: "comment.start", regex: /\/\*/, next: "comment" },

                // Strings
                { token: "string", regex: /"(?:[^"\\]|\\.)*"/ },
                { token: "string", regex: /'(?:[^'\\]|\\.)*'/ },

                // Numbers
                { token: "constant.numeric", regex: /\b\d+(\.\d+)?\b/ },

                // Function/method calls like db.collection.find()
                {
                    token: ["variable.language", "text", "support.function"],
                    regex: /(db)(\.)(\w+)(?=\()/
                },

                // MongoDB operators like $match
                {
                    token: "support.function",
                    regex: /\$[a-zA-Z_][a-zA-Z0-9_]*/
                },

                // Braces and brackets
                { token: "paren.lparen", regex: /[\[{(]/ },
                { token: "paren.rparen", regex: /[\]})]/ },

                // Keywords, fallback
                {
                    token: keywordMapper,
                    regex: /\b\w+\b/
                }
            ],
            "comment": [
                { token: "comment.end", regex: /\*\//, next: "start" },
                { defaultToken: "comment" }
            ]
        };

        this.normalizeRules();
    };

    oop.inherits( MongoHighlightRules, TextHighlightRules );
    exports.MongoHighlightRules = MongoHighlightRules;
} );

ace.define( "ace/mode/mql", ["require", "exports", "ace/lib/oop", "ace/mode/text", "ace/mode/mql_highlight_rules"], function ( require, exports ) {
    const oop = require( "ace/lib/oop" );
    const TextMode = require( "ace/mode/text" ).Mode;
    const MongoHighlightRules = require( "ace/mode/mql_highlight_rules" ).MongoHighlightRules;

    const Mode = function () {
        this.HighlightRules = MongoHighlightRules;
        this.$id = "ace/mode/mql";
    };
    oop.inherits( Mode, TextMode );

    exports.Mode = Mode;
} );
