import { C89Highlighter } from "./c89.js";
import { JsHighlighter } from "./js.js";
import { TextHighlighter } from "./text.js";

export function initHighlighter(language, editor) {
    switch (language) {
        case "JAVASCRIPT":
        case "JS":
            return new JsHighlighter(editor);
        case "C":
        case "C89":
            return new C89Highlighter(editor);
        case "TXT":
        default:
            return new TextHighlighter(editor);
    }
}