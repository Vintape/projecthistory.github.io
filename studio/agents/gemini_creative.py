"""
Субагент: Креативный Директор и Научный Этнограф
Модели: gemini-2.5-pro / gemini-4-argon / gemini-2.5-flash
Провайдер: Google AI Studio API
"""

import os
import json
import urllib.request
import urllib.error
from pathlib import Path

def load_env():
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")

class GeminiCreativeAgent:
    def __init__(self, model: str = "gemini-3.8-flash"):
        load_env()
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = model
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    def check_status(self) -> dict:
        """Проверка доступности Google AI Studio API"""
        if not self.api_key:
            return {"status": "error", "message": "GEMINI_API_KEY не задан в studio/.env"}
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={self.api_key}"
        try:
            with urllib.request.urlopen(url, timeout=10) as response:
                return {"status": "authorized", "message": "Google AI Studio API активен и готов к генерации"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def evaluate_design_spec(self, component_name: str, html_snippet: str) -> dict:
        """Кураторский аудит музейного стиля (Anti-Slop & Quality Gate)"""
        system_instruction = (
            "Ты — Креативный директор и хранитель музейного стиля платформы «АРТЕФАКТ».\n"
            "Твоя задача — строго оценить фрагмент верстки на предмет эстетики, типографики и отсутствия дешёвых клише.\n"
            "Требования: строгая палитра (золото, глубокий кобальт, пергамент), академическая антиква, отсутствие кислотных цветов."
        )

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_instruction}\n\nКомпонент: {component_name}\nHTML:\n{html_snippet}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        req = urllib.request.Request(
            self.endpoint,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload).encode("utf-8")
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                result = json.loads(response.read().decode())
                content_text = result["candidates"][0]["content"]["parts"][0]["text"]
                return {"status": "success", "review": content_text}
        except Exception as e:
            return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    agent = GeminiCreativeAgent()
    print("Проверка статуса субагента Gemini Creative:")
    print(agent.check_status())
