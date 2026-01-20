from fastapi import FastAPI
from schema import ChatRequest, ChatResponse
from rag import build_graph

app = FastAPI(title="Mining Law RAG API")

# Build graph once at startup
graph = build_graph()


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    events = graph.stream(
        {"messages": [("user", request.query)]},
        stream_mode="updates",
    )

    final_answer = None
    for event in events:
        if "generate" in event:
            final_answer = event["generate"]["messages"][-1].content

    return ChatResponse(answer=final_answer)