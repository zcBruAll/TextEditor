import { Editor } from './editor.js';
import { loadDocument } from './storage.js';

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

window.onload = async () => {
    const doc = await loadDocument("default");
    if (doc?.text) {
        editor.clearLines();
        editor._insertText(doc.text);
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