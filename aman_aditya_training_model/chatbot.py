from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]
graph_builder= StateGraph(State)

from langchain_groq import ChatGroq
import os
from openai import OpenAI

# from groq import Groq
from dotenv import load_dotenv
load_dotenv()
llm= ChatGroq(model="groq/compound", api_key=os.getenv('API_KEY'))
# llm= ChatGroq(model="openai/gpt-oss-20b", api_key=os.getenv('API_KEY'))
def chatbot(state: State): 
    return {"messages": [llm.invoke(state["messages"])]}  

graph_builder.add_node("chatbot", chatbot) 
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)
graph=graph_builder.compile()
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
    for event in graph.stream({"messages":("user",user_input)}):
        for value in event.values():
            print("Assistant:", value["messages"][-1].content)