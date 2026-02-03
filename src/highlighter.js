export class Highlighter {
    static initHighlighter(language) {
        switch (language) {
            case "C":
                return new C89Highlighter();
            case "txt":
            default:
                return new TextHighlighter();
        }
    }

    tokenize(line) {
        return [{val: line, type: "default"}];
    }
}

class TextHighlighter extends Highlighter {}

class C89Highlighter extends Highlighter {
    constructor() {
        super();
        this.keywords = new Set([
            "auto", "break", "case", "char", "const", "continue", "default", "do",
            "double", "else", "enum", "extern", "float", "for", "goto", "if",
            "int", "long", "register", "return", "short", "signed", "sizeof", "static",
            "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while"
        ]);

        this.literals = new Set([
            "true", "false", "NULL"
        ]);
    }

    tokenize(line) {
        let tokens = [];
        let i = 0;

        while (i < line.length) {
            const char = line[i];

            if (/\s/.test(char)) {
                let value = "";
                while (i < line.length && /\s/.test(line[i])) {
                    value += line[i++];
                }
                tokens.push({ val: value, type: 'default'});
                continue;
            }

            if (char == '/' && line[i+1] == '/') {
                tokens.push({val: line.substring(i), type: 'comment'});
                break;
            }

            if (char == '"') {
                let value = '"';
                i++;
                while (i < line.length && line[i] != '"') {
                    value += line[i++];
                }
                if (i < line.length && line[i] == '"') value += '"';
                i++;
                tokens.push({val: value, type: 'string'});
                continue;
            }

            if (char == "<") {
                let value = '<';
                i++;
                while (i < line.length && line[i] != '>') {
                    value += line[i++];
                }
                if (i < line.length && line[i] == ">") value += '>';
                i++;
                tokens.push({val: value, type: 'string'});
                continue;
            }

            if (/[0-9]/.test(char)) {
                let value = "";
                while (i < line.length && /[0-9]/.test(line[i])) {
                    value += line[i++];
                }
                tokens.push({ val: value, type: 'literal' });
                continue;
            }

            if (char == '#') {
                let value = "";
                while (i < line.length && !/\s/.test(line[i])) {
                    value += line[i++];
                }
                tokens.push({ val: value, type: 'special' });
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                let value = "";
                while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
                    value += line[i++];
                }
                let type = 'identifier';
                if (this.keywords.has(value)) {
                    type = 'keyword';
                } else if (this.literals.has(value)) {
                    type = 'literal';
                }
                
                tokens.push({ val: value, type: type });
                continue;
            }

            tokens.push({ val: char, type: 'operator' });
            i++;
        }
        return tokens;
    }
}