# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a three-service application for querying mine legislation documents using RAG (Retrieval-Augmented Generation):

```
frontend (React/Vite) → backend (Node.js/Express) → Pinecone vector DB
                                                    → Python FastAPI (advanced RAG)
                                                    → MongoDB (file metadata)
```

**Upload pipeline:** `POST /upload` (Node.js) → spawns `vd_fill.py` as a child process → PDF→OCR→chunks→Pinecone upsert → MongoDB status update.

**Chat pipeline:** Three modes dispatched from `POST /chat`:
- `rag` — Node.js queries Pinecone directly, passes results to Gemini 2.5 Flash via `getLlmResponse.js`. Score threshold: 0.236 (Fibonacci levels used for tiered filtering).
- `ragadv` — proxies to the Python FastAPI service (`AMAN_BACKEND_URI`), which runs a LangGraph pipeline (retrieve → generate nodes, `InMemorySaver` checkpointer).
- `trained` — stub, not yet implemented.

## Services and How to Run

### Node.js Backend (`backend/`)
```bash
cd backend
nodemon app.js          # development
node app.js             # production
```
Runs on `PORT` from `.env` (defaults to 3000). Requires MongoDB and Pinecone.

### Python FastAPI (`aman_aditya_training_model/app/`)
```bash
cd aman_aditya_training_model/app
python -m uvicorn main:app
```
Requires `PINECONE_API_KEY_2`, `PINECONE_INDEX`, and `API_KEY` (Groq) in `.env`.

### Frontend (`frontend/`)
```bash
cd frontend
npm run dev
```

## Key Configuration

All three services use `.env` files (not committed). Required variables:

**backend/.env:**
- `PORT`, `MONGO_URI`
- `PINECONE_API_KEY_2`, `PINECONE_INDEX`, `PINECONE_HOST`
- `GOOGLE_GEMINI_API_KEY`
- `AMAN_BACKEND_URI` — URL of the Python FastAPI service

**aman_aditya_training_model/app/.env:**
- `PINECONE_API_KEY_2`, `PINECONE_INDEX`
- `API_KEY` — Groq API key (used for `groq/compound` and `groq/compound-mini`)

## Data Pipeline Details

`vd_fill.py` is the end-to-end ingestion script. It is called by Node.js as:
```
python3 vd_fill.py <pdf_path> <namespace> <mongo_file_id>
```
Steps: `extract_text_with_structure` (OCR via pytesseract) → `process_file` (chunking with token limit + overlap) → Pinecone `upsert_records` in batches of 50. Namespace = country name (lowercase).

Pinecone record fields: `chunk_text`, `text`, `section_title`, `file_name`, `chunk_id`, `parent_chunk_id`, `word_count`.

## File Deduplication

SHA256 hash of file buffer is computed on upload. A file is rejected if a record with the same hash exists in MongoDB with `status: "processing"` or `status: "completed"`. Failed uploads can be re-submitted.

## Python Dependencies

Install from `requirements.txt` at root or `aman_aditya_training_model/requirements.txt`:
```bash
pip install -r requirements.txt
```
Requires `pytesseract` and `pdf2image` which need system-level `tesseract` and `poppler`.

## Frontend

Single-page React app. Entry point is `src/App.jsx` → `src/components/ChatApp`. Communicates with the Node.js backend. Vite config in `frontend/vite.config.js`.
