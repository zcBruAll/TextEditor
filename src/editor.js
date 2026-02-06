import { Highlighter } from "./highlighter.js";
import { saveDocument } from "./storage.js";
import { Theme } from "./theme.js";

export class Editor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Config
        this.dpr = 1;
        this.fontSize = 16;
        this.lineHeight = 20;
        this.paddingHeight = 16;
        this.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

        this._measure();

        this.lines = [
            "lang: txt, theme: midnight",
            "",
            "Welcome.",
            "This is a custom text editor, built from scratch.",
            "No framework, no magic, just a canvas, code and curiosity.",
            "",
            "Let's take a quick tour.",
            "--- BASIC TYPING ---",
            " • Just start typing. Printable characters work as expected.",
            " • Enter creates a new line.",
            " • Tab inserts indentation.",
            " • Shift + Tab removes indentation.",
            "",
            "--- MOVING AROUND ---",
            " • Arrow keys move the caret.",
            " • Ctrl + Arrow jumps by word.",
            " • Home / End jump to line start / end.",
            " • Ctrl + Home / End jump to the start / end of the document.",
            " • Page Up / Page Down scroll vertically.",
            " • Mouse wheel also scroll vertically.",
            "",
            "--- SELECTION ---",
            " • Hold Shift while moving to select text.",
            " • Mouse click + drag also works.",
            " • Mouse double click selects a word.",
            " • Mouse triple click selects the whole line.",
            " • Ctrl + A selects everything.",
            "",
            "--- EDITING ---",
            " • Backspace / Delete remove characters.",
            " • Ctrl + Backspace / delete delete by words.",
            " • Ctrl + Z / Ctrl + Y undo and redo changes.",
            "",
            "--- CLIPBOARD ---",
            " • Ctrl + C copies the current selection.",
            " • Ctrl + X cuts it.",
            " • Ctrl + V pastes plain text.",
            "",
            "--- METADATA LINE ---",
            " • First line is interpreted as the metadata line.",
            " • Lang metadata changes the syntax highlighter language",
            "   Available : (txt, C)",
            " • theme metadata changes the theme",
            "   Available : (midnight, nord, solarized_dark)",
            "",
            "--- EXTRAS ---",
            " • Ctrl + mouse wheel zooms in / out.",
            " • Line numbers are enabled.",
            " • Text selection is highlighted.",
            " • The document is saved locally (deleting everyting + refresh resets to this text).",
            " • Syntax highlighting is enabled (try C code).",
            "",
            "This editor started as a learning project,",
            "and slowly turned into something more serious.",
            "Still experimental, still evolving.",
            "",
            "Found a bug or something weird?",
            "Feel free to open an issue on GitHub:",
            "https://github.com/zcBruAll/TextEditor",
            "",
            "Have fun experimenting."
        ];

        this._adjustPaddingWidth();

        this.cursor = { line: 0, col: 0 };
        this.scrollY = 0;
        this.scrollX = 0;

        this.lastClick = 0;
        this.nbClick = 0;

        this.caretVisible = true;
        this.skipCaretChange = false;

        this.inSelection = false;
        this.selection = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } };

        this.preferredCursorCol = null;

        this.docId = "default";
        this.saveTimer = null;
        this.pendingSave = false;

        this.undos = [];
        this.redos = [];
        this.lastSnapshot = 0;

        this._detectLanguage();

        this._detectTheme();
    }

    _detectLanguage() {
        let lang = "default";
        const idx = this.lines[0].indexOf("lang:");
        if (idx > -1) {
            lang = this.lines[0].substring(idx + 5).trim();
            let i = 0;
            while (i < lang.length && !this.isSpecialChar(lang[i])) {
                i++;
            }
            lang = lang.substring(0, i);
        }
        this.initHighlighter(lang.toUpperCase());
    }

    _detectTheme() {
        let theme = "default";
        const idx = this.lines[0].indexOf("theme:");
        if (idx > -1) {
            theme = this.lines[0].substring(idx + 6).trim();
            let i = 0;
            while (i < theme.length && !this.isSpecialChar(theme[i])) {
                i++;
            }
            theme = theme.substring(0, i);
        }
        this.initTheme(theme.toUpperCase());
    }

    initHighlighter(language) {
        this.highlighter = Highlighter.initHighlighter(language);
    }

    initTheme(theme) {
        this.theme = Theme.get(theme);
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

    _scheduleSave() {
        this.pendingSave = true;
        if (this.saveTimer) clearTimeout(this.saveTimer);

        this.saveTimer = setTimeout(async () => {
            this.saveTimer = null;
            if (!this.pendingSave) return;
            this.pendingSave = false;

            const text = this.lines.join("\n");

            await saveDocument({
                id: this.docId,
                text,
                updatedAt: Date.now()
            });
        }, 300);
    }

    _measure() {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        this.charWidth = ctx.measureText("M").width;
    }

    _adjustPaddingWidth() {
        this.log10NbLines = Math.ceil(Math.log10(this.lines.length + 1));
        this.paddingWidth = 16 + this.log10NbLines * this.charWidth;
    }

    toggleCaret() {
        if (!this.skipCaretChange) this.caretVisible = !this.caretVisible;
        else this.skipCaretChange = false;
        this.render();
    }

    _ensureVisibleCursor() {
        const viewW = this.canvas.width / this.dpr;
        const viewH = this.canvas.height / this.dpr;

        const caretX = this.cursor.col * this.charWidth;
        const caretY = this.cursor.line * this.lineHeight;

        const hMargin = this.charWidth * 5;
        const vMargin = this.lineHeight * 2;

        const visibleWidth = viewW - this.paddingWidth;
        const visibleHeight = viewH - this.paddingHeight;

        if (caretX < this.scrollX + hMargin) {
            this.scrollX = Math.max(0, caretX - hMargin);
        } else if (caretX > this.scrollX + visibleWidth - hMargin) {
            this.scrollX = caretX - visibleWidth + hMargin;
        }

        if (caretY < this.scrollY + vMargin) {
            this.scrollY = Math.max(0, caretY - vMargin);
        } else if (caretY > this.scrollY + visibleHeight - vMargin) {
            this.scrollY = caretY - visibleHeight + vMargin;
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

    onMouseClick(e) {
        const now = Date.now();
        if (now - this.lastClick < 200) {
            this.nbClick++;
            if (this.nbClick == 2) {
                const { line, col } = this.cursor;
                let startOfWord = col;
                let endOfWord = col;

                let i = col;
                const s = this.lines[line] ?? "";
                while (!this.isSpecialChar(s[i]) && i >= 0) {
                    i--;
                }
                startOfWord = i + 1;
                i = col;
                while (!this.isSpecialChar(s[i]) && i < s.length) {
                    i++;
                }
                endOfWord = i;

                this.inSelection = true;
                this.selection = { start: { line, col: startOfWord }, end: { line, col: endOfWord } };
                this.setCursor(line, endOfWord);
            } else if (this.nbClick == 3) {
                const { line, col } = this.cursor;
                this.inSelection = true;
                this.selection = { start: { line, col: 0 }, end: { line: line + 1, col: 0 } };
                this.setCursor(line + 1, 0);
            }
        } else {
            this.nbClick = 1;
        }
        this.lastClick = now;
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
        const ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) {
            this.scrollY = this._clamp(this.scrollY + e.deltaY, 0, (this.lines.length - 1) * this.lineHeight);
            this.render();
        } else {
            const delta = this._clamp(e.deltaY, -1, 1);
            this.fontSize = this._clamp(this.fontSize + (4 * -delta), 12, 64);
            this.lineHeight = this.fontSize + 4;
            this._measure();
            this._adjustPaddingWidth();
            this.render();
        }
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
                if (shift) {
                    this._untab();
                } else {
                    this._tab();
                }
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
            return (this.lines[selStart.line]).slice(selStart.col, selEnd.col);
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

    _tab() {
        if (this.inSelection) {
            let selStart = this.selection.start;
            let selEnd = this.selection.end;
            if (selStart.line > selEnd.line || (selStart.line == selEnd.line && selStart.col > selEnd.col)) {
                [selStart, selEnd] = [selEnd, selStart];
            }
            for (let i = selStart.line; i <= selEnd.line; i++) {
                this.lines[i] = "  " + this.lines[i];
            }
            this.setCursor(this.cursor.line, this.cursor.col + 2);

            this._detectLanguage();
            this._detectTheme();
            this._scheduleSave();
            this._addUndo();
        } else {
            this._insertText(" ".repeat(this.cursor.col % 2 == 0 ? 2 : 1));
        }
    }

    _untab() {
        if (this.inSelection) {
            let selStart = this.selection.start;
            let selEnd = this.selection.end;
            if (selStart.line > selEnd.line || (selStart.line == selEnd.line && selStart.col > selEnd.col)) {
                [selStart, selEnd] = [selEnd, selStart];
            }
            for (let i = selStart.line; i <= selEnd.line; i++) {
                if (this.lines[i].startsWith("  ")) {
                    this.lines[i] = this.lines[i].substring(2);
                    this.setCursor(this.cursor.line, this.cursor.col - 2);
                }
            }
        } else if (this.lines[this.cursor.line].startsWith("  ")) {
            this.lines[this.cursor.line] = this.lines[this.cursor.line].substring(2);
            this.setCursor(this.cursor.line, this.cursor.col - 2);
        }

        this._scheduleSave();
        this._addUndo();
    }

    _insertText(text) {
        this._deleteSelection();

        const lines = text.replace(/\r/g, "").split("\n");

        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";

        if (lines.length == 1) {
            this.lines[line] = (s.slice(0, col) + text + s.slice(col));
            this.setCursor(line, col + text.length);
        } else {
            const prefix = (s.slice(0, col) + lines[0]);
            const suffix = (lines[lines.length - 1] + s.slice(col));

            this.lines.splice(line, 1, prefix, ...lines.slice(1, -1), suffix);

            this.setCursor(line + lines.length - 1, lines[lines.length - 1].length);
        }

        this._adjustPaddingWidth();
        this._detectLanguage();
        this._detectTheme();

        this._scheduleSave();
        if (text.length > 1 || this.isSpecialChar(text) || Date.now() - this.lastSnapshot >= 1000) {
            this.lastSnapshot = Date.now();
            this._addUndo();
        }
    }

    _insertNewLine() {
        this._deleteSelection();

        const { line, col } = this.cursor;
        const s = this.lines[line] ?? "";
        let nbLeadingSpace = 0;
        for (let i = 0; i <= s.length; i++) {
            if (s[i] == " ") {
                nbLeadingSpace++;
            }
            else { break; }
        }
        const left = s.slice(0, col);
        const right = s.slice(col);
        this.lines[line] = left;
        this.lines.splice(line + 1, 0, " ".repeat(nbLeadingSpace) + right);
        this.setCursor(line + 1, nbLeadingSpace);

        this._adjustPaddingWidth();
        this._detectLanguage();
        this._detectTheme();

        this._scheduleSave();
        this._addUndo();
    }

    _backspace({ ctrl, shift }) {
        if (this.inSelection) {
            this._deleteSelection();

            this._adjustPaddingWidth();
            this._detectLanguage();
            this._detectTheme();

            this._scheduleSave();
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

                this._adjustPaddingWidth();
                this._detectLanguage();
                this._detectTheme();

                this._scheduleSave();
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

            this._adjustPaddingWidth();
            this._detectLanguage();
            this._detectTheme();

            this._scheduleSave();
            this._addUndo();
            return;
        }

        // Merge with previous line when col === 0
        const prev = this.lines[line - 1] ?? "";
        this.lines[line - 1] = prev + s;
        this.lines.splice(line, 1);
        this.setCursor(line - 1, prev.length);

        this._adjustPaddingWidth();
        this._detectLanguage();
        this._detectTheme();

        this._scheduleSave();
        this._addUndo();
    }

    _delete({ ctrl, shift }) {
        if (this.inSelection) {
            this._deleteSelection();

            this._adjustPaddingWidth();
            this._detectLanguage();
            this._detectTheme();

            this._scheduleSave();
            this._addUndo();
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

                this._adjustPaddingWidth();
                this._detectLanguage();
                this._detectTheme();

                this._scheduleSave();
                this._addUndo();
                return;
            }

            let i = col;
            while (i < length && !this.isSpecialChar(this.lines[line][i])) i++;
            while (i < length && this.isSpecialChar(this.lines[line][i])) i++;
            this.lines[line] = s.slice(0, col) + s.slice(i);

            this._adjustPaddingWidth();
            this._detectLanguage();
            this._detectTheme();

            this._scheduleSave();
            this._addUndo();
            return;
        }

        // Merge next line when col === line.length
        const next = this.lines[line + 1] ?? "";
        this.lines[line] = s + next;
        this.lines.splice(line + 1, 1);

        this._adjustPaddingWidth();
        this._detectLanguage();
        this._detectTheme();

        this._scheduleSave();
        this._addUndo();
    }

    // Cursor movement
    _moveLeft({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (!ctrl) {
            if (col > 0) {
                this.setCursor(line, col - 1);
            } else if (line > 0) {
                this.setCursor(line - 1, (this.lines[this.cursor.line - 1] ?? "").length);
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
            const startLine = Math.max(0, Math.floor(this.scrollY / this.lineHeight));
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
        ctx.fillStyle = this.theme.get("background") ?? "#000000ff";
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
            const y = this.paddingHeight + (i * this.lineHeight) - this.scrollY;

            if (this.inSelection && selStart.line <= i && selEnd.line >= i) {
                const selColStart = selStart.line < i ? 0 : selStart.col;
                const selColEnd = selEnd.line > i ? this.lines[i].length : selEnd.col;
                ctx.fillStyle = this.theme.get("selection") ?? "rgba(255, 255, 255, 0.5)";
                ctx.fillRect(x + selColStart * this.charWidth, y - 1, (selColEnd - selColStart) * this.charWidth, this.lineHeight - 2);
            }

            const lineNumber = String(i + 1).padStart(this.log10NbLines);
            ctx.fillStyle = this.theme.get("gutter") ?? "rgba(255, 255, 255, 0.5)";
            ctx.fillText(lineNumber, 8, y);

            const tokens = this.highlighter.tokenize(this.lines[i]);
            let currentX = this.paddingWidth + (minChar * this.charWidth) - this.scrollX;
            let pastNbChars = 0;
            for (const token of tokens) {
                if (pastNbChars + token.val.length < minChar) {
                    pastNbChars += token.val.length;
                    continue;
                }
                ctx.fillStyle = this.theme.get(token.type) ?? '#ffffffff';
                ctx.fillText(token.val.substring(Math.max(0, minChar - pastNbChars)), currentX, y);
                currentX += token.val.substring(Math.max(0, minChar - pastNbChars)).length * this.charWidth;
                pastNbChars += token.val.length;
            }
        }

        // Caret
        if (this.caretVisible) {
            const cx = this.paddingWidth + this.cursor.col * this.charWidth - this.scrollX;
            const cy = this.paddingHeight + this.cursor.line * this.lineHeight - 2 - this.scrollY;

            if (cx >= -2 && cx <= w + 2 && cy >= -this.lineHeight && cy <= h + this.lineHeight) {
                ctx.fillStyle = this.theme.get("caret") ?? "#ffffffff";
                ctx.fillRect(cx, cy - 2, 2, this.lineHeight);
            }
        }
    }
}
