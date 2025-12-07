import os
from dotenv import load_dotenv

load_dotenv()
GPT_AUTH = os.getenv('OPENAI_API_KEY', '') # Load from .env file or use empty string as fallback
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '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') # Load OpenRouter API key from .env