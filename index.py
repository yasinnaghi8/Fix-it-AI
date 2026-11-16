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
    image_data = data.get('image') # ده الـ Base64 اللي جاي من الموقع

    if not msg and not image_data:
        return jsonify({"error": "Message or image is required"}), 400

    prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل جداً كأنك شايفها قدامك. قولي كل حاجة باينة فيها (الألوان، الخامات، أي عيوب، أي أسلاك، أي أجزاء تالفة). بعد كده ادي خطوات عملية بالعامية المصرية لحل المشكلة."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    if image_data:
        # الكود ده مبني على التوثيق الرسمي لـ Groq
        body = {
            "model": "qwen/qwen3.8-27b", # الموديل الرسمي الوحيد للصور
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": msg if msg else "حلل الصورة دي بالتفصيل وقولي المشكلة إيه"},
                        {
                            "type": "image_url", 
                            "image_url": {"url": image_data} # بنبعت الـ Base64 مباشرة
                        }
                    ]
                }
            ],
            "reasoning_effort": "high", # نخليه يفكر ويحلل الصورة بعمق
            "temperature": 0.3 # عشان الإجابة تبقى دقيقة ومش إبداعية أوي
        }
    else:
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
