import os
import time
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

        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in Vercel"}), 500

        prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل لو موجودة. رد بالعامية المصرية وادي خطوات عملية."
        
        parts = []
        if msg:
            parts.append({"text": msg})
        else:
            parts.append({"text": "حلل الصورة دي وقولي المشكلة إيه؟"})

        if image_data:
            try:
                header, base64_str = image_data.split(",", 1)
                mime_type = header.split(":")[1].split(";")[0]
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64_str
                    }
                })
            except Exception as e:
                return jsonify({"error": "مشكلة في تنسيق الصورة"}), 400

        payload = {
            "contents": [{"parts": parts}],
            "system_instruction": {
                "parts": [{"text": prompt}]
            }
        }

        # استخدام مسار v1beta الصحيح للموديل
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                
                if response.status_code == 503:
                    if attempt < max_retries - 1:
                        time.sleep(2)  # انتظر ثانيتين قبل المحاولة التالية
                        continue
                    else:
                        return jsonify({"error": "خوادم جوجل مشغولة جداً حالياً. جرب تاني بعد شوية."}), 503
                
                response.raise_for_status()
                break  # الخروج من الحلقة إذا نجح الطلب

            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:
                    return jsonify({"error": f"فشل الاتصال بجوجل بعد عدة محاولات: {str(e)}"}), 502

        response_data = response.json()

        try:
            ai_text = response_data['candidates'][0]['content']['parts'][0]['text']
            formatted_response = {
                "choices": [
                    {"message": {"content": ai_text}}
                ]
            }
            return jsonify(formatted_response)
        except (KeyError, IndexError):
            return jsonify({"error": "جوجل رفض يرد. قد تكون الصورة غير واضحة أو المحتوى مرفوضًا."}), 502

    except requests.exceptions.Timeout:
        return jsonify({"error": "السيرفر استغرق وقتًا طويلاً. حاول مرة أخرى."}), 504
    except Exception as e:
        return jsonify({"error": f"خطأ داخلي: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
