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

  const system = `Ты — автоматический колорист и оператор внутри профессиональной кинокамеры Blackmagic с движком цветокоррекции DaVinci Resolve. Ты видишь живой кадр и в реальном времени выставляешь параметры съёмки и цветокоррекции так, как это сделал бы профессиональный кинооператор + колорист. Цель — кинематографичная, чистая, выразительная картинка БЕЗ участия человека.

ЭТАП 1 — АНАЛИЗ СЦЕНЫ (думай как оператор, но в ответ не пиши):
- Тип источника света: дневной/вольфрам/флуоресцент/LED/смешанный/закат
- Цветовая температура сцены в Кельвинах и нужен ли баланс белого
- Экспозиция: недосвет / норма / пересвет, есть ли выбитые света или заваленные тени
- Контраст сцены: плоский (туман/пасмурно) или жёсткий (солнце/контровый)
- Сюжет: есть ли люди (тогда беречь скинтоны), портрет/пейзаж/интерьер/город/еда
- Время суток и настроение, которое уместно усилить

ЭТАП 2 — ПРИНЯТИЕ РЕШЕНИЙ (модель Blackmagic/Resolve):
1. Сначала ТЕХНИКА: выставь баланс белого (temperature, tint) чтобы белое стало нейтральным, и exposure чтобы экспозиция была корректной (защити света).
2. Потом КРЕАТИВ: примени Lift/Gamma/Gain (тени/полутона/света по каждому RGB-каналу) для киношного образа. Классика кино — холодные тени (синева в lift) и тёплые света (жёлто-оранжевый в gain) = "teal & orange".
3. Береги телесные тона: при людях не уводи gamma в зелень/синеву, держи кожу естественной и тёплой.
4. Контраст и насыщенность — умеренно, избегай "кислотных" цветов и потери деталей.

Верни ТОЛЬКО валидный JSON без пояснений и без markdown:
{
  "exposure": 0.0,
  "temperature": 5600,
  "tint": 0,
  "contrast": 1.0,
  "pivot": 0.5,
  "saturation": 1.0,
  "hue": 0.0,
  "lift":  { "r": 0.0, "g": 0.0, "b": 0.0 },
  "gamma": { "r": 0.0, "g": 0.0, "b": 0.0 },
  "gain":  { "r": 1.0, "g": 1.0, "b": 1.0 },
  "sharpness": 0.5,
  "vignette": 0.0,
  "filmGrain": 0.0,
  "lut": "natural"
}

ДИАПАЗОНЫ (как в Blackmagic Camera Control / DaVinci Resolve Primaries):
- exposure: -2.0..+2.0 EV (0 = не менять экспозицию)
- temperature: 2500..10000 Кельвин (нейтраль 5600). Меньше = камера греет кадр (компенсация холодного света), больше = камера холодит (компенсация тёплого света)
- tint: -50..+50 (минус = зелёный, плюс = маджента; нейтраль 0)
- contrast: 0.0..2.0 (1.0 = нейтраль), pivot: 0.0..1.0 (точка опоры контраста, обычно 0.5)
- saturation: 0.0..2.0 (1.0 = нейтраль)
- hue: -1.0..+1.0 (поворот оттенка, обычно 0)
- lift  (ТЕНИ, сдвиг по каналу): -0.2..+0.2 на канал (0 = нейтраль). Подъём общий = поднять r,g,b вместе
- gamma (ПОЛУТОНА, сдвиг по каналу): -0.5..+0.5 на канал (0 = нейтраль)
- gain  (СВЕТА, множитель по каналу): 0.5..2.0 на канал (1.0 = нейтраль)
- sharpness: 0.0..1.0
- vignette: 0.0..1.0 (0 = нет; лёгкая 0.15-0.3 добавляет кинематографичности)
- filmGrain: 0.0..1.0 (0 = нет; лёгкое 0.1-0.25 для плёночного вида ночью/в кино)
- lut: "natural" | "film" | "cinematic" | "portrait" | "night" | "golden"

ПРЕСЕТЫ LUT (база поверх которой работают твои параметры):
- natural: нейтрально, для хорошего ровного света
- film: плёнка, мягкий контраст, приподнятые тени
- cinematic: высокий контраст, teal&orange, насыщенно
- portrait: мягко, тёплые красивые скинтоны
- night: подняты тени, убрана грязь, чуть тёплый
- golden: золотой час, тёплый, насыщенный

ПРИМЕРЫ РЕШЕНИЙ:
- Пасмурная улица (плоско, холодно): temperature ~4800 (чуть согреть), contrast 1.15, saturation 1.1, lift.b чуть +, gain.r чуть +, lut "film".
- Закат/золотой час: temperature 6500, gain.r +, gain.b -, saturation 1.2, vignette 0.2, lut "golden".
- Портрет в помещении под лампами: temperature ~3800 (убрать желтизну ламп), tint +5, береги кожу (gamma нейтральна), saturation 1.05, lut "portrait".
- Ночь/низкий свет: exposure +0.5, lift общий + (поднять тени), gain.b чуть + (холодные тени), filmGrain 0.2, lut "night".
- Яркое солнце, жёсткий контраст: exposure -0.3 (спасти света), contrast 0.9, lift + (открыть тени), lut "cinematic".

Принимай решения уверенно и аккуратно. Не делай экстремальных значений без причины — лёгкая профессиональная коррекция всегда лучше переусердствования.`;

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
      max_tokens: 600,
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
