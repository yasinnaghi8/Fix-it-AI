import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# المفتاح ده هيجيلنا من Vercel Environment Variables
openrouter_key = os.environ.get("OPENROUTER_API_KEY")
groq_key = os.environ.get("GROQ_API_KEY") # لسه محتاجينه لو مفيش صورة

@app.route('/ask', methods=['POST'])
def ask():
    if not openrouter_key:
        return jsonify({"error": "OpenRouter API Key is missing in Vercel"}), 500

    data = request.get_json(silent=True) or {}
    msg = data.get('message', '').strip()
    image_data = data.get('image') # ده الـ Base64

    if not msg and not image_data:
        return jsonify({"error": "Message or image is required"}), 400

    prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل جداً كأنك شايفها قدامك. قولي كل حاجة باينة فيها (الألوان، الخامات، أي عيوب، أي أسلاك). بعد كده ادي خطوات عملية بالعامية المصرية لحل المشكلة."

    if image_data:
        # بنستخدم OpenRouter عشان يشوف الصورة
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "HTTP-Referer": "https://fixit-ai-seven.vercel.app",
            "X-Title": "FixIt AI",
            "Content-Type": "application/json"
        }
        body = {
            "model": "google/gemini-2.0-flash-exp:free", # موديل جوجل اللي بيشوف
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": msg if msg else "حلل الصورة دي بالتفصيل"},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_data}
                        }
                    ]
                }
            ]
        }
    else:
        # لو مفيش صورة، بنستخدم Groq (اللي شغال في النص)
        if not groq_key:
            return jsonify({"error": "Groq API Key is missing"}), 500
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
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
        res = requests.post(url, headers=headers, json=body, timeout=60)
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
