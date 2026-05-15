import argparse
import json
import os
import re
import time
from pathlib import Path

import pytesseract
from dotenv import load_dotenv
from pdf2image import convert_from_path
from pinecone import Pinecone


TOKEN_LIMIT = 512
OVERLAP_WORDS = 50
UPSERT_BATCH_SIZE = 50


def clean_ocr_text(text: str) -> str:
    """Clean OCR artifacts and normalize whitespace while preserving line structure."""
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        line = re.sub(r"\s+", " ", line.strip())
        if line:
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def extract_text_with_structure(pdf_path: Path, dpi: int = 200) -> str:
    """Extract text from PDF with page markers for downstream chunking context."""
    pages = convert_from_path(str(pdf_path), dpi)
    full_text = []

    for page_num, page in enumerate(pages, 1):
        text = pytesseract.image_to_string(page, lang="eng")
        text = clean_ocr_text(text)

        marker = f"[PAGE {page_num}]"
        full_text.append(marker)
        full_text.append(text)

    return "\n".join(full_text)


def is_heading(line: str) -> bool:
    if not line or len(line.strip()) == 0:
        return False

    line = line.strip()

    if len(line) > 200:
        return False

    if re.match(r"^\d+(\.\d+)*\.\s+[A-Z].+", line):
        return True

    if re.match(r"^[A-Z][A-Z\s\-]+$", line):
        if len(line.split()) >= 2 or len(line) >= 15:
            return True

    if re.match(r"^(SECTION|CHAPTER|PART|ARTICLE|RULE|CLAUSE|SCHEDULE)\s+[\dIVXi\.]+.*:?$", line, re.IGNORECASE):
        return True

    words = line.split()
    if 2 <= len(words) <= 8 and line[0].isupper():
        if line[-1] in ".:;-":
            return True
        if any(keyword in line for keyword in ["Act", "Law", "Rules", "Regulation", "Provision"]):
            return True

    if re.match(r"^\[PAGE \d+\]$", line):
        return True

    return False


def text_to_heading_chunks(text: str):
    chunks = []
    current = {"heading": "Introduction", "content": ""}

    for line in text.split("\n"):
        if is_heading(line):
            if current["content"].strip():
                chunks.append(current)
            current = {"heading": line.strip(), "content": ""}
        else:
            current["content"] += line + "\n"

    if current["content"].strip():
        chunks.append(current)

    return chunks


def split_chunk_by_tokens(text: str, token_limit: int = TOKEN_LIMIT, overlap_words: int = OVERLAP_WORDS):
    words = text.split()
    if not words:
        return []

    word_limit = int(token_limit * 1.3)
    chunks = []
    start = 0
    total_words = len(words)

    while start < total_words:
        end = min(start + word_limit, total_words)
        chunk_text = " ".join(words[start:end]).strip()
        if chunk_text:
            chunks.append(chunk_text)

        start = end - overlap_words
        if start >= total_words - overlap_words:
            break

    return chunks


def build_json_chunks(text: str, token_limit: int = TOKEN_LIMIT, overlap_words: int = OVERLAP_WORDS):
    base_chunks = text_to_heading_chunks(text)
    json_chunks = []
    gid = 0

    for parent_id, chunk_dict in enumerate(base_chunks):
        heading = chunk_dict.get("heading", "Unknown")
        content = chunk_dict.get("content", "").strip()

        if not content:
            json_chunks.append(
                {
                    "chunk_id": gid,
                    "parent_chunk_id": parent_id,
                    "heading": heading,
                    "text": "",
                    "word_count": 0,
                    "estimated_tokens": 0,
                }
            )
            gid += 1
            continue

        sub_chunks = split_chunk_by_tokens(content, token_limit=token_limit, overlap_words=overlap_words)

        for sub_chunk in sub_chunks:
            word_count = len(sub_chunk.split())
            json_chunks.append(
                {
                    "chunk_id": gid,
                    "parent_chunk_id": parent_id,
                    "heading": heading,
                    "text": sub_chunk,
                    "word_count": word_count,
                    "estimated_tokens": int(word_count * 1.3),
                }
            )
            gid += 1

    return json_chunks


