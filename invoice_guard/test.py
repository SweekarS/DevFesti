import requests
import os

api_key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

r = requests.get(url)
print(f"Status: {r.status_code}")
print(f"Response: {r.text}")