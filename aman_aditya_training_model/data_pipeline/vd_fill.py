from transformers import AutoModel
import os
import json
import time
from dotenv import load_dotenv 
from pinecone import Pinecone

# Load environment variables
load_dotenv()
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY_2'))

index_name = 'mine-legislation'
namespace = 'coal-legislation'
index = pc.Index(index_name)

# Directory containing chunk JSON files
chunk_dir = "/Users/amanaditya/Desktop/new/mine-legislation/data_pipeline/chunked_data"


records = []
total_files = 0
total_chunks = 0

for filename in os.listdir(chunk_dir):
    if filename.endswith("_chunks.json"):
        total_files += 1
        file_path = os.path.join(chunk_dir, filename)
        source_name = filename.replace("_chunks.json", ".txt")
        
        print(f"\nProcessing: {filename}")
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                chunks = json.load(f)
            
            for chunk in chunks:
                text = chunk.get("text", "").strip()
                
                # Skip empty chunks
                if not text:
                    continue
                
                heading = chunk.get("heading", "Unknown")
                chunk_id = chunk.get("chunk_id")
                parent_id = chunk.get("parent_chunk_id")
                word_count = chunk.get("word_count", 0)
                
                # Combine heading and text for better context in embeddings
                combined_text = f"{heading}\n{text}" if heading != "Unknown" else text
                
                record = {
                    "_id": f"{source_name}-chunk-{chunk_id}",
                    "chunk_text": combined_text,           # For embeddings
                    "text": text,                          # Original text content
                    "section_title": heading,              # Section heading
                    "file_name": source_name,              # Source file name
                    "chunk_id": chunk_id,                  # Chunk index
                    "parent_chunk_id": parent_id,          # Parent heading ID
                    "word_count": word_count               # Metadata
                }
                records.append(record)
                total_chunks += 1
        
        except Exception as e:
            print(f"✗ Error reading {filename}: {e}")
            continue

print(f"\n{'='*60}")
print(f"Total files processed: {total_files}")
print(f"Total chunks created: {total_chunks}")
print(f"{'='*60}")

# Upsert to Pinecone in batches
if records:
    print("\nUpserting to Pinecone...")
    
    BATCH_SIZE = 50  # Batch size for upsert
    
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i+BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        
        try:
            print(f"Upserting batch {batch_num} ({len(batch)} records)...")
            index.upsert_records(
                namespace=namespace,
                records=batch
            )
            # Small delay between batches to avoid rate limiting
            if i + BATCH_SIZE < len(records):
                time.sleep(2)
        
        except Exception as e:
            print(f"✗ Error upserting batch {batch_num}: {e}")
            continue
    
    print("✓ Upsert complete!")

# Verify the index
print(f"\nVerifying index statistics...")
try:
    stats = index.describe_index_stats()
    if namespace in stats.get("namespaces", {}):
        vector_count = stats["namespaces"][namespace].get("vector_count", 0)
        print(f"✓ Total vectors in '{namespace}' namespace: {vector_count}")
    else:
        print(f"✗ Namespace '{namespace}' not found in index")
except Exception as e:
    print(f"✗ Error fetching index stats: {e}")

# Test search
print(f"\n{'='*60}")
print("Testing search functionality...")
print(f"{'='*60}")

test_query = "What is the appointed date under the Mines Act?"

try:
    results = index.search(
        namespace=namespace,
        query={
            "top_k": 3,
            "inputs": {
                "text": test_query,
            },
        },
        rerank={
            "model": "bge-reranker-v2-m3",
            "top_n": 3,
            "rank_fields": ["chunk_text"],
        }
    )
    
    print(f"\nQuery: {test_query}\n")
    
    if results.get("result", {}).get("hits"):
        for i, hit in enumerate(results["result"]["hits"], 1):
            print(f"Result {i}:")
            print(f"  File: {hit['fields'].get('file_name', 'N/A')}")
            print(f"  Section: {hit['fields'].get('section_title', 'N/A')}")
            print(f"  Preview: {hit['fields'].get('chunk_text', 'N/A')[:200]}...")
            print()
    else:
        print("No results found")

except Exception as e:
    print(f"✗ Error testing search: {e}")

print(f"{'='*60}")
print("Pipeline complete!")


