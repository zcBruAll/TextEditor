import { Editor } from "../editor.js";
import { Highlighter } from "./base.js";

export class JsHighlighter extends Highlighter {
    /**
     * @param {Editor} editor
     */
    constructor(editor) {
        super(editor);
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

            if (lastState == "normal" && this._stringChar.includes(char)) {
                const searchFor = char;
                let value = char;
                i++;
                while (i < s.length && s[i] != searchFor) {
                    value += s[i++];
                }
                if (i < s.length && s[i] == searchFor) {
                    value += searchFor;
                    i++;
                }
                if (i >= s.length && searchFor == '`') {
                    lastState = "string";
                }
                tokens.push({ val: value, type: 'string' });
                continue;
            }

            if (lastState == "string" && char == '`') {
                lastState = "normal";
                i++;
                tokens.push({ val: s.substring(0, i), type: "string" });
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