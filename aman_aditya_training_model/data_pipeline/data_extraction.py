import pytesseract
from pdf2image import convert_from_path
from pdf2image.pdf2image import pdfinfo_from_path
import os
import re

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
input_folder = os.path.join(_THIS_DIR, "india")
output_folder = os.path.join(_THIS_DIR, "textual_data")

# Ensure output folder exists
os.makedirs(output_folder, exist_ok=True)

def clean_ocr_text(text):
    """Clean up OCR artifacts and normalize whitespace."""
    # Remove excessive whitespace but preserve paragraph structure
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Remove excessive spaces within lines
        line = re.sub(r'\s+', ' ', line.strip())
        if line:  # Only keep non-empty lines
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

def extract_text_with_structure(pdf_path, output_path):
    """Extract text from PDF with better structure preservation."""
    print(f"Processing: {pdf_path}")
    
    try:
        pages = convert_from_path(pdf_path, 200)
        full_text = []
        
        for page_num, page in enumerate(pages, 1):
            # Extract text with layout preservation
            text = pytesseract.image_to_string(page, lang='eng')
            
            # Clean the text
            text = clean_ocr_text(text)
            
            # Add page break indicator for tracking
            if page_num > 1:
                full_text.append(f"\n[PAGE {page_num}]\n")
            else:
                full_text.append(f"[PAGE {page_num}]\n")
            
            full_text.append(text)
        
        final_text = '\n'.join(full_text)
        
        # Write to file
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(final_text)
        
        print(f"Extracted to: {output_path}")
        return True
        
    except Exception as e:
        print(f"✗ Error processing {pdf_path}: {e}")
        return False

# Process all PDFs
# for filename in os.listdir(input_folder):
#     if filename.endswith(".pdf"):
#         input_path = os.path.join(input_folder, filename)
#         output_path = os.path.join(output_folder, filename.replace(".pdf", ".txt"))
#         extract_text_with_structure(input_path, output_path)

#process new folder

# print("Extraction complete.")
