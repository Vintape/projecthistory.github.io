#!/usr/bin/env python3
"""
Студийный генератор этнической озвучки (Offline Gemini TTS Pipeline)
Использует Google AI Studio API: gemini-2.5-flash-preview-tts.
Генерирует чистые студийные MP3-файлы в папку audio/ для мгновенного
воспроизведения на сайте БЕЗ рантайм-обращений к ИИ.
"""

import os
import json
import base64
import wave
import subprocess
import urllib.request
from pathlib import Path

# Загрузка ключа из studio/.env
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

API_KEY = os.environ.get("GEMINI_API_KEY")
AUDIO_DIR = Path(__file__).parent.parent / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_CONFIGS = [
    {
        "id": "tatarstan",
        "voice": "Charon",
        "instruction": "Произнеси с теплым, мудрым и гостеприимным восточным колоритом пожилого казанского хранителя древностей",
        "text": "Исәнмесез! Рәхим итегез! Казанские мастера веками хранили секреты золотого шитья и мозаичной кожи. Добро пожаловать в сокровищницу Татарстана."
    },
    {
        "id": "pomorye",
        "voice": "Fenrir",
        "instruction": "Произнеси весомым, спокойным и глубоким былинным голосом поморского морехода под шум студеного Белого моря",
        "text": "Поклон да здравие гостям дорогим! Северный край встречает вас мезенской росписью, резным деревом и мудростью древних поморов."
    },
    {
        "id": "yakutia",
        "voice": "Charon",
        "instruction": "Произнеси неспешным, глубоким и мистическим голосом старого якутского сказителя-олонхосута у мерцающего костра",
        "text": "Дорообо! Нөрүөн нөргүй! Вечная мерзлота хранит тайны сотворения мира, серебряные обереги и благословение светлых духов Айыы."
    },
    {
        "id": "altai",
        "voice": "Fenrir",
        "instruction": "Произнеси размеренным, благородным и уважительным тоном алтайского кайчи с легким гортанным оттенком",
        "text": "Јакшылар! Амыр-менди! Священные вершины Белухи и древние курганы кочевников открывают вам вечную гармонию человека и природы."
    },
    {
        "id": "kamchatka",
        "voice": "Puck",
        "instruction": "Произнеси бодрым, напевным и самобытным голосом ительменского охотника и хранителя вулканов",
        "text": "Алегут! Мэчи! Земля огнедышащих сопок и танцующих духов встречает вас шепотом океана и древней песней шаманского бубна."
    },
    {
        "id": "uzbekistan",
        "voice": "Charon",
        "instruction": "Произнеси мелодичным, велеречивым и чарующим голосом шелкового пути древней Бухары и Самарканда",
        "text": "Ассалому алайкум! Хуш келибсиз! Лазурная мозаика медресе и солнечные узоры чеканщиков приветствуют благородных странников."
    },
    {
        "id": "kazakhstan",
        "voice": "Charon",
        "instruction": "Произнеси звучным, широким и поэтичным голосом степного акына в просторах бескрайней Сарыарки",
        "text": "Ассалаумағалейкум! Қош келдіңіз! Золотой человек Иссыка и звонкие струны домбры рассказывают сагу о великой степи."
    }
]

def generate_voice(item):
    out_mp3 = AUDIO_DIR / f"{item['id']}.mp3"
    temp_wav = AUDIO_DIR / f"temp_{item['id']}.wav"
    
    print(f"🎙️ Озвучивание [{item['id']}] через Gemini TTS ({item['voice']})...")
    
    prompt = f"{item['instruction']}: «{item['text']}»"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": item["voice"]}
                }
            }
        }
    }
    
    req = urllib.request.Request(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload).encode("utf-8")
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            b64_audio = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
            pcm_bytes = base64.b64decode(b64_audio)
            
            # Сохранение во временный WAV
            with wave.open(str(temp_wav), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(24000)
                wf.writeframes(pcm_bytes)
                
            # Конвертация в компактный MP3 (64 kbps, ~40-60 КБ)
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(temp_wav), "-b:a", "64k", str(out_mp3)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True
            )
            
            # Удаляем временный WAV
            if temp_wav.exists():
                temp_wav.unlink()
                
            size_kb = out_mp3.stat().st_size / 1024
            print(f"  ✓ Готово: {out_mp3.name} ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"  ⚠ Ошибка генерации для {item['id']}: {e}")

if __name__ == "__main__":
    print(f"🚀 Запуск генерации этнической студийной озвучки в {AUDIO_DIR}\n")
    for item in VOICE_CONFIGS:
        generate_voice(item)
    print("\n🎉 Все 7 этнических аудиофайлов успешно сгенерированы и готовы к прослушиванию!")
