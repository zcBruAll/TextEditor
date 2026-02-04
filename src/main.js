import { Editor } from './editor.js';

const canvas = document.getElementById('editor-canvas');
const editor = new Editor(canvas);

function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    editor.setDpr(dpr);
    editor.render();
}

function copy(e) {
    const text = editor._getSelectionText() ?? "";
    if (!text) return;

    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
}

window.onload = () => {
    const saved = localStorage.getItem('editorContent');
    if (saved) {
        if (saved.length > editor.lineLimit * editor.columnLimit) {
            console.error("Too much characters in cache, resetting it...");
            localStorage.removeItem('editorContent');
        }
        editor.clearLines();
        editor._insertText(saved);
    }
};

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (e) => editor.onKeyDown(e));
window.addEventListener("paste", (e) => {
    const text = e.clipboardData?.getData("text/plain");
    if (text) {
        e.preventDefault();
        editor._insertText(text);
        editor.render();
    }
});
window.addEventListener("copy", (e) => copy(e));
window.addEventListener("cut", (e) => {
    copy(e);
    editor._deleteSelection();
})

canvas.addEventListener("mousedown", (e) => editor.onMouseDown(e));
canvas.addEventListener("click", (e) => editor.onMouseClick(e));
canvas.addEventListener("mousemove", (e) => editor.onMouseMove(e));
canvas.addEventListener("wheel", (e) => editor.onWheel(e), { passive: false });

setInterval(() => editor.toggleCaret(), 500);