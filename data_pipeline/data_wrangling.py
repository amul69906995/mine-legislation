import os
import json
import re

output_folder="/Users/amanaditya/Documents/thesis/textual_data"

def is_numbered_heading(line):
    """I think the regex still needs some improvement."""
    print(f"Checking line for numbered heading: {line}")
    if not line:
        return False
    line = line.strip()
    if len(line) > 200:
        return False
    return bool(re.match(r'^\d+(\.\s*\w+)*\.\s+.+', line))

def text_to_chunks(text):
    print("Splitting text into chunks based on headings...")
    chunks=[]
    current={'heading':None,"content":""}
    for line in text.splitlines():
        heading_match=re.match(r'^#{1,6}\s+|^-',line)
        if heading_match:
            if current["content"].strip():
                chunks.append(current)
            current = {
                "heading": line.strip(),
                "content": ""
            }
        elif is_numbered_heading(line):
            if current["content"].strip():
                chunks.append(current)
            current = {
                "heading": line.strip(),
                "content": ""
            }
        else:
            current['content']+=line+"\n"
    if current["content"].strip():
        chunks.append(current)
    return chunks

def split_chunks(text,token_limit=512,overlap_words=50):
    print(f"Splitting text into chunks with token limit {token_limit} and overlap {overlap_words}")
    words = re.findall(r'\S+', text)
    if not words:
        return []
    chunks = []
    start = 0
    total = len(words)
    while start < total:
        print(f"Creating chunk starting at word index: {start} of {total}")
        end = min(start + token_limit, total)
        chunk_words = words[start:end]
        chunks.append(' '.join(chunk_words))
        # advance start with overlap
        start = end - overlap_words
        if start < 0:
            start = 0
        if start >= total-overlap_words:
            break
    print(f"Total sub-chunks created: {len(chunks)}")
    return chunks

TOKEN_LIMIT=512
OVERLAP_WORDS=50

for filename in os.listdir(output_folder):
    if filename.endswith(".txt"):
        print(filename)
        file_path=os.path.join(output_folder,filename)
        with open(file_path,"r",encoding="utf-8") as f:
            text=f.read()
        base_chunks = text_to_chunks(text)
        json_chunks = []
        gid=0
        for i, ch in enumerate(base_chunks):
            heading=ch.get("heading")
            content=ch.get("content","").strip()
            sub_chunks = split_chunks(content, token_limit=TOKEN_LIMIT, overlap_words=OVERLAP_WORDS)
            if not sub_chunks:
                print("Empty sub_chunks for heading:", heading)
                json_chunks.append({
                    "chunk_id": gid,
                    "parent_chunk_id": i,
                    "heading": heading,
                    "text": ""
                })
                gid+=1
                continue
            for j,sub in enumerate(sub_chunks):
                print(f"Processing sub-chunk {j} for heading: {heading}")
                json_chunks.append({
                    "chunk_id": gid,
                    "parent_chunk_id": i,
                    "heading":heading,
                    "text": sub.strip()
                    })
                gid+=1
            # json_chunks.append({
            #     "chunk_id": i,
            #     "heading": ch["heading"],
            #     "text": ch["content"].strip()
            # })
        # json_output_path=os.path.join(output_folder,filename.replace(".txt","_chunks.json"))
        json_output_path=os.path.join("/Users/amanaditya/Documents/thesis/chunk_data",filename.replace(".txt","_chunks.json"))
        print("chunking completion ->", json_output_path)
        with open(json_output_path, "w", encoding="utf-8") as f:
            json.dump(json_chunks, f, indent=2, ensure_ascii=False)

# chunks = text_to_chunks(text)

# json_chunks = []
# for i, ch in enumerate(chunks):
#     json_chunks.append({
#         "chunk_id": i,
#         "heading": ch["heading"],
#         "text": ch["content"].strip()
#     })

# with open("chunks.json", "w", encoding="utf-8") as f:
#     json.dump(json_chunks, f, indent=2, ensure_ascii=False)