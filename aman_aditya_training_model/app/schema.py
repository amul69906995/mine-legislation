from typing import Optional
from pydantic import BaseModel

class ChatRequest(BaseModel):
    query: str
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    thread_id: str
