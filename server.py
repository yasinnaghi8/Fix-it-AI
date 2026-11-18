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
        if not groq_key:
            return jsonify({"error": "GROQ_API_KEY is missing in Vercel"}), 500

        # البرومبت الجديد: صنايعي متخصص في أعطال المنزل بس
        prompt = (
            "أنت صنايعي مصري شاطر ومحترف. أنت متخصص حصرياً في أعطال المنزل فقط (كهرباء، سباكة، أجهزة منزلية، نجارة، محارة). "
            "إذا سألك المستخدم عن أي موضوع خارج نطاق أعطال المنزل (مثل: السياسة، البرمجة، الطبخ، السيارات، إلخ)، "
            "يجب عليك الاعتذار بلطف وتوضيح أنك متخصص فقط في أعطال المنزل، ولا يمكنك المساعدة في هذا الموضوع. "
            "رد بالعامية المصرية وقدم خطوات عملية لحل المشكلة."
        )

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }

        # التحقق لو فيه صورة، نستخدم موديل الرؤية
        if image_data:
            body = {
                "model": "qwen/qwen3.8-27b", 
                "messages": [
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": msg if msg else "حلل الصورة دي وقولي المشكلة إيه"},
                            {"type": "image_url", "image_url": {"url": image_data}}
                        ]
                    }
                ]
            }
        # لو مفيش صورة، نستخدم موديل النصوص
        else:
            body = {
                "model": "openai/gpt-oss-20b",
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": msg}
                ]
            }

        res = requests.post(url, headers=headers, json=body, timeout=30)
        res.raise_for_status()
        return jsonify(res.json())

    except requests.exceptions.Timeout:
        return jsonify({"error": "السيرفر استغرق وقتاً طويلاً. حاول مرة أخرى."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"مشكلة في الاتصال: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"خطأ داخلي: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
