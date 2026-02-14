import { initHighlighter } from "./highlighters/index.js";
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

        this.blocLength = 256;
        this.initText();

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
        const firstLineContent = this.lines[0].lines[0].content;
        const idx = firstLineContent.indexOf("lang:");
        if (idx > -1) {
            lang = firstLineContent.substring(idx + 5).trim();
            let i = 0;
            while (i < lang.length && !this.isSpecialChar(lang[i])) {
                i++;
            }
            lang = lang.substring(0, i);
        }
        this.initHighlighter(lang.toUpperCase(), this);
    }

    _detectTheme() {
        let theme = "default";
        const firstLineContent = this.lines[0].lines[0].content;
        const idx = firstLineContent.indexOf("theme:");
        if (idx > -1) {
            theme = firstLineContent.substring(idx + 6).trim();
            let i = 0;
            while (i < theme.length && !this.isSpecialChar(theme[i])) {
                i++;
            }
            theme = theme.substring(0, i);
        }
        this.initTheme(theme.toUpperCase());
    }

    initHighlighter(language) {
        this.highlighter = initHighlighter(language, this);
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
        this.cursor.line = this._clamp(line, 0, this._getNbLines() - 1);

        if (!usePreferredCol) {
            this.cursor.col = this._clamp(col, 0, this._lineAt(this.cursor.line).content.length);
            this.preferredCursorCol = null;
            return;
        }

        if (this.preferredCursorCol == null) {
            this.preferredCursorCol = this.cursor.col;
        }
        this.cursor.col = Math.min(this.preferredCursorCol, this._lineAt(this.cursor.line).content.length);
    }

    initText() {
        this.lines = [
            {
                lines: [
                    { content: "lang: c, theme: midnight", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "Welcome.", lastState: "normal" },
                    { content: "This is a custom text editor, built from scratch.", lastState: "normal" },
                    { content: "No framework, no magic, just a canvas, code and curiosity.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "Let's take a quick tour.", lastState: "normal" },
                    { content: "--- BASIC TYPING ---", lastState: "normal" },
                    { content: " • Just start typing. Printable characters work as expected.", lastState: "normal" },
                    { content: " • Enter creates a new line.", lastState: "normal" },
                    { content: " • Tab inserts indentation.", lastState: "normal" },
                    { content: " • Shift + Tab removes indentation.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "--- MOVING AROUND ---", lastState: "normal" },
                    { content: " • Arrow keys move the caret.", lastState: "normal" },
                    { content: " • Ctrl + Arrow jumps by word.", lastState: "normal" },
                    { content: " • Home /* End jump to line start / end.", lastState: "normal" },
                    { content: " • Ctrl + Home / End jump to the start / end of the document.", lastState: "normal" },
                    { content: " • Page Up / Page Down scroll vertically.", lastState: "normal" },
                    { content: " • Mouse wheel also scroll vertically.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "--- SELECTION ---", lastState: "normal" },
                    { content: " • Hold Shift while moving to select text.", lastState: "normal" },
                    { content: " • Mouse click + drag also works.", lastState: "normal" },
                    { content: " • Mouse double click selects a word.", lastState: "normal" },
                    { content: " • Mouse triple click selects the whole line.", lastState: "normal" },
                    { content: " • Ctrl + A selects everything.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "--- EDITING ---", lastState: "normal" },
                    { content: " • Backspace / Delete remove characters.", lastState: "normal" },
                    { content: " • Ctrl + Backspace / delete delete by words.", lastState: "normal" },
                    { content: " • Ctrl + Z */ Ctrl + Y undo and redo changes.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "--- CLIPBOARD ---", lastState: "normal" },
                    { content: " • Ctrl + C copies the current selection.", lastState: "normal" },
                    { content: " • Ctrl + X cuts it.", lastState: "normal" },
                    { content: " • Ctrl + V pastes plain text.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "--- METADATA LINE ---", lastState: "normal" },
                    { content: " • First line is interpreted as the metadata line.", lastState: "normal" },
                    { content: " • Lang metadata changes the syntax highlighter language", lastState: "normal" },
                    { content: "   Available : (txt, C)", lastState: "normal" },
                    { content: " • theme metadata changes the theme", lastState: "normal" },
                    { content: "   Available : (midnight, nord, solarized_dark)", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "--- EXTRAS ---", lastState: "normal" },
                    { content: " • Ctrl + mouse wheel zooms in / out.", lastState: "normal" },
                    { content: " • Line numbers are enabled.", lastState: "normal" },
                    { content: " • Text selection is highlighted.", lastState: "normal" },
                    { content: " • The document is saved locally (deleting everyting + refresh resets to this text).", lastState: "normal" },
                    { content: " • Syntax highlighting is enabled (try C code).", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "This editor started as a learning project,", lastState: "normal" },
                    { content: "and slowly turned into something more serious.", lastState: "normal" },
                    { content: "Still experimental, still evolving.", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "Found a bug or something weird?", lastState: "normal" },
                    { content: "Feel free to open an issue on GitHub:", lastState: "normal" },
                    { content: "https://github.com/zcBruAll/TextEditor", lastState: "normal" },
                    { content: "", lastState: "normal" },
                    { content: "Have fun experimenting.", lastState: "normal" }
                ],
                lastState: "normal"
            }
        ];
    }

    clearLines() {
        this.lines = [{ lines: [{ content: "", lastState: "normal" }], lastState: "normal" }];
    }

    _scheduleSave() {
        this.pendingSave = true;
        if (this.saveTimer) clearTimeout(this.saveTimer);

        this.saveTimer = setTimeout(async () => {
            this.saveTimer = null;
            if (!this.pendingSave) return;
            this.pendingSave = false;

            const text = this._getText();

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

    _getNbLines() {
        const idxLastLine = this.lines.length - 1;
        return idxLastLine * this.blocLength + this.lines[idxLastLine].lines.length;
    }

    lineToBlocLine(line) {
        return { bloc: Math.floor(line / this.blocLength), line: line % this.blocLength };
    }

    _lineAt(nbLine) {
        const { bloc, line } = this.lineToBlocLine(nbLine);
        return this.lines[bloc].lines[line];
    }

    _adjustPaddingWidth() {
        this.log10NbLines = Math.ceil(Math.log10(this._getNbLines() + 1));
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
                const s = this._lineAt(line).content ?? "";
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
            this.scrollY = this._clamp(this.scrollY + e.deltaY, 0, (this._getNbLines() - 1) * this.lineHeight);
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
                this.selection.end = { line: this.cursor.line, col: this.cursor.col };
            } else {
                this.inSelection = true;
                this.selection = { start: { line, col }, end: { line: this.cursor.line, col: this.cursor.col } };
            }
        } else {
            this.inSelection = false;
        }
    }

    _handleCommand(e) {
        let content = "";
        let allLines = [];
        switch (e.key) {
            case "a":
                e.preventDefault();
                const lastLine = this._lineAt(this._getNbLines() - 1).content ?? "";
                this.setCursor(this._getNbLines() - 1, lastLine.length);
                this.inSelection = true;
                this.selection = { start: { line: 0, col: 0 }, end: { line: this._getNbLines() - 1, col: lastLine.length } };
                break;
            case "z":
                e.preventDefault();
                if (this.undos.length <= 1) return;
                this.redos.push(this._getText());
                this.undos.pop();
                content = this.undos[this.undos.length - 1];
                allLines = content.split("\n").map(s => this._createLine(s));
                this.lines = [this._createBloc(allLines)];
                this._reshapeBlocs();

                this.setCursor(0, 0);
                this._detectLanguage();
                this._detectTheme();
                this._scheduleSave();
                break;
            case "y":
                e.preventDefault();
                if (this.redos.length <= 0) return;
                content = this.redos.pop();
                this._addUndo(false);
                allLines = content.split("\n").map(s => this._createLine(s));
                this.lines = [this._createBloc(allLines)];
                this._reshapeBlocs();
                this.setCursor(0, 0);
                this._detectLanguage();
                this._detectTheme();
                this._scheduleSave();
                break;
            default:
                break;
        }
    }

    _addUndo(clearRedo = true) {
        while (this.undos.length >= 50) this.undos.shift();

        const text = this._getText();

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
            return (this._lineAt(selStart.line).content).slice(selStart.col, selEnd.col);
        }

        const text = [];
        text.push((this._lineAt(selStart.line).content ?? "").slice(selStart.col));
        for (let i = selStart.line + 1; i < selEnd.line; i++) {
            text.push(this._lineAt(i).content ?? "");
        }
        text.push((this._lineAt(selEnd.line).content ?? "").slice(0, selEnd.col));
        return text.join("\n");
    }

    _getText() {
        let text = "";

        for (const bloc of this.lines) {
            for (const line of bloc.lines) {
                text += line.content + "\n";
            }
        }

        text = text.substring(0, text.length - 1);
        return text;
    }

    // Text management
    _reshapeBlocs() {
        // Remove empty blocs
        this.lines = this.lines.filter(b => b && Array.isArray(b.lines) && b.lines.length > 0);

        // Ensure at least one bloc exists
        if (this.lines.length === 0) {
            this.lines = [this._createBloc([this._createLine("")])];
            return;
        }

        let idx = 0;
        while (idx < this.lines.length) {
            const bloc = this.lines[idx].lines;

            while (bloc.length > this.blocLength) {
                const transfer = bloc.splice(this.blocLength);

                if (idx + 1 < this.lines.length) {
                    this.lines[idx + 1].lines.unshift(...transfer);
                } else {
                    this.lines.push(this._createBloc(transfer));
                }
            }

            while (bloc.length < this.blocLength && idx < this.lines.length - 1) {
                const next = this.lines[idx + 1].lines;
                const need = this.blocLength - bloc.length;

                bloc.push(...next.splice(0, need));

                if (next.length === 0) {
                    this.lines.splice(idx + 1, 1);
                }
            }

            idx++;
        }

        // Remove trailing empty blocs
        this.lines = this.lines.filter(b => b && b.lines && b.lines.length > 0);
    }


    _createLine(content, lastState = "normal") {
        return {
            content,
            lastState
        };
    }

    _createBloc(lines, lastState = "normal") {
        return {
            lines,
            lastState
        };
    }

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

        const first = this._lineAt(startLine).content ?? "";
        const last = this._lineAt(endLine).content ?? "";

        const prefix = first.slice(0, startCol);
        const suffix = last.slice(endCol);

        const mergedLine = prefix + suffix;
        const mergedContent = this._createLine(mergedLine, this._lineAt(endLine).lastState);

        const deleteCount = endLine - startLine + 1;

        // Check if lines are in same bloc
        const startBloc = this.lineToBlocLine(startLine);
        const endBloc = this.lineToBlocLine(endLine);
        if (startBloc.bloc == endBloc.bloc) {
            this.lines[startBloc.bloc].lines.splice(startBloc.line, deleteCount, mergedContent);
        } else {
            const nbBlocks = endBloc.bloc - startBloc.bloc;
            // If selection is over than 1 bloc, then blocs in between are entirely deleted
            if (nbBlocks > 1) {
                this.lines.splice(startBloc.bloc + 1, nbBlocks - 1);
            }

            const del = this.lines[startBloc.bloc].lines.length - startBloc.line;
            this.lines[startBloc.bloc].lines.splice(startBloc.line, del, mergedContent);
            this.lines[startBloc.bloc + 1].lines.splice(0, endBloc.line + 1);
        }

        this._reshapeBlocs();

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
                this._lineAt(i).content = "  " + this._lineAt(i).content;
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
        const conv = this.lineToBlocLine(this.cursor.line);
        if (this.inSelection) {
            let selStart = this.selection.start;
            let selEnd = this.selection.end;
            if (selStart.line > selEnd.line || (selStart.line == selEnd.line && selStart.col > selEnd.col)) {
                [selStart, selEnd] = [selEnd, selStart];
            }
            for (let i = selStart.line; i <= selEnd.line; i++) {
                if (this._lineAt(i).content.startsWith("  ")) {
                    this._lineAt(i).content = this._lineAt(i).content.substring(2);
                    this.setCursor(this.cursor.line, this.cursor.col - 2);
                }
            }
        } else if (this.lines[conv.bloc].lines[conv.line].content.startsWith("  ")) {
            this.lines[conv.bloc].lines[conv.line].content = this.lines[conv.bloc].lines[conv.line].content.substring(2);
            this.setCursor(this.cursor.line, this.cursor.col - 2);
        }

        this._scheduleSave();
        this._addUndo();
    }

    _insertText(text) {
        this._deleteSelection();

        const lines = text.replace(/\r/g, "").split("\n");

        const { line, col } = this.cursor;
        const s = this._lineAt(line)?.content ?? "";

        if (lines.length == 1) {
            this._lineAt(line).content = (s.slice(0, col) + text + s.slice(col));
            this.setCursor(line, col + text.length);
        } else {
            const prefix = (s.slice(0, col) + lines[0]);
            const suffix = (lines[lines.length - 1] + s.slice(col));

            const conv = this.lineToBlocLine(line);
            const newLines = [prefix, ...lines.slice(1, -1), suffix].map(content => this._createLine(content));
            this.lines[conv.bloc].lines.splice(conv.line, 1, ...newLines);

            this._reshapeBlocs();

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
        const s = this._lineAt(line).content ?? "";
        let nbLeadingSpace = 0;
        for (let i = 0; i <= s.length; i++) {
            if (s[i] == " ") {
                nbLeadingSpace++;
            }
            else { break; }
        }

        const left = s.slice(0, col);
        const right = s.slice(col);
        this._lineAt(line).content = left;
        const conv = this.lineToBlocLine(line);
        this.lines[conv.bloc].lines.splice(conv.line + 1, 0, this._createLine(" ".repeat(nbLeadingSpace) + right));

        this._reshapeBlocs();
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

        const s = this._lineAt(line).content ?? "";
        if (col > 0) {
            if (!ctrl) {
                this._lineAt(line).content = s.slice(0, col - 1) + s.slice(col);
                this.setCursor(line, col - 1);

                this._adjustPaddingWidth();
                this._detectLanguage();
                this._detectTheme();

                this._scheduleSave();
                this._addUndo();
                return;
            }

            let i = col - 1;
            while (i >= 0 && this.isSpecialChar(this._lineAt(line).content[i])) {
                i--;
            }
            while (i >= 0 && !this.isSpecialChar(this._lineAt(line).content[i])) {
                i--;
            }

            const newCol = i + 1;
            this._lineAt(line).content = s.slice(0, newCol) + s.slice(col);
            this.setCursor(line, newCol);

            this._adjustPaddingWidth();
            this._detectLanguage();
            this._detectTheme();

            this._scheduleSave();
            this._addUndo();
            return;
        }

        // Merge with previous line when col === 0
        const prev = this._lineAt(line - 1).content ?? "";
        this._lineAt(line - 1).content = prev + s;
        const conv = this.lineToBlocLine(line);
        this.lines[conv.bloc].lines.splice(conv.line, 1);
        this._reshapeBlocs();
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
        if (line === this._getNbLines() - 1 && col === this._lineAt(line).content.length)
            return;

        const s = this._lineAt(line).content;
        const length = this._lineAt(line).content.length
        if (col < length) {
            if (!ctrl) {
                this._lineAt(line).content = s.slice(0, col) + s.slice(col + 1);

                this._adjustPaddingWidth();
                this._detectLanguage();
                this._detectTheme();

                this._scheduleSave();
                this._addUndo();
                return;
            }

            let i = col;
            while (i < length && !this.isSpecialChar(this._lineAt(line).content[i])) i++;
            while (i < length && this.isSpecialChar(this._lineAt(line).content[i])) i++;
            this._lineAt(line).content = s.slice(0, col) + s.slice(i);

            this._adjustPaddingWidth();
            this._detectLanguage();
            this._detectTheme();

            this._scheduleSave();
            this._addUndo();
            return;
        }

        // Merge next line when col === line.length
        const next = this._lineAt(line + 1).content ?? "";
        this._lineAt(line).content = s + next;
        const conv = this.lineToBlocLine(line + 1);
        this.lines[conv.bloc].lines.splice(conv.line, 1);
        this._reshapeBlocs();

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
                this.setCursor(line - 1, (this._lineAt(this.cursor.line - 1).content ?? "").length);
            }

            this._selectToCursor(shift, line, col);

            return;
        }

        if (col == 0) {
            if (line > 0) {
                this.setCursor(line - 1, (this._lineAt(this.cursor.line).content ?? "").length);
            }

            this._selectToCursor(shift, line, col);
            return;
        }

        let i = col - 1;
        while (i >= 0 && this.isSpecialChar(this._lineAt(line).content[i])) i--;
        while (i >= 0 && !this.isSpecialChar(this._lineAt(line).content[i])) i--;
        this.setCursor(line, i + 1);

        this._selectToCursor(shift, line, col);
    }

    _moveRight({ ctrl, shift }) {
        const { line, col } = this.cursor;
        const length = (this._lineAt(line).content ?? "").length;

        if (!ctrl) {
            if (col < length) {
                this.setCursor(line, col + 1);
            } else if (line < this._getNbLines() - 1) {
                this.setCursor(line + 1, 0);
            }

            this._selectToCursor(shift, line, col);

            return;
        }

        if (col == length) {
            if (line < this._getNbLines() - 1) {
                this.setCursor(line + 1, 0);
            }

            this._selectToCursor(shift, line, col);
            return;
        }

        let i = col + 1;
        while (i < length && !this.isSpecialChar(this._lineAt(line).content[i])) i++;
        while (i < length && this.isSpecialChar(this._lineAt(line).content[i])) i++;
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

        if (!ctrl && line < this._getNbLines() - 1) {
            this.setCursor(line + 1, col, true);
        } else if (ctrl) {
            this.setCursor(line, this._lineAt(line).content.length);
        }

        this._selectToCursor(shift, line, col);
    }

    _moveEnd({ ctrl, shift }) {
        const { line, col } = this.cursor;

        if (ctrl) {
            this.setCursor(this._getNbLines() - 1, this._lineAt(this._getNbLines() - 1).content.length);
        } else {
            this.setCursor(line, this._lineAt(line).content.length);
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

        let newCol = Math.min(this._lineAt(this.cursor.line).content.length, col);
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

        let maxLine = this._getNbLines() - 1;

        if (ctrl) {
            // Theorically works but un-testable on browser, it captures it first
            const startLine = Math.max(0, Math.floor(this.scrollY / this.lineHeight));
            maxLine = Math.min(this._getNbLines(), startLine + Math.ceil((h + this.lineHeight) / this.lineHeight));
        }

        let newCol = Math.min(this._lineAt(this.cursor.line).content.length, col);
        let cancelPreferred = false;

        if (line + linesPerPage > this._getNbLines() - 1) {
            newCol = this._lineAt(this._getNbLines() - 1).content.length;
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
            this._getNbLines() - 1
        );

        const col = this._clamp(
            Math.round(contentX / this.charWidth),
            0,
            (this._lineAt(line).content ?? "").length
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

        const startLine = Math.max(0, Math.ceil(this.scrollY / this.lineHeight));
        const endLine = Math.min(this._getNbLines(), startLine + Math.floor(((h - 2 * this.paddingHeight) + this.lineHeight) / this.lineHeight));

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
                const selColEnd = selEnd.line > i ? this._lineAt(i).content.length : selEnd.col;
                ctx.fillStyle = this.theme.get("selection") ?? "rgba(255, 255, 255, 0.5)";
                ctx.fillRect(x + selColStart * this.charWidth, y - 3, (selColEnd - selColStart) * this.charWidth, this.lineHeight);
            }

            const lineNumber = String(i + 1).padStart(this.log10NbLines);
            ctx.fillStyle = this.theme.get("gutter") ?? "rgba(255, 255, 255, 0.5)";
            ctx.fillText(lineNumber, 8, y);

            const tokens = this.highlighter.tokenize(i);
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
                ctx.fillRect(cx, cy - 1, 2, this.lineHeight);
            }
        }
    }
}
