// A very simple syntax highlighter for Cypher, created using ChatGPT and
// - https://ace.c9.io/#nav=higlighter
// - https://ace.c9.io/tool/mode_creator.html

ace.define( "ace/mode/cypher_highlight_rules", ["require", "exports", "ace/lib/oop", "ace/mode/text_highlight_rules"], function ( require, exports ) {
    const oop = require( "ace/lib/oop" );
    const TextHighlightRules = require( "ace/mode/text_highlight_rules" ).TextHighlightRules;

    const CypherHighlightRules = function () {
        const keywords = (
                "MATCH|RETURN|WHERE|CREATE|MERGE|SET|DELETE|DETACH|REMOVE|" +
                "WITH|ORDER|BY|LIMIT|SKIP|ASC|DESC|AND|OR|NOT|IN|IS|NULL|" +
                "UNWIND|AS|ON|OPTIONAL|USING|INDEX|DROP|CALL|YIELD|UNION|USE"
        );

        const keywordMapper = this.createKeywordMapper( {
            "keyword": keywords
        }, "identifier", true );

        this.$rules = {
            "start": [
                {
                    token: "comment",
                    regex: /\/\/.*$/
                },
                {
                    token: "comment.start",
                    regex: /\/\*/,
                    next: "comment"
                },
                {
                    token: "string", // single-quoted
                    regex: /'(?:[^'\\]|\\.)*'/
                },
                {
                    token: "string", // double-quoted
                    regex: /"(?:[^"\\]|\\.)*"/
                },
                // Labels like :Person
                {
                    token: ["text", "entity.other.attribute-name"],
                    regex: /(:)(\w+)/
                },
                // Relationship types like [:ACTED_IN]
                {
                    token: ["paren.lparen", "entity.other.attribute-name", "paren.rparen"],
                    regex: /(\[:)(\w+)(])/
                },
                // Node parentheses or relationship brackets
                {
                    token: "paren.lparen",
                    regex: /[(\[{]/
                },
                {
                    token: "paren.rparen",
                    regex: /[)\]}]/
                },
                {
                    token: "constant.numeric",
                    regex: /\b\d+\b/
                },
                {
                    token: keywordMapper,
                    regex: /\b\w+\b/
                }
            ],
            "comment": [
                {
                    token: "comment.end",
                    regex: /\*\//,
                    next: "start"
                },
                {
                    defaultToken: "comment"
                }
            ]
        };

        this.normalizeRules();
    };

    oop.inherits( CypherHighlightRules, TextHighlightRules );
    exports.CypherHighlightRules = CypherHighlightRules;
} );

ace.define( "ace/mode/cypher", ["require", "exports", "ace/lib/oop", "ace/mode/text", "ace/mode/cypher_highlight_rules"], function ( require, exports ) {
    const oop = require( "ace/lib/oop" );
    const TextMode = require( "ace/mode/text" ).Mode;
    const CypherHighlightRules = require( "ace/mode/cypher_highlight_rules" ).CypherHighlightRules;

    const Mode = function () {
        this.HighlightRules = CypherHighlightRules;
        this.$id = "ace/mode/cypher";
    };
    oop.inherits( Mode, TextMode );

    exports.Mode = Mode;
} );
