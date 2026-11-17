import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/ask', methods=['POST'])
def ask():
    try:
        data = request.get_json(silent=True) or {}
        msg = data.get('message', '').strip()
        image_data = data.get('image')

        if not msg and not image_data:
            return jsonify({"error": "Message or image is required"}), 400

        groq_key = os.environ.get("GROQ_API_KEY")
        openrouter_key = os.environ.get("OPENROUTER_API_KEY")

        prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل لو موجودة. رد بالعامية المصرية وادي خطوات عملية."

        # لو فيه صورة، نستخدم OpenRouter
        if image_data and openrouter_key:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openrouter_key}",
                "HTTP-Referer": "https://fixit-ai-seven.vercel.app",
                "X-Title": "FixIt AI",
                "Content-Type": "application/json"
            }
            body = {
                "model": "qwen/qwen2.5-vl-7b-instruct:free", 
                "messages": [
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": msg if msg else "حلل الصورة دي بالتفصيل"},
                            {"type": "image_url", "image_url": {"url": image_data}}
                        ]
                    }
                ]
            }
            # قللنا الوقت لـ 9 ثواني عشان Vercel ميعملش Timeout
            res = requests.post(url, headers=headers, json=body, timeout=9)
            res.raise_for_status()
            return jsonify(res.json())

        # لو مفيش صورة، نستخدم Groq
        elif groq_key:
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
            res = requests.post(url, headers=headers, json=body, timeout=9)
            res.raise_for_status()
            return jsonify(res.json())
        
        else:
            return jsonify({"error": "مفاتيح الـ API مش موجودة في Vercel"}), 500

    except requests.exceptions.Timeout:
        return jsonify({"error": "الطلب خد وقت كبير أوي والسيرفر قطع الاتصال. جرب تاني."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"مشكلة في الاتصال بالـ API: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"خطأ داخلي في السيرفر: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
