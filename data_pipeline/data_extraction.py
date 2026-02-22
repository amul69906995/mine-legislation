# from docling.document_converter import DocumentConverter
import pytesseract
from pdf2image import convert_from_path
import os

# converter=DocumentConverter()
# to convert all pdf files in a folder to txt files
input_folder="/Users/amanaditya/Documents/thesis/mine-legislation/data/india/"
output_folder="/Users/amanaditya/Documents/thesis/mine-legislation/data/textual_data"
for filename in os.listdir(input_folder):
    if filename.endswith(".pdf"):
        print(filename)
        input_path=os.path.join(input_folder,filename)
        pages= convert_from_path(input_path,200)
        doc=" "
        for page in pages:
            text=pytesseract.image_to_string(page)
            doc+=text+"\n"
        # doc=converter.convert(input_path)
        # md_content= doc.document.export_to_markdown()
        output_path=os.path.join(output_folder,filename.replace(".pdf",".txt"))
        with open(output_path,"w",encoding="utf-8") as f:
            f.write(doc)
