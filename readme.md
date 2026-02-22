# Mine Legislation

A comprehensive application for processing and managing legislative documents with AI-powered analysis using RAG (Retrieval-Augmented Generation).

## Project Structure

- **aman_aditya_training_model/** - ML training models and RAG implementation
- **backend/** - Node.js central backend server
- **frontend/** - React/Vite frontend application

## Setup Instructions

### 1. ML Training Model (Python Backend)

```bash
cd aman_aditya_training_model/app
python -m uvicorn main:app
```

### 2. Frontend (React/Vite)

```bash
cd frontend
npm run dev
```

### 3. Central Backend (Node.js)

```bash
cd backend
nodemon app.js
```

## Features & Constraints

### File Upload Specifications
- **Maximum file size:** 100 MB
- **Accepted format:** PDF only
- **Storage:** Files organized country-wise in corresponding data folders
- **Duplicate handling:** Duplicate files are excluded until modified (1-bit change detection using Node crypto library)

## Database Integration

- Files are automatically saved to the database upon upload
- Data is organized by country for organized retrieval and processing



