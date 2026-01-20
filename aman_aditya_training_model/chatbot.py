from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
import os
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
load_dotenv()


pc=Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
# from groq import Groq

llm= ChatGroq(model="groq/compound", api_key=os.getenv('API_KEY'))
# llm= ChatGroq(model="openai/gpt-oss-20b", api_key=os.getenv('API_KEY'))


class State(TypedDict):
    messages: Annotated[list, add_messages]
    context:list




# def chatbot(state: State): 
#     return {"messages": [llm.invoke(state["messages"])]}  

def retrieve(state:State):
    Query= state["messages"][-1].content
    index_name='mine-legislation'
    index=pc.Index(index_name)
    # print(1)
    results = index.search(
        namespace="coal-legislation",
        query={
            "top_k": 10,
            "inputs": {
                "text": Query,
            },
        }
    )
    # print(2)
    # print(f"Results type: {type(results)}")
    # print(f"Results content: {results}")
    
    docs=[]
    
    for hit in results['result']['hits']:
        docs.append({"source":hit["fields"]["source"],
            "heading": hit['fields']['heading'],
            "chunk_text": hit['fields']['chunk_text']})

    # print(3)
    return {"context":docs}


def generate(state: State):
    context_text = "\n\n".join(
        f"[Source: {doc['source']} | {doc['heading']}]\n{doc['chunk_text']}"
        for doc in state.get("context", [])
    )

    system_prompt = f"""
        You are a legal assistant specialised in Indian Mining Law.
        Answer ONLY using the provided context and keep it concise.
        If the answer is not present, say "The document does not specify this."

        Context:
        {context_text}
    """

    messages = [("system", system_prompt), *state["messages"]]
    response = llm.invoke(messages)
    # print(response)
    return {"messages": [response]}

graph_builder= StateGraph(State)
graph_builder.add_node("retrieve", retrieve)
graph_builder.add_node("generate", generate)

graph_builder.add_edge(START, "retrieve")
graph_builder.add_edge("retrieve", "generate")
graph_builder.add_edge("generate", END)

graph = graph_builder.compile()
# # print(graph_builder.nodes)  # Should include "chatbot"
# print(graph_builder.edges)  # Should connect START -> "chatbot" -> END

# from IPython.display import Image, display
# try:
#     display(Image(graph.get_graph().draw_mermaid_png()))
# except Exception:
#     pass

while True:
    user_input= input("User:")
    if user_input.lower() in ["quit","exit","q"]:
        print("goodbye")
        break
    for event in graph.stream({"messages":[("user",user_input)]},stream_mode="updates"):
        if "generate" in event:
            print("Assistant:", event["generate"]["messages"][-1].content)
    
    # for event in graph.stream({"messages":[("user",user_input)]}):
        # for value in event.values():
        #     # if("messages "in value):
        #         print("Assistant:", value["messages"][-1].content)