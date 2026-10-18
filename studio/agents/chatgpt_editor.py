"""
Субагент: ChatGPT Литературный редактор и полиглот-фольклорист
Модели: gpt-4o / gpt-4o-mini
Провайдер: OpenAI API
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

class ChatGPTSubagent:
    def __init__(self, model: str = "gpt-4o-mini"):
        load_env()
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.model = model
        self.api_url = "https://api.openai.com/v1/chat/completions"

    def check_status(self) -> dict:
        """Проверка доступности и кредитного баланса API"""
        if not self.api_key:
            return {"status": "error", "message": "OPENAI_API_KEY не задан в studio/.env"}
        
        req = urllib.request.Request(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return {"status": "authorized", "message": "API-ключ действителен и авторизован"}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode()
            if "insufficient_quota" in err_body or "credit_balance_exhausted" in err_body:
                return {
                    "status": "quota_exhausted",
                    "message": "Ключ валиден, но на балансе OpenAI закончились кредиты. Пополните баланс на platform.openai.com/settings/organization/billing"
                }
            return {"status": "error", "message": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def polish_story(self, title: str, raw_text: str, audience: str = "family") -> dict:
        """Художественная редактура и адаптация сказок народов России"""
        system_prompt = (
            "Ты — литературный редактор платформы «АРТЕФАКТ: История оставляет след».\n"
            "Твоя задача — сделать слог исторически аутентичным, богатым, напевным и избавить текст от современных канцеляризмов и клише.\n"
            f"Целевая аудитория: {audience} (семейное чтение без жестокости, с сохранением этнографической правды)."
        )
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Отредактируй предание/сказку «{title}»:\n\n{raw_text}"}
            ],
            "temperature": 0.4
        }
        
        req = urllib.request.Request(
            self.api_url,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            data=json.dumps(payload).encode("utf-8")
        )
        
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                result = json.loads(response.read().decode())
                return {
                    "status": "success",
                    "content": result["choices"][0]["message"]["content"]
                }
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            return {"status": "error", "code": e.code, "detail": body}

if __name__ == "__main__":
    agent = ChatGPTSubagent()
    print("Проверка статуса субагента ChatGPT:")
    print(agent.check_status())
