from typing import Annotated, List
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

from config import pc, llm


class State(TypedDict):
    messages: Annotated[list, add_messages]
    context: List[dict]


def retrieve(state: State):
    query = state["messages"][-1].content
    index = pc.Index("mine-legislation")

    results = index.search(
        namespace="coal-legislation",
        query={
            "top_k": 5,
            "inputs": {"text": query},
        },
        rerank={
            "model": "bge-reranker-v2-m3",
            "top_n": 5,
            "rank_fields": ["chunk_text"],
        },
    )

    docs = []
    for hit in results["result"]["hits"]:
        docs.append({
            "source": hit["fields"]["source"],
            "heading": hit["fields"]["heading"],
            "chunk_text": hit["fields"]["chunk_text"],
        })

    return {"context": docs}


def generate(state: State):
    context_text = "\n\n".join(
        f"[Source: {doc['source']} | {doc['heading']}]\n{doc['chunk_text']}"
        for doc in state.get("context", [])
    )

    system_prompt = f"""
You are a legal assistant specialised in Indian Mining Law.
Answer ONLY using the provided context.
If the answer is not present, say:
"The document does not specify this."

Context:
{context_text}
"""

    messages = [("system", system_prompt), *state["messages"]]
    response = llm.invoke(messages)

    return {"messages": [response]}


def build_graph():
    graph_builder = StateGraph(State)

    graph_builder.add_node("retrieve", retrieve)
    graph_builder.add_node("generate", generate)

    graph_builder.add_edge(START, "retrieve")
    graph_builder.add_edge("retrieve", "generate")
    graph_builder.add_edge("generate", END)

    return graph_builder.compile()