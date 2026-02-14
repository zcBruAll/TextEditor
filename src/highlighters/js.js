import { Highlighter } from "./base.js";

export class JsHighlighter extends Highlighter {
    constructor() {
        super();
        this.keywords = new Set([
            "var", "let", "const", "function", "class",
            "if", "else", "switch", "case", "default",
            "for", "while", "do", "break", "continue",
            "try", "catch", "finally", "throw",
            "import", "export", "from", "as",
            "new", "this", "super", "extends",
            "return", "yield", "await", "async",
            "typeof", "instanceof", "in",
            "delete", "void", "debugger", "with",
            "enum",
            "implements", "interface", "package",
            "private", "protected", "public",
            "eval", "arguments",
            "get", "set", "static"
        ]);

        this.literals = new Set([
            "true", "false",
            "null", "undefined",
            "NaN", "Infinity"
        ]);

        this._stringChar = ['"', "'", "`"];
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
                tokens.push({ val: value, type: 'default' });
                continue;
            }

            if (char == '/' && line[i + 1] == '/') {
                tokens.push({ val: line.substring(i), type: 'comment' });
                break;
            }

            if (char == '/' && line[i + 1] == '*') {
                let value = "/*";
                i += 2;
                while (i < line.length && (line[i - 1] != "*" || line[i] != "/")) {
                    value += line[i++];
                }
                if (i < line.length && line[i - 1] == "*" && line[i] == "/") {
                    value += "/";
                    i++;
                }
                tokens.push({ val: value, type: 'comment' });
                continue;
            }

            if (this._stringChar.includes(char)) {
                const searchFor = char;
                let value = char;
                i++;
                while (i < line.length && line[i] != searchFor) {
                    value += line[i++];
                }
                if (i < line.length && line[i] == searchFor) value += searchFor;
                i++;
                tokens.push({ val: value, type: 'string' });
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