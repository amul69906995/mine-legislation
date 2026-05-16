import os
import json
import re

output_folder="mine-legislation/aman_aditya_training_model/data_pipeline/textual_data"

# Configuration
TOKEN_LIMIT = 512  # Keep chunks to ~512 tokens
OVERLAP_WORDS = 50  # 50 word overlap for context continuity
MIN_CHUNK_LENGTH = 50  # Minimum words to create a chunk

def is_heading(line):
    """
    Detect if a line is a heading using multiple heuristics.
    Works well with OCR output without markdown formatting.
    """
    if not line or len(line.strip()) == 0:
        return False
    
    line = line.strip()
    
    # Too long to be a heading
    if len(line) > 200:
        return False
    
    # Pattern 1: Numbered sections (1., 1.1, 1.1.1, etc.)
    # Handles: "1. Section Name", "2.3.1 Subsection", etc.
    if re.match(r'^\d+(\.\d+)*\.\s+[A-Z].+', line):
        return True
    
    # Pattern 2: ALL CAPS headings (common in OCR)
    # Only if at least 3 words or 15+ characters
    if re.match(r'^[A-Z][A-Z\s\-]+$', line):
        if len(line.split()) >= 2 or len(line) >= 15:
            return True
    
    # Pattern 3: Single-line chapter/section indicators
    # Examples: "SECTION I.", "CHAPTER II", "Part A:"
    if re.match(r'^(SECTION|CHAPTER|PART|ARTICLE|RULE|CLAUSE|SCHEDULE)\s+[\dIVXi\.]+.*:?$', line, re.IGNORECASE):
        return True
    
    # Pattern 4: Lines that look like titles (start with capital, short, ends with punctuation)
    # But exclude common sentences
    words = line.split()
    if 2 <= len(words) <= 8 and line[0].isupper():
        # Check if line ends with period, colon, or dash (less typical of regular text)
        if line[-1] in '.:;-':
            return True
        # Or if it contains "Act", "Law", "Rules", "Regulation"
        if any(keyword in line for keyword in ['Act', 'Law', 'Rules', 'Regulation', 'Rules', 'Provision']):
            return True
    
    # Pattern 5: Page markers
    if re.match(r'^\[PAGE \d+\]$', line):
        return True
    
    return False

def text_to_chunks(text):
    """
    Split text into chunks based on detected headings.
    Returns list of dicts with heading and content.
    """
    print("Splitting text into chunks based on headings...")
    chunks = []
    current = {'heading': 'Introduction', 'content': ''}  # Default heading
    
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        if is_heading(line):
            # Save previous chunk if it has content
            if current['content'].strip():
                chunks.append(current)
            
            # Start new chunk with new heading
            current = {
                'heading': line.strip(),
                'content': ''
            }
        else:
            current['content'] += line + '\n'
    
    # Don't forget the last chunk
    if current['content'].strip():
        chunks.append(current)
    
    print(f"Created {len(chunks)} heading-based chunks")
    return chunks

def split_chunk_by_tokens(text, token_limit=512, overlap_words=50):
    """
    Split a chunk into smaller pieces if it exceeds token_limit.
    Uses word-based estimation for tokens (roughly 1 token ≈ 1.3 words).
    Maintains overlap between chunks for context.
    """
    words = text.split()
    
    if not words:
        return []
    
    # Estimate tokens: roughly 1 token per 1.3 words (conservative)
    word_limit = int(token_limit * 1.3)
    
    chunks = []
    start = 0
    total_words = len(words)
    
    while start < total_words:
        # Calculate end position
        end = min(start + word_limit, total_words)
        
        chunk_words = words[start:end]
        chunk_text = ' '.join(chunk_words)
        
        # Only add non-empty chunks
        if chunk_text.strip():
            chunks.append(chunk_text)
        
        # Move start position with overlap
        start = end - overlap_words
        
        # Prevent infinite loops
        if start >= total_words - overlap_words:
            break
    
    return chunks

def process_file(file_path, output_path, token_limit=512, overlap_words=50):
    """Process a single file and create JSON chunks."""
    print(f"\nProcessing: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        
        # Step 1: Split by headings
        base_chunks = text_to_chunks(text)
        
        # Step 2: Create JSON structure with sub-chunks
        json_chunks = []
        gid = 0  # Global chunk ID
        
        for parent_id, chunk_dict in enumerate(base_chunks):
            heading = chunk_dict.get('heading', 'Unknown')
            content = chunk_dict.get('content', '').strip()
            
            if not content:
                # Create placeholder for empty sections
                json_chunks.append({
                    'chunk_id': gid,
                    'parent_chunk_id': parent_id,
                    'heading': heading,
                    'text': '',
                    'word_count': 0
                })
                gid += 1
                continue
            
            # Split content into token-limited chunks
            sub_chunks = split_chunk_by_tokens(
                content, 
                token_limit=token_limit, 
                overlap_words=overlap_words
            )
            
            if not sub_chunks:
                continue
            
            for sub_chunk in sub_chunks:
                word_count = len(sub_chunk.split())
                
                # Always include heading with content to maintain context
                combined_text = f"{heading}\n{sub_chunk}" if heading != 'Unknown' else sub_chunk
                
                json_chunks.append({
                    'chunk_id': gid,
                    'parent_chunk_id': parent_id,
                    'heading': heading,
                    'text': sub_chunk.strip(),  # Store content separately
                    'word_count': word_count,
                    'estimated_tokens': int(word_count * 1.3)
                })
                gid += 1
        
        # Step 3: Write JSON output
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(json_chunks, f, indent=2, ensure_ascii=False)
        
        print(f"Created {len(json_chunks)} chunks")
        print(f"Heading-based splits: {len(base_chunks)}")
        print(f"Total with token limits: {len(json_chunks)}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

# Main processing loop
# print("="*60)
# print("Starting data wrangling pipeline")
# print("="*60)

# for filename in os.listdir(output_folder):
#     if filename.endswith(".txt"):
#         file_path = os.path.join(output_folder, filename)
#         output_path = os.path.join(
#             "/Users/amanaditya/Desktop/new/mine-legislation/data_pipeline/chunked_data",
#             filename.replace(".txt", "_chunks.json")
#         )
#         process_file(file_path, output_path, token_limit=TOKEN_LIMIT, overlap_words=OVERLAP_WORDS)


print("Wrangling pipeline complete!")
