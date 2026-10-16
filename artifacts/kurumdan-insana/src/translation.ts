const phraseTranslations: Array<{ phrases: string[]; translation: string }> = [
  {
    phrases: ['bir araya gelip hizalanalim', 'hizalanalim'],
    translation: 'Herkes başka bir şey anlamış; bunu netleştirmek için bir toplantı daha yapacağız.',
  },
  {
    phrases: ['proaktif aksiyon alalim', 'proaktif olalim'],
    translation: 'Sorun daha çıkmadı; ona rağmen acil bir işimiz var.',
  },
  {
    phrases: ['aksiyon plani'],
    translation: 'Yapılacaklar belli gibi. Kimin yapacağı kısmını toplantıda konuşuruz.',
  },
  {
    phrases: ['bir sonraki sprintte', 'sonraki sprinte'],
    translation: 'Şimdi değil. İki hafta sonra aynı konuyu yeniden açacağız.',
  },
  {
    phrases: ['takvimlerimize davet dusuyorum', 'takvimime davet'],
    translation: 'Bu bir e-posta olabilirdi; takvimden 45 dakika daha eksiliyor.',
  },
  {
    phrases: ['geri donus saglayacagim'],
    translation: 'Cevap vereceğim; ne zaman olacağı şu an takvimimde görünmüyor.',
  },
  {
    phrases: ['konuyu park edelim'],
    translation: 'Şu an karar veremiyoruz. Konuyu kibarca rafa kaldırıyoruz.',
  },
  {
    phrases: ['sinerji'],
    translation: 'Birlikte çalışmak. Bunu daha uzun söylemek için ayrı bir toplantı da yapabiliriz.',
  },
];

function normalizeCorporateText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function translateText(value: string): string {
  const normalized = normalizeCorporateText(value);
  if (!normalized) return '';

  const words = new Set(normalized.split(' '));
  const hasWord = (...candidates: string[]) =>
    [...words].some((word) => candidates.some((candidate) => word.startsWith(candidate)));
  const hasPhrase = (...candidates: string[]) =>
    candidates.some((phrase) => normalized.includes(phrase));

  if (
    hasWord('zam', 'maas', 'ucret', 'ikramiye', 'prim', 'bonus', 'terfi') ||
    hasPhrase('yan hak', 'maas artisi', 'ucret artisi')
  ) {
    return 'Bütçe yok, zam da yok. Ama bunu “gelişim fırsatı” diye paketleyebiliriz.';
  }

  if (
    hasPhrase(
      'isten cikar',
      'pozisyon kapaniyor',
      'rol sonlaniyor',
      'kadro daral',
      'organizasyonel degisiklik',
    )
  ) {
    return 'Kötü haber var; şimdi ona “yeni bir fırsat” dememiz bekleniyor.';
  }

  if (
    hasPhrase(
      'insan kaynaklari',
      'ik maili',
      'ik ekibi',
      'performans degerlendirme',
      'ofise donus',
      'hibrit calisma',
    ) ||
    hasWord('performans', 'politika', 'kariyer')
  ) {
    return 'Politika böyle. İstisna için form, onay ve biraz daha sabır gerekiyor.';
  }

  const phraseMatch = phraseTranslations.find(({ phrases }) => hasPhrase(...phrases));
  if (phraseMatch) return phraseMatch.translation;

  if (
    hasWord('toplanti', 'davet', 'takvim', 'sync', 'standup') ||
    hasPhrase('bir araya', 'hizalan', 'goruselim', 'gorusme', 'alignment')
  ) {
    return 'Bu e-posta olabilirdi; toplantı yine de uzayacak ve bir takip toplantısı doğuracak.';
  }

  if (
    hasWord('acil', 'ivedi', 'asap', 'deadline', 'bugun', 'yarin') ||
    hasPhrase('hemen lazim', 'bugun icinde', 'son tarih')
  ) {
    return 'Plan son dakika değişti; yetiştirme sorumluluğu da sihirli şekilde sana kaldı.';
  }

  if (
    hasWord('sprint', 'roadmap') ||
    hasPhrase('degerlendirelim', 'sonra bakariz', 'ileri tarihe', 'konuyu erteleyelim', 'ele alalim')
  ) {
    return 'Şu an net bir karar yok; konu takvimde sessizce ileri taşınıyor.';
  }

  if (
    hasWord('rapor', 'sunum', 'teslim', 'dokuman', 'slayt') ||
    hasPhrase('cikti hazir', 'hazirlik yap')
  ) {
    return 'İçerik dağınık; sunumun derli toplu görünmesi senden bekleniyor.';
  }

  if (
    hasWord('hedef', 'kpi', 'ciro', 'satis', 'kota') ||
    hasPhrase('buyume hedefi', 'pazar payi')
  ) {
    return 'Hedef yukarı çıktı, kaynaklar aynı kaldı. Matematik yine çalışanlardan yana değil.';
  }

  if (
    hasWord('butce', 'kapasite', 'headcount') ||
    hasPhrase('ekip sayisi', 'kaynak talebi')
  ) {
    return 'Kaynak artmıyor ama beklenti artıyor. Buna “verimlilik” diyeceğiz.';
  }

  if (
    hasWord('rica', 'lutfen', 'paylas', 'ilet', 'gonder', 'aksiyon', 'ownership') ||
    hasPhrase('geri bildirim', 'geri donus', 'destek rica')
  ) {
    return 'Bu bir rica değil; yapılacaklar listene nazikçe bırakılmış yeni bir iş.';
  }

  if (hasWord('tebrik', 'basari', 'takdir') || hasPhrase('harika is', 'guzel is')) {
    return 'İş çok iyi olmuş. Şimdi aynı kaliteyi, daha kısa sürede, tekrar bekliyoruz.';
  }

  if (
    hasWord('feedback', 'degerlendirme', 'optimize', 'stakeholder') ||
    hasPhrase('verimliligi artir', 'ucundan uca')
  ) {
    return 'Kurumsal tercüme: sorumluluk net değil, ama takip işi birinin üstüne kalacak.';
  }

  return 'Kurumsal tercüme: karar henüz net değil; takip etmek yine birinin işi olacak.';
}
