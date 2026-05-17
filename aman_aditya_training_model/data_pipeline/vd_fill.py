# # from transformers import AutoModel
# import os
# import json
# import time
# from dotenv import load_dotenv 
# from pinecone import Pinecone
# from pathlib import Path
# import shutil
# from data_extraction import extract_text_with_structure, output_folder
# from data_wrangling import process_file,file_path, TOKEN_LIMIT, OVERLAP_WORDS


# # Load environment variables
# load_dotenv()
# pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY_2'))

# index_name = os.getenv('PINECONE_INDEX')
# namespace = 'coal-legislation'
# index = pc.Index(index_name)

# # Directory containing chunk JSON files
# chunk_dir = "mine-legislation/aman_aditya_training_model/data_pipeline/chunked_data"



# def process_pdf(input_path):  
#     output_path=os.path.join(output_folder, os.path.basename(input_path).replace(".pdf", ".txt")) 
#     if input_path.endswith(".pdf"):
#         return extract_text_with_structure(input_path, output_path)
#     else:
#         print(f"Skipping non-PDF file: {input_path}")
#         return False

# # process_file(file_path, output_path, token_limit=TOKEN_LIMIT, overlap_words=OVERLAP_WORDS)

# records = []
# total_files = 0
# total_chunks = 0

# # txt_output_path = os.path.join(
# #         output_folder,
# #         os.path.basename(input_pdf_path).replace(".pdf", ".txt")
# #     )
# txt_path=process_pdf(input_path)
# chunk_output_path = os.path.join(
#         chunk_dir,
#         os.path.basename(input_path).replace(".pdf", "_chunks.json")
#     )
# extracted = process_file(txt_path,chunk_output_path, token_limit=TOKEN_LIMIT, overlap_words=OVERLAP_WORDS)


# for filename in os.listdir(chunk_dir):
#     if filename.endswith("_chunks.json"):
#         total_files += 1
#         file_path = os.path.join(chunk_dir, filename)
#         source_name = filename.replace("_chunks.json", ".txt")
        
#         print(f"\nProcessing: {filename}")
        
#         try:
#             with open(file_path, "r", encoding="utf-8") as f:
#                 chunks = json.load(f)
            
#             for chunk in chunks:
#                 text = chunk.get("text", "").strip()
                
#                 # Skip empty chunks
#                 if not text:
#                     continue
                
#                 heading = chunk.get("heading", "Unknown")
#                 chunk_id = chunk.get("chunk_id")
#                 parent_id = chunk.get("parent_chunk_id")
#                 word_count = chunk.get("word_count", 0)
                
#                 # Combine heading and text for better context in embeddings
#                 combined_text = f"{heading}\n{text}" if heading != "Unknown" else text
                
#                 record = {
#                     "_id": f"{source_name}-chunk-{chunk_id}",
#                     "chunk_text": combined_text,           # For embeddings
#                     "text": text,                          # Original text content
#                     "section_title": heading,              # Section heading
#                     "file_name": source_name,              # Source file name
#                     "chunk_id": chunk_id,                  # Chunk index
#                     "parent_chunk_id": parent_id,          # Parent heading ID
#                     "word_count": word_count               # Metadata
#                 }
#                 records.append(record)
#                 total_chunks += 1
        
#         except Exception as e:
#             print(f"✗ Error reading {filename}: {e}")
#             continue

# print(f"\n{'='*60}")
# print(f"Total files processed: {total_files}")
# print(f"Total chunks created: {total_chunks}")
# print(f"{'='*60}")

# # Upsert to Pinecone in batches
# if records:
#     print("\nUpserting to Pinecone...")
    
#     BATCH_SIZE = 50  # Batch size for upsert
    
#     for i in range(0, len(records), BATCH_SIZE):
#         batch = records[i:i+BATCH_SIZE]
#         batch_num = (i // BATCH_SIZE) + 1
        
