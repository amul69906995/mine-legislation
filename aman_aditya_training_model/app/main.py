import uuid
from fastapi import FastAPI
from schema import ChatRequest, ChatResponse
from rag import build_graph

app = FastAPI(title="Mining Law RAG API")

# Build graph once at startup
graph = build_graph()


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # use the client-supplied thread_id if present, otherwise mint a fresh one
    # so each request gets its own conversation context (avoid cross-user bleed)
    thread_id = request.thread_id or str(uuid.uuid4())

    events = graph.stream(
        {"messages": [("user", request.query)]},
        stream_mode="updates",
        config={"configurable": {"thread_id": thread_id}}
    )

    final_answer = None
    for event in events:
        if "generate" in event:
            final_answer = event["generate"]["messages"][-1].content

    return ChatResponse(answer=final_answer, thread_id=thread_id)
