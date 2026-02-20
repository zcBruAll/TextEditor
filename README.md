# Text Editor
A lightweight web-based text editor built from scratch to explore how modern editors works internally.

This project implements a custom text model, rendering pipeline, undo/redo system, and pluggable syntax highlighting without relying on existing editor frameworks.

## Features
- Custom document model
- Caret navigation & mouse selection (single, double, triple click)
- Undo / Redo stack
- Clipboard support (copy, cut, paste)
- Line numbers & zoom
- Horizoontal + vertical scrolling
- Syntax highlighting (modular highlighter system)
- Theme support
- IndexedDB autosave

## Architecture
The editor is structured into clear layers:
- **Text model**: manages document state and line operations
- **Editor core**: caret, selection, undo/redo, scrolling logic
- **Renderer**: renders only visible lines for performance
- **Highlighter system**: token-based syntax highlighting with extensible design
- **Persistence layer**: autosave with indexedDB
The codebase was designed with future optimizations in mind (e.g., incremental syntax highlighting cache)

## Purpose
This project was built to deeply understand:
- How text is stored and manipulated internally
- Caret and selection mechanics
- Rendering performance and trade-offs
- Editor state management
- Modular architecture design

## Current scope
This version focuses on core editor mechanics.  
It does not include multi-file tabs, search/replace, or large-file optimization.

**Status: v1.0 - Core editor complete**
