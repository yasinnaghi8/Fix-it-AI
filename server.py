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
        image_data = data.get('image') # Base64 Data URL

        if not msg and not image_data:
            return jsonify({"error": "Message or image is required"}), 400

        groq_key = os.environ.get("GROQ_API_KEY")
        if not groq_key:
            return jsonify({"error": "GROQ_API_KEY is missing in Vercel"}), 500

        prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل لو موجودة. رد بالعامية المصرية وادي خطوات عملية."
        
        parts = []
        # 1. إضافة النص
        parts.append({"type": "text", "text": msg if msg else "حلل الصورة دي وقولي المشكلة إيه؟"})

        # 2. إضافة الصورة (لو موجودة) - تنسيق Groq الرسمي
        if image_data:
            parts.append({
                "type": "image_url",
                "image_url": {
                    "url": image_data # بنبعت الـ Base64 Data URL زي ما هو
                }
            })

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }

        # 3. اختيار الموديل: qwen للصور، gpt-oss للنصوص
        if image_data:
            body = {
                "model": "qwen/qwen3.8-27b", # موديل الرؤية من Groq
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": parts}
                ],
                "temperature": 0.3 # عشان الإجابة تبقى دقيقة
            }
        else:
            body = {
                "model": "openai/gpt-oss-20b", # موديل النصوص
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": msg}
                ]
            }

        # 4. إرسال الطلب
        res = requests.post(url, headers=headers, json=body, timeout=20)
        res.raise_for_status()
        
        response_data = res.json()
        
        # 5. استخراج الرد وتنسيقه
        try:
            ai_text = response_data['choices'][0]['message']['content']
            return jsonify({
                "choices": [
                    {"message": {"content": ai_text}}
                ]
            })
        except (KeyError, IndexError):
            return jsonify({"error": "Groq رفض يرد. قد تكون الصورة غير واضحة أو المحتوى مرفوض."}), 502

    except requests.exceptions.Timeout:
        return jsonify({"error": "السيرفر استغرق وقتًا طويلاً. جرب صورة أصغر."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"مشكلة في الاتصال بـ Groq: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"خطأ داخلي: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