#         try:
#             print(f"Upserting batch {batch_num} ({len(batch)} records)...")
#             index.upsert_records(
#                 namespace=namespace,
#                 records=batch
#             )
#             # Small delay between batches to avoid rate limiting
#             if i + BATCH_SIZE < len(records):
#                 time.sleep(2)
        
#         except Exception as e:
#             print(f"Error upserting batch {batch_num}: {e}")
#             continue
    
#     print("✓ Upsert complete!")

# # Verify the index
# print(f"\nVerifying index statistics...")
# try:
#     stats = index.describe_index_stats()
#     if namespace in stats.get("namespaces", {}):
#         vector_count = stats["namespaces"][namespace].get("vector_count", 0)
#         print(f"✓ Total vectors in '{namespace}' namespace: {vector_count}")
#     else:
#         print(f"✗ Namespace '{namespace}' not found in index")
# except Exception as e:
#     print(f"✗ Error fetching index stats: {e}")

# # Test search
# print(f"\n{'='*60}")
# print("Testing search functionality...")
# print(f"{'='*60}")

# test_query = "What is the appointed date under the Mines Act?"

# try:
#     results = index.search(
#         namespace=namespace,
#         query={
#             "top_k": 3,
#             "inputs": {
#                 "text": test_query,
#             },
#         },
#         rerank={
#             "model": "bge-reranker-v2-m3",
#             "top_n": 3,
#             "rank_fields": ["chunk_text"],
#         }
#     )
    
#     print(f"\nQuery: {test_query}\n")
    
#     if results.get("result", {}).get("hits"):
#         for i, hit in enumerate(results["result"]["hits"], 1):
#             print(f"Result {i}:")
#             print(f"  File: {hit['fields'].get('file_name', 'N/A')}")
#             print(f"  Section: {hit['fields'].get('section_title', 'N/A')}")
#             print(f"  Preview: {hit['fields'].get('chunk_text', 'N/A')[:200]}...")
#             print()
#     else:
#         print("No results found")

# except Exception as e:
#     print(f" Error testing search: {e}")

# print(f"{'='*60}")
# print("Pipeline complete!")

# def clear_directory(dir_path):
#     path = Path(dir_path)
#     if not path.exists():
#         print(f"{dir_path} does not exist")
#         return
#     for item in path.iterdir():
#         if item.is_file() or item.is_symlink():
#             item.unlink()          # delete file/symlink
#         elif item.is_dir():
#             shutil.rmtree(item)   # delete subdirectory

#     print(f"Cleared: {dir_path}")
# clear_directory(chunk_dir)
# clear_directory(output_folder)






import sys
import os
import json
import time
import shutil
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone

from data_extraction import extract_text_with_structure, output_folder
from data_wrangling import process_file, TOKEN_LIMIT, OVERLAP_WORDS

# -----------------------------
# Setup
# -----------------------------
_PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_PATH = os.path.join(_PIPELINE_DIR, "..", ".env")
load_dotenv(dotenv_path=_ENV_PATH)
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY_2"))
index = pc.Index(os.getenv("PINECONE_INDEX"))

CHUNK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chunked_data")
os.makedirs(CHUNK_DIR, exist_ok=True)


# -----------------------------
# Utilities
# -----------------------------
def clear_directory(dir_path: str):
    path = Path(dir_path)
    if not path.exists():
        return

    for item in path.iterdir():
        if item.is_file() or item.is_symlink():
            item.unlink()
        elif item.is_dir():
            shutil.rmtree(item)


def process_pdf(pdf_path: str) -> str:
    """Convert PDF -> TXT and return txt path."""
    txt_path = os.path.join(
        output_folder,
        os.path.basename(pdf_path).replace(".pdf", ".txt")
    )

    success = extract_text_with_structure(pdf_path, txt_path)
    if not success:
        raise RuntimeError(f"PDF extraction failed: {pdf_path}")

    return txt_path


