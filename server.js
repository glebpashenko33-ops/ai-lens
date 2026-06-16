const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '25mb' }));

// ─── Config: tells the client whether a server-side key is available ─────────
app.get('/api/config', (req, res) => {
  res.json({ hasServerKey: !!process.env.ANTHROPIC_API_KEY });
});

// ─── Claude API proxy ────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { imageBase64 } = req.body;
  // Prefer server-side key (Railway env), fall back to user-provided key
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers['x-api-key'];

  if (!apiKey) return res.status(401).json({ error: 'no_key' });

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const system = `Ты — автоматическая система управления профессиональной кинокамерой, аналог Blackmagic Camera.
Твоя задача: проанализировать кадр и вернуть точные параметры обработки изображения для достижения кинематографичной картинки.

Анализируй: тип освещения, цветовую температуру, яркость сцены, наличие людей, время суток, интерьер/экстерьер, движение, контрастность.

Верни ТОЛЬКО валидный JSON без пояснений:
{
  "exposure": 0.0,
  "contrast": 1.0,
  "saturation": 1.0,
  "temperature": 0,
  "tint": 0,
  "shadows": 0.0,
  "highlights": 0.0,
  "blacks": 0.0,
  "whites": 0.0,
  "sharpness": 0.5,
  "vignette": 0.0,
  "filmGrain": 0.0,
  "lut": "natural"
}

Диапазоны (как в Blackmagic Camera):
- exposure: -2.0 до +2.0 (EV, 0 = нейтрально)
- contrast: 0.5 до 2.0 (1.0 = нейтрально)
- saturation: 0.0 до 2.5 (1.0 = нейтрально)
- temperature: -100 до +100 (отрицательное = холоднее/синее, положительное = теплее/жёлтое)
- tint: -100 до +100 (отрицательное = зелень, положительное = маджента)
- shadows: -1.0 до +1.0 (подъём/опускание теней)
- highlights: -1.0 до +1.0 (восстановление/усиление светов)
- blacks: -1.0 до +1.0 (точка чёрного)
- whites: -1.0 до +1.0 (точка белого)
- sharpness: 0.0 до 1.0
- vignette: 0.0 до 1.0 (0 = нет виньетки)
- filmGrain: 0.0 до 1.0 (0 = нет зерна)
- lut: "natural" | "film" | "cinematic" | "portrait" | "night" | "golden"

Пресеты LUT:
- natural: нейтральная обработка для хорошего освещения
- film: киношная обработка, подъём теней, синие тени тёплые света
- cinematic: высокий контраст, насыщенные цвета
- portrait: мягкий свет, красивые скинтоны, тёплый
- night: поднятые тени, шум убран, яркость поднята
- golden: золотой час, тёплый, высокая насыщенность

Принимай решение как профессиональный кинооператор. Цель — кинематографичная картинка.`;

  const content = [];
  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
    });
  }
  content.push({ type: 'text', text: 'Проанализируй кадр и верни параметры камеры.' });

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content }]
    });

    const text = msg.content[0].text;
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      res.json(JSON.parse(match[0]));
    } else {
      res.status(422).json({ error: 'parse_error' });
    }
  } catch (err) {
    console.error('Claude error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Lens running on port ${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`Local network: http://${net.address}:${PORT}`);
      }
    }
  }
});
