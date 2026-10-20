"""
Dedicated Claude Gateway (StarIMG Provider)
Direct access to Claude Opus 5.5, Sonnet 5.5, and Fable 5.1
"""

import os
import json
import urllib.request
import urllib.error
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

def load_env():
    env = {}
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env

class StarImgClaudeClient:
    # Model catalog on ai.starimg.ru
    MODEL_OPUS = "claude-opus-5-5"
    MODEL_SONNET = "claude-sonnet-5-5"
    MODEL_FABLE = "claude-fable-5-1"
    MODEL_HAIKU = "claude-haiku-5-5"

    def __init__(self, api_key: str = None, base_url: str = None):
        env = load_env()
        self.api_key = api_key or env.get("STARIMG_CLAUDE_API_KEY", "")
        self.base_url = (base_url or env.get("STARIMG_BASE_URL", "https://ai.starimg.ru")).rstrip("/")

    def complete(self, prompt: str, system: str = None, model: str = None, max_tokens: int = 500, temperature: float = 0.7) -> str:
        """Sends inference request to Claude on StarIMG."""
        if not self.api_key:
            raise ValueError("STARIMG_CLAUDE_API_KEY not found in studio/.env")

        target_model = model or self.MODEL_OPUS
        payload = {
            "model": target_model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature
        }
        if system:
            payload["system"] = system

        req = urllib.request.Request(
            f"{self.base_url}/v1/messages",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res["content"][0]["text"]
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"StarIMG Claude Error ({e.code}) on {target_model}: {err_body}")

    def generate_museum_lore(self, culture: str, title: str, prompt_text: str) -> str:
        """Generates high-end museum lore essay using Claude Opus 5.5."""
        system = (
            f"Ты — верховный научный куратор и литературный эссеист музейной платформы 'АРТЕФАКТ'. "
            f"Культура: {culture}. Тема: {title}. "
            "Твой стиль: глубокий, кинематографичный, академически выверенный, уровня каталогов Эрмитажа и Arzamas."
        )
        return self.complete(prompt=prompt_text, system=system, model=self.MODEL_OPUS, max_tokens=600)

if __name__ == "__main__":
    client = StarImgClaudeClient()
    print("Testing Claude Opus 5.5 on StarIMG...")
    lore = client.generate_museum_lore(
        culture="Якутия",
        title="Олонхо и Древо Аал Луук Мас",
        prompt_text="Напиши емкое, завораживающее введение к разделу эпоса Олонхо о структуре трех миров (2-3 абзаца)."
    )
    print("\n--- Эссе от Claude Opus 5.5 ---\n")
    print(lore)