def chunk_text_file(txt_path: str) -> str:
    """Convert TXT -> chunked JSON and return json path."""
    chunk_path = os.path.join(
        CHUNK_DIR,
        os.path.basename(txt_path).replace(".txt", "_chunks.json")
    )

    success = process_file(
        txt_path,
        chunk_path,
        token_limit=TOKEN_LIMIT,
        overlap_words=OVERLAP_WORDS,
    )

    if not success:
        raise RuntimeError(f"Chunking failed: {txt_path}")

    return chunk_path


def build_records(chunk_json_path: str,namespace:str,mongoIdForFileName:str):
    """Build Pinecone records from chunk JSON."""
    source_name = os.path.basename(chunk_json_path).replace("_chunks.json", ".txt")

    with open(chunk_json_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    records = []
    for chunk in chunks:
        text = chunk.get("text", "").strip()
        if not text:
            continue

        heading = chunk.get("heading", "Unknown")
        chunk_id = chunk.get("chunk_id")
        parent_id = chunk.get("parent_chunk_id")
        word_count = chunk.get("word_count", 0)

        combined_text = f"{heading}\n{text}" if heading != "Unknown" else text

        records.append({
            "_id": f"{source_name}-chunk-{chunk_id}",
            "chunk_text": combined_text,
            "text": text,
            "section_title": heading,
            "file_name": source_name,
            "chunk_id": chunk_id,
            "parent_chunk_id": parent_id,
            "word_count": word_count,
            "country":namespace,
            "mongoIdForFileName":mongoIdForFileName
        })

    return records


def upsert_records(records, namespace: str, batch_size: int = 50):
    """Upload records to Pinecone."""
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        print(f"Uploading batch {(i // batch_size) + 1}...")
        index.upsert_records(namespace=namespace, records=batch)
        time.sleep(1)


# -----------------------------
# Main pipeline entrypoint
# -----------------------------
def ingest_pdf_to_namespace(pdf_path: str, namespace: str, mongoIdForFileName: str , cleanup: bool = True):
    """
    End-to-end pipeline:
      PDF -> OCR text -> chunks -> vectors -> Pinecone namespace
    """
    print(f"Starting ingestion: {pdf_path}")
    print(f"Namespace: {namespace}")

    txt_path = process_pdf(pdf_path)
    chunk_path = chunk_text_file(txt_path)
    records = build_records(chunk_path,namespace,mongoIdForFileName)

    if not records:
        raise ValueError("No records created from document")

    upsert_records(records, namespace)

    stats = index.describe_index_stats()
    count = stats.get("namespaces", {}).get(namespace, {}).get("vector_count", 0)
    print(f"Done. Namespace '{namespace}' now has {count} vectors.")

    if cleanup:
        clear_directory(CHUNK_DIR)
        clear_directory(output_folder)

    return {
        "namespace": namespace,
        "records_uploaded": len(records),
        "vector_count": count,
    }


# Example usage:
# ingest_pdf_to_namespace(
#     pdf_path="/path/to/mines_act.pdf",
#     namespace="coal-legislation"
# )
if __name__ == "__main__":
    file_path=sys.argv[1]
    namespace=sys.argv[2]
    mongoIdForFileName=sys.argv[3]
    #aman pc test
    # file_path="/Users/amanaditya/Desktop/new/mine-legislation/backend/data/australia/2011_074.pdf"
    # namespace="australia"
    #amul pc test
    # namespace="usa"
    # file_path = "C:\\Users\\amul7\\OneDrive - Indian Institute of Technology (BHU), Varanasi\\Desktop\\minelegislation\\backend\\data\\usa\\Mines_Rules_1955 (1).pdf"
    print (f"File: {file_path}")
    print (f"Namespace: {namespace}")
    ingest_pdf_to_namespace(
        pdf_path=file_path,
        namespace=namespace,
        mongoIdForFileName=mongoIdForFileName
    )