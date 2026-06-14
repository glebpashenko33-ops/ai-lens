import { PROFILE_NAMES } from './colorProfiles';

const SYSTEM_PROMPT = `Ты профессиональный колорист. Анализируй кадр и выбери ОДИН профиль.
Смотри на: освещение (тёплое/холодное/нейтральное), время суток,
место (улица/помещение), наличие людей.
Отвечай ТОЛЬКО валидным JSON без пояснений: {"profile": "название"}
Доступные профили: Дневной, Золотой час, Пасмурно, Ночной, Портрет, Кино, Помещение`;

export async function analyzeFrame(base64Image, apiKey) {
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: 'Выбери профиль для этого кадра.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[^}]+\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    const profile = parsed.profile;

    if (PROFILE_NAMES.includes(profile)) {
      return profile;
    }
    return null;
  } catch {
    return null;
  }
}
