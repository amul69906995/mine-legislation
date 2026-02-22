import os
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_groq import ChatGroq

load_dotenv()

# Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY_2"))
pc_index= os.getenv("PINECONE_INDEX")
# LLM
llm = ChatGroq(
    model="groq/compound",
    api_key=os.getenv("API_KEY"),
)