/// <reference lib="dom" />

declare const process: {
  env: Record<string, string | undefined>;
};

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: Record<string, unknown>) => void;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  'samimi-kanka':
    'Samimi, esprili ve yakın bir iş arkadaşı (kanka) ağzıyla çevir. Kısa, doğal ve günlük Türkçe kullan.',
  'bikkin-calisan':
    'Toplantılardan ve plaza dilinden bıkmış, gerçekçi ve hafif iğneleyici bir ofis çalışanının iç sesi gibi çevir.',
  'durust-yonetici':
    'Lafı dolandırmayan, net, doğrudan gerçeği söyleyen dürüst bir yönetici ağzıyla çevir.',
};

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Yalnızca POST istekleri desteklenmektedir.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    res.status(503).json({
      error: 'Yapay zekâ servisi şu anda yapılandırılmamış (GEMINI_API_KEY eksik). Lütfen yönetici ile iletişime geçin.',
    });
    return;
  }

  let body: { text?: unknown; tone?: unknown } = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as { text?: unknown; tone?: unknown };
    } catch {
      res.status(400).json({ error: 'Geçersiz JSON istek gövdesi.' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body as { text?: unknown; tone?: unknown };
  }

  const rawText = typeof body.text === 'string' ? body.text.trim() : '';
  const tone = typeof body.tone === 'string' ? body.tone : 'bikkin-calisan';

  if (!rawText) {
    res.status(400).json({ error: 'Lütfen çevrilecek bir kurumsal metin girin.' });
    return;
  }

  if (rawText.length > 1000) {
    res.status(400).json({ error: 'Metin en fazla 1000 karakter olabilir.' });
    return;
  }

  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS['bikkin-calisan'];
  const prompt = [
    'Sen "Kurumdan İnsana" adlı bir kurumsal plaza dili tercümanısın.',
    'Görevin: Verilen kurumsal Türkçe cümleyi, insanların günlük hayatta gerçekten kastettiği kısa, net ve esprili insan diline çevirmek.',
    `Ton talimatı: ${toneInstruction}`,
    'Kurallar:',
    '- Yalnızca çevrilmiş Türkçe cümleyi döndür; başlık, tırnak işareti veya ekstra açıklama ekleme.',
    '- Metinde kişisel veri (TCKN, telefon, e-posta, şifre vb.) varsa bunları çıktıda kesinlikle tekrar etme veya anonimleştir.',
    `Kurumsal cümle: ${rawText}`,
  ].join('\n');

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
          },
        }),
      },
    );

    const json = (await geminiRes.json().catch(() => ({}))) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    };

    if (!geminiRes.ok) {
      const detail = json.error?.message || `HTTP ${geminiRes.status}`;
      console.error('[api/translate] Gemini API hatası:', geminiRes.status, detail);
      res.status(502).json({
        error: `Yapay zekâ servisinden yanıt alınamadı (${detail}). Lütfen biraz sonra tekrar deneyin.`,
      });
      return;
    }

    const translatedText =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';

    if (!translatedText) {
      res.status(502).json({
        error: 'Yapay zekâ boş bir yanıt döndürdü. Lütfen cümlenizi düzenleyip tekrar deneyin.',
      });
      return;
    }

    res.status(200).json({
      translatedText,
      model: 'gemini-2.5-flash',
    });
  } catch (err) {
    console.error('[api/translate] Sunucu hatası:', err);
    res.status(500).json({
      error: 'Yapay zekâ sunucusuna bağlanırken bir hata oluştu. Lütfen tekrar deneyin.',
    });
  }
}
