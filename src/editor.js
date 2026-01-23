export class Editor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Config
        this.dpr = 1;
        this.padding = 16;
        this.fontSize = 16;
        this.lineHeight = 20;
        this.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

        this.lines = [];

        this.cursor = { line: 0, col: 0 };

        this._measure();
    }

    setDpr(dpr) {
        this.dpr = dpr;
        this._measure();
    }

    _measure() {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        this.charWidth = ctx.measureText("M").width;
    }

    onKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            // Commands will be implemented later
            return;
        }

        switch (e.key) {
            // Arrows
            case "ArrowRight":
                e.preventDefault();
                this.cursor.col += 1;
                break;
            case "ArrowLeft":
                e.preventDefault();
                this.cursor.col -= 1;
                break;
            case "ArrowUp":
                e.preventDefault();
                this.cursor.line -= 1;
                break;
            case "ArrowDown":
                e.preventDefault();
                this.cursor.line += 1;
                break;

            // Content special keys
            case "Enter":
                e.preventDefault();
                this._insertNewLine();
                break;
            case "Backspace":
                e.preventDefault();
                this._backspace();
                break;
            case "Tab":
                e.preventDefault();
                this._insertText("  ");
                break;

            default:
                // Printable characters
                if (e.key.length == 1) {
                    e.preventDefault();
                    this._insertText(e.key);
                }
                break;
        }

        this.render();
    }

    _insertText(text) {
        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";
        this.lines[line] = s.slice(0, col) + text + s.slice(col);
        this.cursor.col += text.length;
    }

    _insertNewLine() {
        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";
        const left = s.slice(0, col);
        const right = s.slice(col);
        this.lines[line] = left;
        this.lines.splice(line + 1, 0, right);
        this.cursor.line += 1;
        this.cursor.col = 0;
    }

    _backspace() {
        const { line, col } = this.cursor;
        if (line === 0 && col === 0) return;

        const s = this.lines[line] ?? "";
        if (col > 0) {
            this.lines[line] = s.slice(0, col - 1) + s.slice(col);
            this.cursor.col -= 1;
            return;
        }

        // Merge with previous line when col === 0
        const prev = this.lines[line - 1] = prev + s;
        this.lines.splice(line, 1);
        this.cursor.line -= 1;
        this.cursor.col = prev.length;
    }

    render() {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        const w = this.canvas.width / this.dpr;
        const h = this.canvas.height / this.dpr;

        // Background
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#000000ff";
        ctx.fillRect(0, 0, w, h);

        // Text
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffffffff";

        for (let i = 0; i < this.lines.length; i++) {
            const x = this.padding;
            const y = this.padding + i * this.lineHeight;
            ctx.fillText(this.lines[i] ?? "", x, y);
        }
    }
}