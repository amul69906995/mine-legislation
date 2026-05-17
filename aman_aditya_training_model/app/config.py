import os
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_groq import ChatGroq

load_dotenv()

# Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY_2"))
pc_index = os.getenv("PINECONE_INDEX")
# LLM
# llama-3.3-70b-versatile: 128K context, general-purpose Groq model.
# groq/compound has a small input limit; it kept rejecting RAG contexts with HTTP 413.
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("API_KEY"),
)
llm_small = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("API_KEY"),
)