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

        this.lines = [
            "Custom text-editor - A completely hand-made editor",
            "It's not a \"serious\" project as it's mainly to be able to say I've made one.",
            "",
            "What's implemented:",
            "  - Prints printable characters",
            "  - Arrows handling",
            "  - Enter",
            "  - Backspace",
            "  - Tab",
            "  - Home + End (with Ctrl)",
            "  - Page Up / Down (with Ctrl)",
            "  - Selection of text",
            "  - Shift commands (Shift+End, etc.)",
            "  - Ctrl commands (Ctrl+A, etc.)",
            "",
            "Will be implemented:",
            "  - Colors",
            "  - Syntax highlight",
            "  - And maybe much more!"
        ];

        this.cursor = { line: 0, col: 0 };
        this.scrollY = 0;
        this.scrollX = 0;

        this.caretVisible = true;
        this.skipCaretChange = false;

        this.inSelection = false;
        this.selection = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } };

        this.specialChars = [" ", "+", "-"];

        this._measure();
    }

    isSpecialChar(char) {
        return this.specialChars.includes(char);
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

    toggleCaret() {
        if (!this.skipCaretChange) this.caretVisible = !this.caretVisible;
        else this.skipCaretChange = false;
        this.render();
    }

    _ensureVisibleCursor() {
        const viewW = this.canvas.width / this.dpr;
        const viewH = this.canvas.height / this.dpr;

        const caretX = this.padding + this.cursor.col * this.charWidth;
        const caretY = this.padding + this.cursor.line * this.lineHeight;

        const margin = 24;

        if (caretX - margin < this.scrollX) this.scrollX = Math.max(0, caretX - margin);
        if (caretY - margin < this.scrollY) this.scrollY = Math.max(0, caretY - margin);

        if (caretX + margin > this.scrollX + viewW) this.scrollX = caretX + margin - viewW;
        if (caretY + this.lineHeight + margin > this.scrollY + viewH) {
            this.scrollY = caretY + this.lineHeight + margin - viewH;
        }
    }

    _ensureVisibleCaret() {
        this.caretVisible = true;
        this.skipCaretChange = true;
    }

    // Mouse inputs
    onMouseDown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        this._ensureVisibleCaret();
        const pos = this._posFromMouseEvent(e);
        const { line, col } = this.cursor;
        this.cursor = pos;
        this._selectToCursor(shift, line, col);
        this._ensureVisibleCursor();
        this.render();
    }

    onMouseMove(e) {
        if (e.buttons != 1) return;
        e.preventDefault();
        this._ensureVisibleCaret();
        const pos = this._posFromMouseEvent(e);
        const { line, col } = this.cursor;
        this.cursor = pos;
        this._selectToCursor(true, line, col);
        this._ensureVisibleCursor();
        this.render();
    }

    onWheel(e) {
        e.preventDefault();
        this.scrollY = this._clamp(this.scrollY + e.deltaY, 0, (this.lines.length - 1) * this.lineHeight);
        this.render();
    }

    // Keyboard inputs
    onKeyDown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        switch (e.key) {
            // Arrows
            case "ArrowRight":
                e.preventDefault();
                this._moveRight({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "ArrowLeft":
                e.preventDefault();
                this._moveLeft({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "ArrowUp":
                e.preventDefault();
                this._moveUp({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "ArrowDown":
                e.preventDefault();
                this._moveDown({ ctrl, shift });
                this._ensureVisibleCaret();
                break;

            case "End":
                e.preventDefault();
                this._moveEnd({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "Home":
                e.preventDefault();
                this._moveHome({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "PageUp":
                e.preventDefault();
                this._movePageUp({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "PageDown":
                e.preventDefault();
                this._movePageDown({ ctrl, shift });
                this._ensureVisibleCaret();
                break;

            // Content special keys
            case "Enter":
                e.preventDefault();
                this._insertNewLine();
                this._ensureVisibleCaret();
                break;
            case "Backspace":
                e.preventDefault();
                this._ensureVisibleCaret();
                break;
            case "Delete":
                e.preventDefault();
                this._delete({ ctrl, shift });
                this._ensureVisibleCaret();
                break;
            case "Tab":
                e.preventDefault();
                this._insertText("  ");
                this._ensureVisibleCaret();
                break;

            default:
                // Printable characters
                if (e.key.length == 1) {
                    if (ctrl) {
                        this._handleCommand(e);
                    } else {
                        e.preventDefault();
                        this._insertText(e.key);
                    }
                    this._ensureVisibleCaret();
                }
                break;
        }

        this._ensureVisibleCursor();
        this.render();
    }

    _selectToCursor(shift, line, col) {
        if (shift) {
            if (this.inSelection) {
                this.selection.end = this.cursor;
            } else {
                this.inSelection = true;
                this.selection = { start: { line, col }, end: this.cursor };
            }
        } else {
            this.inSelection = false;
        }
    }

    _handleCommand(e) {
        switch (e.key) {
            case "a":
                e.preventDefault();
                const lastLine = this.lines[this.lines.length - 1] ?? "";
                this.cursor = { line: this.lines.length - 1, col: lastLine.length };
                this.inSelection = true;
                this.selection = { start: { line: 0, col: 0 }, end: { line: this.lines.length - 1, col: lastLine.length } };
                break;
            default:
                break;
        }
    }

    _getSelectionText() {
        if (!this.inSelection) return "";

        let selStart = this.selection.start;
        let selEnd = this.selection.end;

        if (selStart.line > selEnd.line || (selStart.line == selEnd.line && selStart.col > selEnd.col)) {
            [selStart, selEnd] = [selEnd, selStart];
        }

        if (selStart.line == selEnd.line) {
            return (this.lines[selStart.line]).slice(selStart.col, selEnd.col + 1);
        }

        const text = [];
        text.push((this.lines[selStart.line] ?? "").slice(selStart.col));
        for (let i = selStart.line + 1; i < selEnd.line; i++) {
            text.push(this.lines[i] ?? "");
        }
        text.push((this.lines[selEnd.line] ?? "").slice(0, selEnd.col));
        return text.join("\n");
    }

    // Text management
    _deleteSelection() {
        if (!this.inSelection) return;
        this.inSelection = false;

        let selStart = this.selection.start;
        let selEnd = this.selection.end;

        if (selStart.line == selEnd.line && selStart.col == selEnd.col) return;

        if (selStart.line > selEnd.line || (selStart.line == selEnd.line && selStart.col > selEnd.col)) {
            [selStart, selEnd] = [selEnd, selStart];
        }

        const startLine = selStart.line;
        const endLine = selEnd.line;
        const startCol = selStart.col;
        const endCol = selEnd.col;

        const first = this.lines[startLine] ?? "";
        const last = this.lines[endLine] ?? "";

        const prefix = first.slice(0, startCol);
        const suffix = last.slice(endCol);

        const mergedLine = prefix + suffix;

        const deleteCount = endLine - startLine + 1;
        this.lines.splice(startLine, deleteCount, mergedLine);

        this.cursor.line = startLine;
        this.cursor.col = startCol;
    }

    _insertText(text) {
        this._deleteSelection();

        const lines = text.replace(/\r/g, "").split("\n");

        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";

        if (lines.length == 1) {
            this.lines[line] = s.slice(0, col) + text + s.slice(col);
            this.cursor.col += text.length;
        } else {
            const prefix = s.slice(0, col) + lines[0];
            const suffix = lines[lines.length - 1] + s.slice(col);

            this.lines.splice(line, 1, prefix, ...lines.slice(1, -1), suffix);

            this.cursor.line = line + lines.length - 1;
            this.cursor.col = lines[lines.length - 1].length;
        }
    }

    _insertNewLine() {
        this._deleteSelection();

        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";
        const left = s.slice(0, col);
        const right = s.slice(col);
        this.lines[line] = left;
        this.lines.splice(line + 1, 0, right);
        this.cursor.line += 1;
        this.cursor.col = 0;
    }

    _backspace({ ctrl, shift }) {
        if (this.inSelection) {
            this._deleteSelection();
            return;
        }

        const { line, col } = this.cursor;
        if (line === 0 && col === 0) return;

        const s = this.lines[line] ?? "";
        if (col > 0) {
            this.lines[line] = s.slice(0, col - 1) + s.slice(col);
            this.cursor.col -= 1;
            return;
        }

        // Merge with previous line when col === 0
        const prev = this.lines[line - 1] ?? "";
        this.lines[line - 1] = prev + s;
        this.lines.splice(line, 1);
        this.cursor.line -= 1;
        this.cursor.col = prev.length;
    }

    _delete({ ctrl, shift }) {
        if (this.inSelection) {
            this._deleteSelection();
            return;
        };

        const { line, col } = this.cursor;
        if (line === this.lines.length - 1 && col === this.lines[line].length) return;

        const s = this.lines[line];
        if (col < this.lines[line].length) {
            this.lines[line] = s.slice(0, col) + s.slice(col + 1);
            return;
        }

        // Merge next line when col === line.length
        const next = (this.lines[line + 1] ?? "");
        this.lines[line] = s + next;
        this.lines.splice(line + 1, 1);
    }

    // Cursor movement
    _moveLeft({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (!ctrl) {
            if (col > 0) {
                this.cursor.col -= 1;
            } else if (line > 0) {
                this.cursor.line -= 1;
                this.cursor.col = (this.lines[this.cursor.line] ?? "").length;
            }

            this._selectToCursor(shift, line, col);

            return;
        }

        if (col == 0) {
            if (line > 0) {
                this.cursor.line -= 1;
                this.cursor.col = (this.lines[this.cursor.line] ?? "").length;
            }

            this._selectToCursor(shift, line, col);
            return;
        }

        let i = col - 1;

        while (i >= 0 && this.isSpecialChar(this.lines[line][i])) i--;

        while (i >= 0 && !this.isSpecialChar(this.lines[line][i])) i--;

        this.cursor.col = i + 1;

        this._selectToCursor(shift, line, col);
    }

    _moveRight({ ctrl, shift }) {
        const { line, col } = this.cursor;
        const length = (this.lines[line] ?? "").length

        if (!ctrl) {
            if (col < length) {
                this.cursor.col += 1;
            } else if (line < this.lines.length - 1) {
                this.cursor.line += 1;
                this.cursor.col = 0;
            }

            this._selectToCursor(shift, line, col);

            return;
        }

        if (col == length) {
            if (line < this.lines.length) {
                this.cursor.line += 1;
                this.cursor.col = 0;
            }

            this._selectToCursor(shift, line, col);
            return;
        }

        let i = col + 1;

        while (i < length && this.isSpecialChar(this.lines[line][i])) i++;

        while (i < length && !this.isSpecialChar(this.lines[line][i])) i++;

        this.cursor.col = i + 1;

        this._selectToCursor(shift, line, col);
    }

    _moveUp({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (line > 0) {
            this.cursor.line -= 1;
            if (col >= this.lines[line - 1].length) {
                this.cursor.col = this.lines[line - 1].length;
            }
        }

        this._selectToCursor(shift, line, col);
    }

    _moveDown({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (line < this.lines.length - 1) {
            this.cursor.line += 1;
            if (col >= this.lines[line + 1].length) {
                this.cursor.col = this.lines[line + 1].length;
            }
        }

        this._selectToCursor(shift, line, col);
    }

    _moveEnd({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (ctrl) {
            this.cursor.line = this.lines.length - 1;
            this.cursor.col = this.lines[this.lines.length - 1].length;
        } else {
            this.cursor.col = this.lines[line].length;
        }

        this._selectToCursor(shift, line, col);
    }

    _moveHome({ ctrl, shift }) {
        const { line, col } = this.cursor;

        this.cursor.col = 0;

        if (ctrl) {
            this.cursor.line = 0;
        }

        this._selectToCursor(shift, line, col);
    }

    _movePageUp({ ctrl, shift }) {
        const { line, col } = this.cursor;

        const h = this.canvas.height / this.dpr;
        const linesPerPage = Math.floor((h + this.lineHeight) / this.lineHeight);

        let minLine = 0;

        if (ctrl) {
            // Theorically works but un-testable on browser, it captures it first
            minLine = Math.max(0, Math.floor(this.scrollY / this.lineHeight));
        }

        this.cursor.line = Math.max(minLine, line - linesPerPage);

        if (line - linesPerPage < 0) {
            this.cursor.col = 0;
        } else {
            this.cursor.col = Math.min(this.lines[this.cursor.line].length, col);
        }

        this._selectToCursor(shift, line, col);
    }

    _movePageDown({ ctrl, shift }) {
        const { line, col } = this.cursor;

        const h = this.canvas.height / this.dpr;
        const linesPerPage = Math.floor((h + this.lineHeight) / this.lineHeight);

        let maxLine = this.lines.length - 1;

        if (ctrl) {
            // Theorically works but un-testable on browser, it captures it first
            maxLine = Math.min(this.lines.length, startLine + Math.ceil((h + this.lineHeight) / this.lineHeight));
        }

        this.cursor.line = Math.min(line + linesPerPage, maxLine);

        if (line + linesPerPage > this.lines.length - 1) {
            this.cursor.col = this.lines[this.lines.length - 1].length;
        } else {
            this.cursor.col = Math.min(this.lines[this.cursor.line].length, col);
        }

        this._selectToCursor(shift, line, col);
    }

    _posFromMouseEvent(e) {
        const rect = this.canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const contentX = x + this.scrollX - this.padding;
        const contentY = y + this.scrollY - this.padding;

        const line = this._clamp(
            Math.floor(contentY / this.lineHeight),
            0,
            this.lines.length - 1
        );

        const col = this._clamp(
            Math.round(contentX / this.charWidth),
            0,
            (this.lines[line] ?? "").length
        );

        return { line, col };
    }

    _clamp(value, low, high) {
        return Math.max(low, Math.min(high, value));
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

        const startLine = Math.max(0, Math.floor(this.scrollY / this.lineHeight));
        const endLine = Math.min(this.lines.length, startLine + Math.ceil((h + this.lineHeight) / this.lineHeight));

        // Selection on displayed lines
        let selStart = this.selection.start;
        let selEnd = this.selection.end;
        if (this.selection.start.line > this.selection.end.line || (this.selection.start.line == this.selection.end.line && this.selection.start.col > this.selection.end.col)) {
            selStart = this.selection.end;
            selEnd = this.selection.start;
        }

        for (let i = startLine; i < endLine; i++) {
            const x = this.padding - this.scrollX;
            const y = this.padding + i * this.lineHeight - this.scrollY;

            if (this.inSelection && selStart.line <= i && selEnd.line >= i) {
                const selColStart = selStart.line < i ? 0 : selStart.col;
                const selColEnd = selEnd.line > i ? this.lines[i].length : selEnd.col;
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
                ctx.fillRect(x + selColStart * this.charWidth, y - 1, (selColEnd - selColStart) * this.charWidth, this.lineHeight - 2);
            }

            ctx.fillStyle = "#ffffffff";
            ctx.fillText(this.lines[i], x, y);
        }

        // Caret
        if (this.caretVisible) {
            const cx = this.padding + this.cursor.col * this.charWidth - this.scrollX;
            const cy = this.padding + this.cursor.line * this.lineHeight - 2 - this.scrollY;

            if (cx >= -2 && cx <= w + 2 && cy >= -this.lineHeight && cy <= h + this.lineHeight) {
                ctx.fillStyle = "#ffffffff";
                ctx.fillRect(cx, cy, 2, this.lineHeight);
            }
        }
    }
}