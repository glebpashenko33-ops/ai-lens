const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '25mb' }));

// ─── Claude API proxy ────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { imageBase64, mode, message } = req.body;
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) return res.status(401).json({ error: 'Нет API ключа' });

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const prompts = {
    profile: {
      system: 'Ты профессиональный колорист. Анализируй кадр и выбери ОДИН профиль. Смотри на: освещение (тёплое/холодное/нейтральное), время суток, место (улица/помещение), наличие людей. Отвечай ТОЛЬКО валидным JSON без пояснений: {"profile": "название"}\nДоступные профили: Дневной, Золотой час, Пасмурно, Ночной, Портрет, Кино, Помещение',
      user: 'Выбери профиль для этого кадра.'
    },
    tips: {
      system: 'Ты профессиональный фотограф-советник. Анализируй кадр и давай ОЧЕНЬ короткие, конкретные советы на русском языке.',
      user: 'Проанализируй этот кадр с камеры. Дай 2-3 коротких совета для лучшего снимка. Будь конкретен: "Сдвинься влево", "Опусти камеру" и т.д. Верни JSON: {"tips": ["совет1", "совет2"], "score": 7, "mood": "описание атмосферы"}'
    },
    full: {
      system: 'Ты профессиональный фотограф и колорист. Анализируй фото и давай детальные советы по композиции и цветокоррекции.',
      user: `Проанализируй это фото как профессиональный фотограф. Верни JSON (только JSON, без пояснений):
{
  "composition": "текст обратной связи по композиции",
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2"],
  "colorCorrection": {
    "brightness": 1.0,
    "contrast": 1.0,
    "saturation": 1.0,
    "warmth": 0
  },
  "filterSuggestion": "warm|cool|vivid|natural|bw",
  "mood": "описание настроения фото",
  "score": 7
}
Для colorCorrection: brightness/contrast/saturation 0.5-2.0 (1.0 = норма), warmth от -50 до 50 (+ теплее, - холоднее).`
    },
    edit: {
      system: 'Ты профессиональный ретушёр и фотошоп-мастер. Помогай редактировать фото. Отвечай на русском.',
      user: `Запрос пользователя: "${message}". Проанализируй фото и запрос. Верни JSON:
{
  "response": "Дружелюбный ответ на русском — что ты сделаешь",
  "adjustments": {
    "brightness": 1.0,
    "contrast": 1.0,
    "saturation": 1.0,
    "warmth": 0
  },
  "removeBackground": false,
  "suggestion": "дополнительный совет"
}
Если пользователь просит убрать людей/объекты — установи removeBackground: true.`
    }
  };

  const p = prompts[mode];
  if (!p) return res.status(400).json({ error: 'Неверный режим' });

  const content = [];
  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
    });
  }
  content.push({ type: 'text', text: p.user });

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: p.system,
      messages: [{ role: 'user', content }]
    });

    const text = msg.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      res.json(JSON.parse(match[0]));
    } else {
      res.json({ response: text });
    }
  } catch (err) {
    console.error('Claude error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎵  AI Camera — умная камера с ИИ\n');
  console.log(`💻  Компьютер:   http://localhost:${PORT}`);

  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`📱  Телефон (WiFi): http://${net.address}:${PORT}`);
      }
    }
  }

  console.log('\n⚠️   Для камеры на iPhone нужен HTTPS. На Android работает по HTTP.');
  console.log('📖  Инструкция: см. README.md\n');
});
