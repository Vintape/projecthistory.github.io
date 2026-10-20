"""
OpenRouter Universal AI Gateway for Studio Pipeline
Provides unified access to Grok (xAI) and Mistral AI models.
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

class OpenRouterClient:
    # Model catalog
    MODEL_GROK = "x-ai/grok-4.7"
    MODEL_MISTRAL = "mistralai/mistral-medium-3-5"
    MODEL_CLAUDE_OPUS = "anthropic/claude-opus-5.5"
    MODEL_CLAUDE_SONNET = "anthropic/claude-sonnet-5.5"
    MODEL_CLAUDE_HAIKU = "anthropic/claude-haiku-5.5"
    MODEL_FREE_FALLBACK = "xingchen-agi/xing4.0-29b-a4b:free"

    def __init__(self, api_key: str = None):
        env = load_env()
        self.api_key = api_key or env.get("OPENROUTER_API_KEY", "")
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    def complete(self, prompt: str, system: str = None, model: str = None, temperature: float = 0.7, max_tokens: int = 500) -> str:
        """
        Sends completion request to OpenRouter.
        Defaults to Grok 4.7, with safe token limit to prevent overspending.
        """
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not found in studio/.env")

        target_model = model or self.MODEL_GROK
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        req = urllib.request.Request(
            self.base_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/projecthistory/projecthistory.github.io",
                "X-Title": "Artifact Cultural Heritage Studio"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            # If rate-limited or insufficient credits on paid model, auto-fallback if requested
            raise RuntimeError(f"OpenRouter Error ({e.code}) on {target_model}: {err_body}")

    def generate_folklore_tale(self, culture_name: str, topic: str) -> str:
        """Generates authentic folklore tale using Grok 4.7."""
        system = (
            f"Ты — древний народный сказитель культуры '{culture_name}'. "
            "Говори колоритно, былинно, с глубоким народным ритмом и мудростью, "
            "избегай сухих современных канцеляризмов и шаблонов."
        )
        prompt = f"Расскажи короткое поучительное сказание или миф на тему: {topic}. Объем: 2-3 емких абзаца."
        return self.complete(prompt=prompt, system=system, model=self.MODEL_GROK, max_tokens=600)

    def factcheck_ethnography(self, text: str) -> str:
        """Academic factcheck using Mistral."""
        system = "Ты — академический эксперт-этнограф и научный редактор музейной энциклопедии."
        prompt = f"Проверь данный текст на историческую точность и отсутствие псевдоисторических домыслов:\n\n{text}"
        return self.complete(prompt=prompt, system=system, model=self.MODEL_MISTRAL, max_tokens=400)

    def generate_opus_lore(self, title: str, culture: str, prompt_text: str) -> str:
        """High-end museum lore essay using Claude Opus 5.5."""
        system = (
            f"Ты — главный научный куратор и литературный эссеист музейной платформы 'АРТЕФАКТ'. "
            f"Культура: {culture}. Тема: {title}. "
            "Твой стиль: глубокий, кинематографичный, академически выверенный, на уровне изданий Эрмитажа и Arzamas."
        )
        return self.complete(prompt=prompt_text, system=system, model=self.MODEL_CLAUDE_OPUS, max_tokens=500)

if __name__ == "__main__":
    client = OpenRouterClient()
    print("Testing Grok 4.7 folklore generation...")
    story = client.generate_folklore_tale("Поморье", "Северное сияние и духи Белого моря")
    print("\n--- Сказание от Grok 4.7 ---")
    print(story)
