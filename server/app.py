from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import os
from dotenv import load_dotenv 
import json 
import sys
app = Flask(__name__)


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super(JSONEncoder, self).default(obj)


app.json_encoder = JSONEncoder
CORS(
    app,
    resources={r"/api/*": {"origins": "http://localhost:5173"}},
    supports_credentials=False,
)

load_dotenv()

gemini_api=os.getenv('GEMINI_KEY')
client=genai.Client(api_key=gemini_api)

@app.route('/')
def home():
    return "Flask server running"

@app.post("/api/ai")
def ai():
    data = request.get_json()
    message = data.get("message", "")

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=message
    )

    return jsonify({"response": response.text})



if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=5001)
else:
    sys.exit(1)
