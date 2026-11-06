async function askGroqAI(userInput) {
    try {
        var res = await fetch("/ask", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userInput })
        });
        
        var textData = await res.text();
        
        try {
            var data = JSON.parse(textData);
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                return "مشكلة في السيرفر: " + JSON.stringify(data);
            }
        } catch (e) {
            return "السيرفر رجع خطأ: " + textData.substring(0, 100);
        }
        
    } catch (err) {
        return "مشكلة في الاتصال: " + err.message;
    }
}