def upsert_chunks_to_pinecone(
    chunks,
    source_name: str,
    index_name: str,
    namespace: str,
    pinecone_api_key: str,
    batch_size: int = UPSERT_BATCH_SIZE,
):
    pc = Pinecone(api_key=pinecone_api_key)
    index = pc.Index(index_name)

    records = []
    for chunk in chunks:
        text = chunk.get("text", "").strip()
        if not text:
            continue

        heading = chunk.get("heading", "Unknown")
        combined_text = f"{heading}\n{text}" if heading != "Unknown" else text

        records.append(
            {
                "_id": f"{source_name}-chunk-{chunk.get('chunk_id')}",
                "chunk_text": combined_text,
                "text": text,
                "section_title": heading,
                "file_name": source_name,
                "chunk_id": chunk.get("chunk_id"),
                "parent_chunk_id": chunk.get("parent_chunk_id"),
                "word_count": chunk.get("word_count", 0),
            }
        )

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        index.upsert_records(namespace=namespace, records=batch)
        if i + batch_size < len(records):
            time.sleep(1)

    stats = index.describe_index_stats()
    vector_count = stats.get("namespaces", {}).get(namespace, {}).get("vector_count", 0)

    return {"upserted_records": len(records), "namespace_vector_count": vector_count}


def run_pipeline(
    pdf_path: str,
    index_name: str,
    namespace: str,
    token_limit: int = TOKEN_LIMIT,
    overlap_words: int = OVERLAP_WORDS,
    save_artifacts: bool = True,
):
    load_dotenv()
    pinecone_api_key = os.getenv("PINECONE_API_KEY_2") or os.getenv("PINECONE_API_KEY")
    if not pinecone_api_key:
        raise ValueError("Missing Pinecone API key. Set PINECONE_API_KEY_2 or PINECONE_API_KEY in .env")

    pdf = Path(pdf_path).expanduser().resolve()
    if not pdf.exists() or pdf.suffix.lower() != ".pdf":
        raise FileNotFoundError(f"Invalid PDF path: {pdf}")

    textual_dir = pdf.parent.parent / "india_textual_data"
    chunked_dir = pdf.parent.parent / "chunked_data"

    extracted_text = extract_text_with_structure(pdf)
    chunks = build_json_chunks(extracted_text, token_limit=token_limit, overlap_words=overlap_words)

    if save_artifacts:
        textual_dir.mkdir(parents=True, exist_ok=True)
        chunked_dir.mkdir(parents=True, exist_ok=True)

        text_path = textual_dir / f"{pdf.stem}.txt"
        chunks_path = chunked_dir / f"{pdf.stem}_chunks.json"

        text_path.write_text(extracted_text, encoding="utf-8")
        chunks_path.write_text(json.dumps(chunks, indent=2, ensure_ascii=False), encoding="utf-8")

    result = upsert_chunks_to_pinecone(
        chunks=chunks,
        source_name=f"{pdf.stem}.txt",
        index_name=index_name,
        namespace=namespace,
        pinecone_api_key=pinecone_api_key,
    )

    return {
        "pdf": str(pdf),
        "heading_and_sub_chunks": len(chunks),
        "upserted_records": result["upserted_records"],
        "namespace": namespace,
        "namespace_vector_count": result["namespace_vector_count"],
    }


def main():
    parser = argparse.ArgumentParser(description="Single-script PDF -> OCR -> chunking -> Pinecone upsert pipeline")
    parser.add_argument("--pdf", required=True, help="Absolute/relative path to input PDF")
    parser.add_argument("--index", default="mine-legislation", help="Pinecone index name")
    parser.add_argument("--namespace", default="coal-legislation", help="Pinecone namespace")
    parser.add_argument("--token-limit", type=int, default=TOKEN_LIMIT, help="Approx token cap per chunk")
    parser.add_argument("--overlap-words", type=int, default=OVERLAP_WORDS, help="Word overlap between chunks")
    parser.add_argument("--no-artifacts", action="store_true", help="Do not save .txt/.json artifacts")
    args = parser.parse_args()

    summary = run_pipeline(
        pdf_path=args.pdf,
        index_name=args.index,
        namespace=args.namespace,
        token_limit=args.token_limit,
        overlap_words=args.overlap_words,
        save_artifacts=not args.no_artifacts,
    )

    print("Pipeline complete")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
