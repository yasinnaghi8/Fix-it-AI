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

        # جلب المفتاح من متغيرات البيئة في Vercel
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in Vercel"}), 500

        prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل لو موجودة. رد بالعامية المصرية وادي خطوات عملية."
        
        parts = []
        # 1. إضافة النص إذا وُجد
        if msg:
            parts.append({"text": msg})
        else:
            parts.append({"text": "حلل الصورة دي وقولي المشكلة إيه؟"})

        # 2. إضافة الصورة إذا وُجدت (بصيغة inline_data)
        if image_data:
            try:
                # فصل الـ MIME type عن بيانات Base64
                header, base64_str = image_data.split(",", 1)
                mime_type = header.split(":")[1].split(";")[0] # image/jpeg أو image/png
                
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64_str
                    }
                })
            except Exception as e:
                return jsonify({"error": "مشكلة في تنسيق الصورة"}), 400

        # 3. تجهيز الطلب النهائي
        payload = {
            "contents": [{"parts": parts}],
            "system_instruction": {
                "parts": [{"text": prompt}]
            }
        }

        # استخدام موديل Gemini 3.8 Flash المستقر
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}

        # إرسال الطلب إلى Google
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        
        response_data = res.json()

        # استخراج النص من الرد
        try:
            ai_text = response_data['candidates'][0]['content']['parts'][0]['text']
            # إعادة تنسيق الرد ليتوافق مع الواجهة
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
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"مشكلة في الاتصال بجوجل: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"خطأ داخلي: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
