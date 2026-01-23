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

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (e) => editor.onKeyDown(e));

canvas.addEventListener("mousedown", (e) => editor.onMouseDown(e));
canvas.addEventListener("wheel", (e) => editor.onWheel(e), { passive: false });

setInterval(() => editor.toggleCaret(), 500);