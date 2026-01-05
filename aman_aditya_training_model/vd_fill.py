from transformers import AutoModel
from numpy.linalg import norm
import os
import json
import time

# all_texts = []
# metadata_store = []

# chunk_dir = "/Users/amanaditya/Documents/thesis/chunk_data"

# for filename in os.listdir(chunk_dir):
#     if filename.endswith("_chunks.json"):
#         source_name = filename.replace("_chunks.json", "")

#         with open(os.path.join(chunk_dir, filename), "r", encoding="utf-8") as f:
#             chunks = json.load(f)

#             for chunk in chunks:
#                 if not chunk.get("text"):
#                     continue

#                 heading = chunk.get("heading") or ""
#                 text = f"{heading} {chunk['text']}".strip()

#                 all_texts.append(text)
#                 metadata_store.append({
#                     "chunk_id": chunk["chunk_id"],
#                     "parent_chunk_id": chunk.get("parent_chunk_id", -1),
#                     "heading": heading,
#                     "source": source_name
#                 })

# cos_sim = lambda a,b: (a @ b.T) / (norm(a)*norm(b))
# model = AutoModel.from_pretrained('jinaai/jina-embeddings-v2-base-en', trust_remote_code=True) # trust_remote_code is needed to use the encode method
# embeddings = model.encode(['How is the weather today?', 'What is the current weather like today?'])
# print(cos_sim(embeddings[0], embeddings[1]))

records=[]
file="/Users/amanaditya/Documents/thesis/chunk_data"
for filename in os.listdir(file):
    if filename.endswith("_chunks.json"):
        with open(os.path.join(file,filename),"r",encoding="utf-8") as f:
            chunks=json.load(f)
            for chunk in chunks:
                heading=chunk.get("heading") or ""
                record = {
                    "_id": f"{filename}-{chunk['chunk_id']}",

                    # This MUST match field_map → "text": "chunk_text"
                    # "chunk_text": f"{chunk['heading']} {chunk['text']}",
                    "chunk_text": f"{heading} {chunk['text']}",
                    # Everything else goes into metadata
                    # flat metadata, wrapper not required
                    "chunk_id": chunk["chunk_id"],
                    "parent_chunk_id": chunk["parent_chunk_id"],
                    # "heading": chunk["heading"],
                    "heading": heading,
                    "source": filename.replace("_chunks.json",".txt")
                }
                records.append(record)
print(f"Total records to upsert: {len(records)}")

from pinecone import Pinecone, ServerlessSpec

from dotenv import load_dotenv 

load_dotenv()
pc=Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

index_name='mine-legislation'
# if not pc.has_index(index_name):
#     pc.create_index_for_model(
#         name=index_name,
#         cloud="aws",
#         region="us-east-1",
#         embed={
#             "model":"llama-text-embed-v2",
#             "field_map":{"text": "chunk_text"}
#         }
#     )
index=pc.Index(index_name)
# BATCH_SIZE = 75
# for i in range(0, len(records), BATCH_SIZE):
#     time.sleep(10)
#     index.upsert_records(
#         namespace="coal-legislation",
#         records=records[i:i+BATCH_SIZE]
#     )
stats = index.describe_index_stats()
print(stats)
print(stats["namespaces"]["coal-legislation"]["vector_count"])

print("Upsert complete.")

results = index.search(
    namespace="coal-legislation",
    query={
        "top_k": 10,
        "inputs": {
            "text": "What is the appointed date under the Mines Act?",
        },
    },
    # include_metadata=True
)
print("Search results:",results)


