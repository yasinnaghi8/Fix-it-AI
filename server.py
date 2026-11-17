import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

@app.route('/ask', methods=['POST'])
def ask():
    try:
        data = request.get_json(silent=True) or {}
        msg = data.get('message', '').strip()
        image_data = data.get('image') # ده الـ Base64

        if not msg and not image_data:
            return jsonify({"error": "Message or image is required"}), 400

        # بنجيب المفتاح من إعدادات Vercel
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return jsonify({"error": "GEMINI_API_KEY is missing in Vercel"}), 500

        # تجهيز البرومبت الأساسي
        prompt = "أنت صنايعي مصري شاطر ومحترف. حلل الصورة دي بالتفصيل لو موجودة. رد بالعامية المصرية وادي خطوات عملية."
        
        # تجهيز الرسالة (Parts)
        parts = []
        if msg:
            parts.append({"text": msg})
        else:
            parts.append({"text": "حلل الصورة دي وقولي المشكلة إيه؟"})

        # لو فيه صورة، بنفصل الـ Mime Type عن الـ Base64
        if image_data:
            try:
                # image_data شكله كده: data:image/jpeg;base64,/9j/4AAQSk...
                header, base64_str = image_data.split(",", 1)
                mime_type = header.split(":")[1].split(";")[0] # بياخد image/jpeg أو image/png
                
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64_str
                    }
                })
            except Exception as e:
                return jsonify({"error": "مشكلة في تنسيق الصورة"}), 400

        # تجهيز الـ Payload لـ Gemini
        payload = {
            "contents": [{"parts": parts}],
            "system_instruction": {
                "parts": [{"text": prompt}]
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}

        # بنبعت الطلب لـ جوجل
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        res.raise_for_status()
        
        response_data = res.json()

        # استخراج النص من رد جوجل عشان نبعته للواجهة بالشكل اللي هي متعودة عليه
        try:
            ai_text = response_data['candidates'][0]['content']['parts'][0]['text']
            # بنرجع الرد بنفس شكل OpenAI عشان script.js ميتلخبطش
            formatted_response = {
                "choices": [
                    {"message": {"content": ai_text}}
                ]
            }
            return jsonify(formatted_response)
        except (KeyError, IndexError):
            # لو جوجل رد بشكل غريب (زي فلتر المحتوى)
            return jsonify({"error": "جوجل رفض يرد على الرسالة دي. ممكن تكون الصورة مش واضحة أو فيها حاجة ممنوعة."}), 502

    except requests.exceptions.Timeout:
        return jsonify({"error": "السيرفر خد وقت كبير أوي وجوجل ماردش. جرب تاني."}), 504
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
