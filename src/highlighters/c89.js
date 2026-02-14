import { Highlighter } from "./base.js";

export class C89Highlighter extends Highlighter {
    constructor(editor) {
        super(editor);
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

        let lastState = "normal";
        if (line > 0) {
            lastState = this.editor._lineAt(line - 1).lastState;
        }
        const s = this.editor._lineAt(line).content;

        while (i < s.length) {
            const char = s[i];

            if (lastState == "normal" && /\s/.test(char)) {
                let value = "";
                while (i < s.length && /\s/.test(s[i])) {
                    value += s[i++];
                }
                tokens.push({ val: value, type: 'default' });
                continue;
            }

            if (lastState == "normal" && char == '/' && s[i + 1] == '/') {
                tokens.push({ val: s.substring(i), type: 'comment' });
                break;
            }

            if (lastState == "normal" && char == '/' && s[i + 1] == '*') {
                let value = "/*";
                i += 2;
                while (i < s.length && (s[i - 1] != "*" || s[i] != "/")) {
                    value += s[i++];
                }
                if (i < s.length && s[i - 1] == "*" && s[i] == "/") {
                    value += "/";
                    i++;
                } else {
                    lastState = "comment";
                }
                tokens.push({ val: value, type: 'comment' });
                continue;
            }

            if (lastState == "comment" && char == '*' && s[i + 1] == '/') {
                lastState = "normal";
                i += 2;
                tokens.push({ val: s.substring(0, i), type: "comment" });
                continue;
            }

            if (lastState == "normal" && char == '"') {
                let value = '"';
                i++;
                while (i < s.length && s[i] != '"') {
                    value += s[i++];
                }
                if (i < s.length && s[i] == '"') value += '"';
                i++;
                tokens.push({ val: value, type: 'string' });
                continue;
            }

            if (lastState == "normal" && char == "<") {
                let value = '<';
                i++;
                while (i < s.length && s[i] != '>') {
                    value += s[i++];
                }
                if (i < s.length && s[i] == ">") value += '>';
                i++;
                tokens.push({ val: value, type: 'string' });
                continue;
            }

            if (lastState == "normal" && /[0-9]/.test(char)) {
                let value = "";
                while (i < s.length && /[0-9]/.test(s[i])) {
                    value += s[i++];
                }
                tokens.push({ val: value, type: 'literal' });
                continue;
            }

            if (lastState == "normal" && char == '#') {
                let value = "";
                while (i < s.length && !/\s/.test(s[i])) {
                    value += s[i++];
                }
                tokens.push({ val: value, type: 'special' });
                continue;
            }

            if (lastState == "normal" && /[a-zA-Z_]/.test(char)) {
                let value = "";
                while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
                    value += s[i++];
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

            if (lastState == "normal") {
                tokens.push({ val: char, type: 'operator' });
            }
            i++;
        }

        this.editor._lineAt(line).lastState = lastState;
        if (tokens.length == 0) {
            tokens.push({ val: this.editor._lineAt(line).content, type: lastState });
        }
        return tokens;
    }
}