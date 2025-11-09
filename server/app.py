from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from google import genai
import os
from dotenv import load_dotenv 
import json 
import sys
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import io
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
        contents=f"Answer the following question, but don't include any special characters (*) in your response. Here is my question: {message}."
    )

    return jsonify({"response": response.text})

# ElevenLabs Setup
elevenlabs_api_key = os.environ.get("ELEVEN_LABS")
elevenlabs_client = None
if not elevenlabs_api_key:
    print("Warning: ELEVEN_LABS environment variable not set.")
else:
    elevenlabs_client = ElevenLabs(api_key=elevenlabs_api_key)


@app.post("/api/tts")
def tts():
    """
    Receives text in a JSON payload and returns MP3 audio data.
    """
    data = request.get_json()
    message = data.get("message")

    if not message:
        return jsonify({"error": "No message provided"}), 400
    
    # Check if the client was initialized
    if not elevenlabs_client:
        return jsonify({"error": "Server is missing ElevenLabs API key"}), 500

    try:
        # 1. Generate the audio stream from ElevenLabs using the v1 client
        audio_stream = elevenlabs_client.text_to_speech.convert(
            text=message,  # <-- Use the message from the client
            voice_id="4tRn1lSkEn13EVTuqb0g",  # Example voice
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        # 2. Collect the audio data from the generator
        audio_data_chunks = []
        for chunk in audio_stream:
            if chunk:
                audio_data_chunks.append(chunk)
        
        if not audio_data_chunks:
            return jsonify({"error": "Failed to generate audio"}), 500

        audio_bytes = b"".join(audio_data_chunks)

        # 3. Create an in-memory file (a buffer)
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.seek(0)  # Rewind buffer to the start

        # 4. Send the audio file back to the client
        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",  # Specify the content type is MP3
            as_attachment=False     # Tell the browser to play it, not download it
        )

    except Exception as e:
        print(f"Error generating TTS audio: {e}")
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=5001)
else:
    sys.exit(1)
