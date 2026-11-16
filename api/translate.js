const TONE_INSTRUCTIONS = {
  'samimi-kanka':
    'Samimi, esprili ve yakın bir iş arkadaşı (kanka) ağzıyla çevir. Kısa, doğal ve günlük Türkçe kullan.',
  'bikkin-calisan':
    'Toplantılardan ve plaza dilinden bıkmış, gerçekçi ve hafif iğneleyici bir ofis çalışanının iç sesi gibi çevir.',
  'durust-yonetici':
    'Lafı dolandırmayan, net, doğrudan gerçeği söyleyen dürüst bir yönetici ağzıyla çevir.',
};

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Yalnızca POST istekleri desteklenmektedir.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({
        error:
          'Yapay zekâ servisi şu anda yapılandırılmamış (GEMINI_API_KEY eksik). Lütfen yönetici ile iletişime geçin.',
      });
    }

    let body = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: 'Geçersiz JSON istek gövdesi.' });
      }
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
    }

    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    const tone = typeof body.tone === 'string' ? body.tone : 'bikkin-calisan';

    if (!rawText) {
      return res.status(400).json({ error: 'Lütfen çevrilecek bir kurumsal metin girin.' });
    }

    if (rawText.length > 1000) {
      return res.status(400).json({ error: 'Metin en fazla 1000 karakter olabilir.' });
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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
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

    const json = await geminiRes.json().catch(() => ({}));

    if (!geminiRes.ok) {
      const detail = (json && json.error && json.error.message) || `HTTP ${geminiRes.status}`;
      console.error('[api/translate] Gemini API hatası:', geminiRes.status, detail);
      return res.status(502).json({
        error: `Yapay zekâ servisinden yanıt alınamadı (${detail}). Lütfen biraz sonra tekrar deneyin.`,
      });
    }

    const parts = json?.candidates?.[0]?.content?.parts || [];
    const translatedText = parts
      .map((p) => p?.text || '')
      .join('')
      .trim();

    if (!translatedText) {
      return res.status(502).json({
        error: 'Yapay zekâ boş bir yanıt döndürdü. Lütfen cümlenizi düzenleyip tekrar deneyin.',
      });
    }

    return res.status(200).json({
      translatedText,
      model: 'gemini-3.8-flash',
    });
  } catch (err) {
    console.error('[api/translate] Sunucu hatası:', err);
    return res.status(500).json({
      error: 'Yapay zekâ sunucusuna bağlanırken bir hata oluştu. Lütfen tekrar deneyin.',
    });
  }
};
