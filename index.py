import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

api_key = os.environ.get("GROQ_API_KEY")

@app.route('/ask', methods=['POST'])
def ask():
    if not api_key:
        return jsonify({"error": "API Key is missing"}), 500

    data = request.get_json(silent=True) or {}
    msg = data.get('message', '').strip()
    image_data = data.get('image') # هنستقبل الصورة هنا لو موجودة

    if not msg and not image_data:
        return jsonify({"error": "Message or image is required"}), 400

    prompt = "أنت صنايعي مصري شاطر. مختص بس في أعطال البيت. رد بالعامية وادي خطوات عملية."
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # لو فيه صورة، هنستخدم موديل بيشوف الصور
    if image_data:
        body = {
            "model": "llama-3.2-11b-vision-preview", # موديل قوي لقراءة الصور
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": msg if msg else "حلل الصورة دي"},
                        {"type": "image_url", "image_url": {"url": image_data}}
                    ]
                }
            ]
        }
    else:
        # لو مفيش صورة، نستخدم موديل النصوص العادي (اللي كان شغال)
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
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)