from typing import Annotated, List
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver

from config import pc, pc_index, llm, llm_small


class State(TypedDict):
    messages: Annotated[list, add_messages]
    context: List[dict]
    is_valid: bool

def route_on_validation(state: State):
    """Route based on validation result stored in state."""
    if state.get("is_valid", False):
        return "accepted"
    return "rejected"

def guardrail(state: State):
    last_message = state["messages"][-1]
    generated_answer = last_message.content

    system_prompt = f"""
You are a legal assistant specialised in Indian Mining Law.
Check whether the generated answer is strictly relevant to Indian mining law or related mining regulations or anything regarding the provided context.
If the answer is relevant, respond with exactly: accepted
Otherwise, respond with exactly: rejected

Answer to classify:
{generated_answer}
"""
    messages = [("system", system_prompt), ("user", generated_answer)]
    response = llm_small.invoke(messages)

    classification = response.content.strip().lower()
    is_valid = "accepted" in classification
    
    return {"is_valid": is_valid}

def reject_response(state: State):
    return {
        "messages": [(
            "assistant",
            "Sorry, this question does not appear relevant to my mining-law capabilities. "
            "Please ask a question about Indian mining law, regulation, permits, royalties, or related topics."
        )]
    }

print(pc_index)
print("this is from rag.py")
def retrieve(state: State):
    query = state["messages"][-1].content
    index = pc.Index(pc_index)

    results = index.search(
        namespace="india",
        query={
            "top_k": 3,
            "inputs": {"text": query},
        },
        rerank={
            "model": "bge-reranker-v2-m3",
            "top_n": 3,
            "rank_fields": ["chunk_text"],
        },
    )

    docs = []
    # for hit in results["result"]["hits"]:
    #     docs.append({
    #         "source": hit["fields"]["source"],
    #         "heading": hit["fields"]["heading"],
    #         "chunk_text": hit["fields"]["chunk_text"],
    #     })

    for hit in results["result"]["hits"]:
        docs.append({
            "source": hit["fields"]["file_name"],
            "heading": hit["fields"]["section_title"],
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
Answer ONLY using the provided context and keep it concise.
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
    graph_builder.add_node("guardrail", guardrail)
    graph_builder.add_node("reject_response", reject_response)

    graph_builder.add_edge(START, "retrieve")
    graph_builder.add_edge("retrieve", "generate")
    # graph_builder.add_edge("generate", END)
    graph_builder.add_edge("generate", "guardrail")

    graph_builder.add_conditional_edges(
        "guardrail",
        route_on_validation,
        {
            "accepted": END,
            "rejected": "reject_response",
        }
    )
    graph_builder.add_edge("reject_response", END)

    checkpointer = InMemorySaver()
    return graph_builder.compile(checkpointer=checkpointer)