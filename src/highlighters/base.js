export class Highlighter {
    constructor(editor) {
        this.editor = editor;
    }

    tokenize(line) {
        const content = this.editor._lineAt(line).content;
        return [{ val: content, type: "default" }];
    }
}