
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Load credentials from your .env file
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in .env file.")

# 2. Initialize the Gemini model via LangChain
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=0.4
)

def call_llm(prompt: str) -> str:
    """Invokes the model using LangChain's standard interface."""
    try:
        # LangChain uses .invoke() instead of .generate_content()
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        return f"LangChain Error: {str(e)}"