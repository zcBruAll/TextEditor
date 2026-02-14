export class Highlighter {
    tokenize(line) {
        return [{ val: line, type: "default" }];
    }
}