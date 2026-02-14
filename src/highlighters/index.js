import { C89Highlighter } from "./c89.js";
import { JsHighlighter } from "./js.js";
import { TextHighlighter } from "./text.js";

export function initHighlighter(language) {
    switch (language) {
        case "JAVASCRIPT":
        case "JS":
            return new JsHighlighter();
        case "C":
        case "C89":
            return new C89Highlighter();
        case "TXT":
        default:
            return new TextHighlighter();
    }
}