export class Editor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Config
        this.dpr = 1;
        this.paddingHeight = 16;
        this.fontSize = 16;
        this.lineHeight = 20;
        this.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

        this._measure();
        this.paddingWidth = 16 + 4 * this.charWidth;

        this.lines = [
            "Custom text-editor - A completely hand-made editor",
            "It's not a \"serious\" project as it's mainly to be able to say I've made one.",
            "",
            "What's implemented:",
            "  - Prints printable characters",
            "  - Arrows handling (with Ctrl)",
            "  - Enter",
            "  - Backspace/Delete (with Ctrl)",
            "  - Tab",
            "  - Home + End (with Ctrl)",
            "  - Page Up / Down (with Ctrl)",
            "  - Selection of text",
            "  - Shift commands (Shift+End, etc.)",
            "  - Ctrl commands (Ctrl+A, etc.)",
            "  - Local save",
            "  - Undo / Redo",
            "  - Line numbers",
            "",
            "Will be implemented:",
            "  - Colors",
            "  - Syntax highlight",
            "  - And maybe much more!"
        ];

        this.lineLimit = 9999;

        this.cursor = { line: 0, col: 0 };
        this.scrollY = 0;
        this.scrollX = 0;

        this.caretVisible = true;
        this.skipCaretChange = false;

        this.inSelection = false;
        this.selection = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } };

        this.preferredCursorCol = null;

        this.undos = [];
        this.redos = [];
    }

    isSpecialChar(char) {
        return /\W/.test(char);
    }

    setDpr(dpr) {
        this.dpr = dpr;
        this._measure();
    }

    setCursor(line, col, usePreferredCol = false) {
        this.cursor.line = this._clamp(line, 0, this.lines.length - 1);

        if (!usePreferredCol) {
            this.cursor.col = this._clamp(col, 0, this.lines[this.cursor.line].length);
            this.preferredCursorCol = null;
            return;
        }

        if (!this.preferredCursorCol) {
            this.preferredCursorCol = this.cursor.col;
        }
        this.cursor.col = Math.min(this.preferredCursorCol, this.lines[this.cursor.line].length);
    }

    clearLines() {
        this.lines = [];
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

        const textRelativeX = this.cursor.col * this.charWidth;
        const caretY = this.paddingHeight + this.cursor.line * this.lineHeight;

        const margin = 24;

        const visibleTextWidth = viewH - this.paddingWidth;

        if (textRelativeX - margin < this.scrollX) this.scrollX = Math.max(0, textRelativeX - margin);
        if (caretY - margin < this.scrollY) this.scrollY = Math.max(0, caretY - margin);

        if (textRelativeX + margin > this.scrollX + viewW) this.scrollX = textRelativeX + margin - visibleTextWidth;
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
        this.setCursor(pos.line, pos.col);
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
        this.setCursor(pos.line, pos.col);
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
        const alt = e.altKey;
        if (alt) return;
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
                this._backspace({ ctrl, shift });
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
        let content = "";
        switch (e.key) {
            case "a":
                e.preventDefault();
                const lastLine = this.lines[this.lines.length - 1] ?? "";
                this.setCursor(this.lines.length - 1, lastLine.length);
                this.inSelection = true;
                this.selection = { start: { line: 0, col: 0 }, end: { line: this.lines.length - 1, col: lastLine.length } };
                break;
            case "z":
                e.preventDefault();
                if (this.undos.length <= 1) return;
                this.redos.push(this.lines.join("\n"));
                this.undos.pop();
                content = this.undos[this.undos.length - 1];
                this.lines = content.split("\n");
                this.setCursor(0, 0);
                break;
            case "y":
                e.preventDefault();
                if (this.redos.length <= 0) return;
                content = this.redos.pop();
                this._addUndo(false);
                this.lines = content.split("\n");
                this.setCursor(0, 0);
                break;
            default:
                break;
        }
    }

    _addUndo(clearRedo = true) {
        while (this.undos.length >= 50) {
            this.undos.pop();
        }
        let text = this.lines.join("\n");
        this.undos.push(text);
        if (clearRedo) {
            this.redos = [];
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

        this.setCursor(startLine, startCol);
    }

    _insertText(text) {
        this._deleteSelection();

        const lines = text.replace(/\r/g, "").split("\n");

        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";

        if (lines.length == 1) {
            this.lines[line] = s.slice(0, col) + text + s.slice(col);
            this.lines.splice(10_000);
            this.setCursor(line, col + text.length);
        } else {
            const prefix = s.slice(0, col) + lines[0];
            const suffix = lines[lines.length - 1] + s.slice(col);

            this.lines.splice(line, 1, prefix, ...lines.slice(1, -1), suffix);

            this.lines.splice(this.lineLimit);
            this.setCursor(line + lines.length - 1, lines[lines.length - 1].length);
        }

        localStorage.setItem('editorContent', this.lines.join("\n"));
        this._addUndo();
    }

    _insertNewLine() {
        this._deleteSelection();

        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";
        const left = s.slice(0, col);
        const right = s.slice(col);
        this.lines[line] = left;
        this.lines.splice(line + 1, 0, right);
        this.lines.splice(this.lineLimit);
        this.setCursor(line + 1, 0);

        localStorage.setItem('editorContent', this.lines.join("\n"));
        this._addUndo();
    }

    _backspace({ ctrl, shift }) {
        if (this.inSelection) {
            this._deleteSelection();
            localStorage.setItem('editorContent', this.lines.join("\n"));
            this._addUndo();
            return;
        }

        const { line, col } = this.cursor;
        if (line === 0 && col === 0) return;

        const s = this.lines[line] ?? "";
        if (col > 0) {
            if (!ctrl) {
                this.lines[line] = s.slice(0, col - 1) + s.slice(col);
                this.setCursor(line, col - 1);

                localStorage.setItem('editorContent', this.lines.join("\n"));
                this._addUndo();
                return;
            }

            let i = col - 1;
            while (i >= 0 && this.isSpecialChar(this.lines[line][i])) {
                i--;
            }
            while (i >= 0 && !this.isSpecialChar(this.lines[line][i])) {
                i--;
            }

            const newCol = i + 1;
            this.lines[line] = s.slice(0, newCol) + s.slice(col);
            this.setCursor(line, newCol);

            localStorage.setItem('editorContent', this.lines.join("\n"));
            this._addUndo();
            return;
        }

        // Merge with previous line when col === 0
        const prev = this.lines[line - 1] ?? "";
        this.lines[line - 1] = prev + s;
        this.lines.splice(line, 1);
        this.setCursor(line - 1, prev.length);

        localStorage.setItem('editorContent', this.lines.join("\n"));
        this._addUndo();
    }

    _delete({ ctrl, shift }) {
        if (this.inSelection) {
            this._deleteSelection();
            return;
        }

        const { line, col } = this.cursor;
        if (line === this.lines.length - 1 && col === this.lines[line].length)
            return;

        const s = this.lines[line];
        const length = this.lines[line].length
        if (col < length) {
            if (!ctrl) {
                this.lines[line] = s.slice(0, col) + s.slice(col + 1);

                localStorage.setItem('editorContent', this.lines.join("\n"));
                this._addUndo();
                return;
            }

            let i = col;
            while (i < length && !this.isSpecialChar(this.lines[line][i])) i++;
            while (i < length && this.isSpecialChar(this.lines[line][i])) i++;
            this.lines[line] = s.slice(0, col) + s.slice(i);

            localStorage.setItem('editorContent', this.lines.join("\n"));
            this._addUndo();
            return;
        }

        // Merge next line when col === line.length
        const next = this.lines[line + 1] ?? "";
        this.lines[line] = s + next;
        this.lines.splice(line + 1, 1);

        localStorage.setItem('editorContent', this.lines.join("\n"));
        this._addUndo();
    }

    // Cursor movement
    _moveLeft({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (!ctrl) {
            if (col > 0) {
                this.setCursor(line, col - 1);
            } else if (line > 0) {
                this.cursor(line - 1, (this.lines[this.cursor.line] ?? "").length);
            }

            this._selectToCursor(shift, line, col);

            return;
        }

        if (col == 0) {
            if (line > 0) {
                this.setCursor(line - 1, (this.lines[this.cursor.line] ?? "").length);
            }

            this._selectToCursor(shift, line, col);
            return;
        }

        let i = col - 1;
        while (i >= 0 && this.isSpecialChar(this.lines[line][i])) i--;
        while (i >= 0 && !this.isSpecialChar(this.lines[line][i])) i--;
        this.setCursor(line, i + 1);

        this._selectToCursor(shift, line, col);
    }

    _moveRight({ ctrl, shift }) {
        const { line, col } = this.cursor;
        const length = (this.lines[line] ?? "").length;

        if (!ctrl) {
            if (col < length) {
                this.setCursor(line, col + 1);
            } else if (line < this.lines.length - 1) {
                this.setCursor(line + 1, 0);
            }

            this._selectToCursor(shift, line, col);

            return;
        }

        if (col == length) {
            if (line < this.lines.length) {
                this.setCursor(line + 1, 0);
            }

            this._selectToCursor(shift, line, col);
            return;
        }

        let i = col + 1;
        while (i < length && !this.isSpecialChar(this.lines[line][i])) i++;
        while (i < length && this.isSpecialChar(this.lines[line][i])) i++;
        this.setCursor(line, Math.min(length, i));

        this._selectToCursor(shift, line, col);
    }

    _moveUp({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (!ctrl && line > 0) {
            this.setCursor(line - 1, col, true);
        } else if (ctrl) {
            this.setCursor(line, 0);
        }

        this._selectToCursor(shift, line, col);
    }

    _moveDown({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (!ctrl && line < this.lines.length - 1) {
            this.setCursor(line + 1, col, true);
        } else if (ctrl) {
            this.setCursor(line, this.lines[line].length);
        }

        this._selectToCursor(shift, line, col);
    }

    _moveEnd({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (ctrl) {
            this.setCursor(this.lines.length - 1, this.lines[this.lines.length - 1].length);
        } else {
            this.setCursor(line, this.lines[line].length);
        }

        this._selectToCursor(shift, line, col);
    }

    _moveHome({ ctrl, shift }) {
        const { line, col } = this.cursor;

        let newLine = line;

        if (ctrl) {
            newLine = 0;
        }

        this.setCursor(newLine, 0);

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

        let newCol = Math.min(this.lines[this.cursor.line].length, col);
        let cancelPreferred = false;

        if (line - linesPerPage < 0) {
            newCol = 0;
            cancelPreferred = true;
        }

        this.setCursor(Math.max(minLine, line - linesPerPage), newCol, !cancelPreferred);

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

        let newCol = Math.min(this.lines[this.cursor.line].length, col);
        let cancelPreferred = false;

        if (line + linesPerPage > this.lines.length - 1) {
            newCol = this.lines[this.lines.length - 1].length;
            cancelPreferred = true;
        }

        this.setCursor(Math.min(line + linesPerPage, maxLine), newCol, !cancelPreferred);

        this._selectToCursor(shift, line, col);
    }

    _posFromMouseEvent(e) {
        const rect = this.canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const contentX = x + this.scrollX - this.paddingWidth;
        const contentY = y + this.scrollY - this.paddingHeight;

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
            const x = this.paddingWidth - this.scrollX;
            const minChar = Math.ceil((this.paddingWidth - x) / this.charWidth);
            const y = this.paddingHeight + i * this.lineHeight - this.scrollY;

            if (this.inSelection && selStart.line <= i && selEnd.line >= i) {
                const selColStart = selStart.line < i ? 0 : selStart.col;
                const selColEnd = selEnd.line > i ? this.lines[i].length : selEnd.col;
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.fillRect(x + selColStart * this.charWidth, y - 1, (selColEnd - selColStart) * this.charWidth, this.lineHeight - 2);
            }

            const lineNumber = String(i + 1).padStart(4);
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.fillText(lineNumber, 8, y);

            ctx.fillStyle = "#ffffffff";
            ctx.fillText(this.lines[i].substring(minChar), this.paddingWidth, y);
        }

        // Caret
        if (this.caretVisible) {
            const cx = this.paddingWidth + this.cursor.col * this.charWidth - this.scrollX;
            const cy = this.paddingHeight + this.cursor.line * this.lineHeight - 2 - this.scrollY;

            if (cx >= -2 && cx <= w + 2 && cy >= -this.lineHeight && cy <= h + this.lineHeight) {
                ctx.fillStyle = "#ffffffff";
                ctx.fillRect(cx, cy, 2, this.lineHeight);
            }
        }
    }
}
