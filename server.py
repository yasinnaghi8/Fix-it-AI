import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)

# اسمح بس للدومينات بتاعتك (Vercel + Ngrok + localhost)
CORS(app, resources={r"/*": {"origins": "*"}})  # للتجربة، بعدين حدد الدومينات

# الـ Key من الـ Environment Variable (مش في الكود)
api_key = os.environ.get("GROQ_API_KEY")

@app.route('/ask', methods=['POST'])
def ask():
    if not api_key:
        return jsonify({"error": "GROQ_API_KEY not set"}), 500

    data = request.get_json(silent=True) or {}
    msg = data.get('message', '').strip()
    if not msg:
        return jsonify({"error": "message is required"}), 400

    prompt = "أنت صنايعي مصري شاطر. مختص بس في أعطال البيت. رد بالعامية وادي خطوات عملية."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    body = {
        "model": "openai/gpt-oss-20b",
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": msg}
        ]
    }

    try:
        res = requests.post(url, headers=headers, json=body, timeout=30)
        res.raise_for_status()
        return jsonify(res.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)