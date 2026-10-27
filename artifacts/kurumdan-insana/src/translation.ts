export type TranslationTone = 'samimi-kanka' | 'bikkin-calisan' | 'durust-yonetici';

export interface TranslationToneOption {
  id: TranslationTone;
  label: string;
  subtitle: string;
  emoji: string;
}

export const TONE_OPTIONS: TranslationToneOption[] = [
  {
    id: 'samimi-kanka',
    label: 'Samimi Kanka',
    subtitle: 'Ofis arkadaşı iç sesi',
    emoji: '🤙',
  },
  {
    id: 'bikkin-calisan',
    label: 'Bıkkın Çalışan',
    subtitle: 'Tükenmiş plaza insanı',
    emoji: '☕',
  },
  {
    id: 'durust-yonetici',
    label: 'Dürüst Yönetici',
    subtitle: 'Filtresiz yönetim gerçeği',
    emoji: '👔',
  },
];

export const SAMPLE_TEXTS = [
  'Bir araya gelip hizalanalım, proaktif aksiyon alıp konuyu bir sonraki sprintte ele alalım.',
  'Takvimlerimize davet düşüyorum, sinerjimizi artırmak ve hedeflerimizle hizalanmak adına kısa bir sync rica ediyorum.',
  'Konuyu şimdilik park edelim, stakeholder feedbackleri doğrultusunda roadmapimizi optimize ederiz.',
  'Bütçe kısıtları nedeniyle kadro artışı yapamıyoruz ancak mevcut kapasitemizi ve verimliliğimizi artırabiliriz.',
  'Müşteri tarafındaki deadline nedeniyle bu konuyu ASAP çözmemiz gerekiyor, sahiplenme rica ediyorum.',
  'İK ekibi olarak ofise dönüş ve hibrit çalışma politikalarımızı yeniden gözden geçirip performans sürecini başlatıyoruz.',
];

interface ToneTranslationDict {
  'samimi-kanka': string;
  'bikkin-calisan': string;
  'durust-yonetici': string;
}

interface PhraseRule {
  phrases: string[];
  translations: ToneTranslationDict;
}

const phraseTranslations: PhraseRule[] = [
  {
    phrases: ['bir araya gelip hizalanalim', 'hizalanalim', 'alignment'],
    translations: {
      'samimi-kanka': 'Kanka olay şu: Herkes başka bir şey anlamış, bir saat lak lak edip bir toplantı daha çıkaracağız.',
      'bikkin-calisan': 'Bu konu tek satırlık bir e-posta olabilirdi. Ama yine 45 dakikalık takvim katliamı yapılacak.',
      'durust-yonetici': 'Üst yönetimden bana da baskı geliyor, ne yapacağımı tam kestiremedim; hepinizi toplayıp suçu paylaştıracağım.',
    },
  },
  {
    phrases: ['proaktif aksiyon alalim', 'proaktif olalim', 'proaktif'],
    translations: {
      'samimi-kanka': 'Kanka Türkçesi: Kriz patlamadan önce bir şeyler karalayalım, ihale bize kalmasın.',
      'bikkin-calisan': 'Henüz çıkmamış bir sorun için panikleyip gecenin bir yarısı bana yeni iş kitleyeceksiniz.',
      'durust-yonetici': 'Sorumluluk benden çıksın diye havalı kelimeler kullanıyorum; siz koşturun, raporda ben sahipleneyim.',
    },
  },
  {
    phrases: ['bir sonraki sprintte', 'sonraki sprinte', 'sonraki sprint'],
    translations: {
      'samimi-kanka': 'Kanka açık konuşayım, şu an hiç havamda değilim. İki hafta sonra bakarız deyip savsaklıyorum.',
      'bikkin-calisan': 'Şu an uğraşacak zihinsel kapasitem eksi değerlerde. İki hafta sonra aynı bıkkınlıkla tekrar erteleriz.',
      'durust-yonetici': 'Müşteriye yetişmeyeceğini anladım ama bunu şık bir sprint planlaması gibi gösteriyorum.',
    },
  },
  {
    phrases: ['takvimlerimize davet dusuyorum', 'takvimime davet', 'davet dusuyorum'],
    translations: {
      'samimi-kanka': 'Kanka takvimine mayın bıraktım; o saatte kahve içmeye kaçamayacaksın.',
      'bikkin-calisan': 'Günün en verimli saatini daha buharlaştırıyorum. Masada kamerası kapalı oturacağız.',
      'durust-yonetici': 'Gündem yok, hedef yok; ama çok çalışıyormuşuz gibi takvim doldurmamız lazım.',
    },
  },
  {
    phrases: ['konuyu park edelim', 'park edelim'],
    translations: {
      'samimi-kanka': 'Kanka bunu sessizce rafa kaldıralım, kimse hatırlamazsa sonsuza dek unutulur.',
      'bikkin-calisan': 'Bu saçmalıkla uğraşmak istemiyorum. Kibarca çöpe atıyorum.',
      'durust-yonetici': 'Riskli konu, karar verirsem başım ağrıyabilir. Dosyayı unutturmaya alıyorum.',
    },
  },
  {
    phrases: ['sinerji', 'sinerjimizi'],
    translations: {
      'samimi-kanka': 'Kanka tek başına yapamayacağımız işi iki kişi birlikte yapıp iki katı vakit harcayacağız.',
      'bikkin-calisan': 'Kulağa felsefi gelen bir kelimeyle birbirimize boş laflar anlatıp dağılacağız.',
      'durust-yonetici': 'Departmanlar kavga etmesin diye havalı kelimelerle arayı bulmaya çalışıyorum.',
    },
  },
  {
    phrases: ['geri donus saglayacagim', 'geri bildirim rica'],
    translations: {
      'samimi-kanka': 'Kanka okudum ama ne zaman cevap veririm inan hiç bilmiyorum, darlama beni.',
      'bikkin-calisan': 'Gelen kutumda 300 okunmamış mail var, bu mail de onların arasında kaybolup gidecek.',
      'durust-yonetici': 'Talebiniz pek umurumda değil ama kurumsal nezaket gereği geçiştiriyorum.',
    },
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

export function translateText(
  value: string,
  tone: TranslationTone = 'bikkin-calisan',
): string {
  const normalized = normalizeCorporateText(value);
  if (!normalized) return '';

  const words = new Set(normalized.split(' '));
  const hasWord = (...candidates: string[]) =>
    [...words].some((word) => candidates.some((candidate) => word.startsWith(candidate)));
  const hasPhrase = (...candidates: string[]) =>
    candidates.some((phrase) => normalized.includes(phrase));

  // 1. Specific phrase matches
  const phraseMatch = phraseTranslations.find(({ phrases }) => hasPhrase(...phrases));
  if (phraseMatch) {
    return phraseMatch.translations[tone];
  }

  // 2. Zam / Maas / Ucret / Prim
  if (
    hasWord('zam', 'maas', 'ucret', 'ikramiye', 'prim', 'bonus', 'terfi') ||
    hasPhrase('yan hak', 'maas artisi', 'ucret artisi')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka meteliksiziz diyorlar ama yine “biz bir aileyiz” sosuna bulamışlar. Bu sene de zam hayal.';
    }
    if (tone === 'durust-yonetici') {
      return 'Bütçeyi başka yere harcadık. Size zam veremem ama LinkedIn’de havalı bir unvan ve yeni sorumluluklar verebilirim.';
    }
    return 'Bütçe yok, zam da yok. Ama bunu “kariyer gelişim fırsatı” diye paketleyip motivasyon semineri vereceğiz.';
  }

  // 3. Isten Cikarma / Kuculme
  if (
    hasPhrase(
      'isten cikar',
      'pozisyon kapaniyor',
      'rol sonlaniyor',
      'kadro daral',
      'organizasyonel degisiklik',
    )
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka durum fena. Kibarca kapıyı gösteriyorlar ama adına “yeni ufuklara yelken açma” diyorlar.';
    }
    if (tone === 'durust-yonetici') {
      return 'Maliyetleri kısmamız lazımdı, ilk feda edilecek kalemi belirledik. Şimdi bunu profesyonelce söylemeye çalışıyorum.';
    }
    return 'Kötü haber var; şimdi ona yönetimce “yeni bir fırsat ve dönüşüm” dememiz bekleniyor.';
  }

  // 4. Insan Kaynaklari / Ofise Donus / Politika
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
    if (tone === 'samimi-kanka') {
      return 'Kanka İK’dan “tatlı” bir mail geldiyse arkasından kesin bir zorunluluk veya kesinti çıkacak, gardını al.';
    }
    if (tone === 'durust-yonetici') {
      return 'Üst yönetim ofiste insan görmek istiyor, benim de yapabileceğim bir şey yok; kuralları uygulamak zorundayım.';
    }
    return 'Politika böyle. İstisna için üç form, beş onay ve sınırsız sabır gerekiyor. Ofise gel, kameranı aç.';
  }

  // 5. Toplanti / Takvim / Sync / Standup
  if (
    hasWord('toplanti', 'davet', 'takvim', 'sync', 'standup') ||
    hasPhrase('bir araya', 'hizalan', 'goruselim', 'gorusme', 'alignment')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka takvimde boş yer gördüler ya, hemen bir toplantı kondurdular. Yine yarım saat havadan sudan konuşacağız.';
    }
    if (tone === 'durust-yonetici') {
      return 'Gündem net değil ama toplanıp konuşursak üst yönetime “çalışıyoruz” imajı verebiliriz.';
    }
    return 'Bu konu bir e-posta olabilirdi; toplantı yine uzayacak ve arkasından takip toplantısı doğuracak.';
  }

  // 6. Acil / ASAP / Deadline / Bugun / Yarin
  if (
    hasWord('acil', 'ivedi', 'asap', 'deadline', 'bugun', 'yarin') ||
    hasPhrase('hemen lazim', 'bugun icinde', 'son tarih')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka yangından mal kaçırır gibi son dakika iş yıktılar; akşam yine buradayız, geçmiş olsun.';
    }
    if (tone === 'durust-yonetici') {
      return 'Yukarıya yetişeceğine dair söz verdim, şimdi sizin hafta sonunuzu feda ederek beni kurtarmanızı bekliyorum.';
    }
    return 'Planlama beceriksizliği son dakikada yine benim kişisel acil durumum hâline getirildi.';
  }

  // 7. Sprint / Roadmap / Erteleme
  if (
    hasWord('sprint', 'roadmap') ||
    hasPhrase('degerlendirelim', 'sonra bakariz', 'ileri tarihe', 'konuyu erteleyelim', 'ele alalim')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka şu an kimsenin bunu yapacak takati yok. İki hafta sonraya atalım da başımızdan gitsin.';
    }
    if (tone === 'durust-yonetici') {
      return 'Geciktiğimizi müşteriye çaktırmamak için bunu havalı bir “çevik yol haritası revizyonu” diye anlatacağım.';
    }
    return 'Şu an net bir karar yok; konu takvimde sessizce ileri tarihe sürgün ediliyor.';
  }

  // 8. Rapor / Sunum / Slayt / Dokuman
  if (
    hasWord('rapor', 'sunum', 'teslim', 'dokuman', 'slayt') ||
    hasPhrase('cikti hazir', 'hazirlik yap')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka kimsenin okumayacağı 40 slaytlık sunumu yine sana kitlemişler, kolaylıklar dilerim.';
    }
    if (tone === 'durust-yonetici') {
      return 'Yönetim kuruluna göstermek için renkli grafikler lazım; içeriğin doğruluğu değil, şık durması mühim.';
    }
    return 'İçerik dağınık ve belirsiz; sunumun derli toplu görünmesi yine tek bir kişinin sırtına yüklendi.';
  }

  // 9. Hedef / KPI / Butce / Kapasite
  if (
    hasWord('hedef', 'kpi', 'ciro', 'satis', 'kota', 'butce', 'kapasite', 'headcount') ||
    hasPhrase('buyume hedefi', 'pazar payi', 'ekip sayisi', 'kaynak talebi')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka hedefleri uzaya fırlattılar ama bütçe kuruş oynamadı. Bizden mucize bekliyorlar.';
    }
    if (tone === 'durust-yonetici') {
      return 'Benim prim alabilmem için sizin bu imkansız KPI’ları tutturmanız şart. Lütfen biraz daha fedakarlık yapın.';
    }
    return 'Hedefler yukarı çekildi, kaynaklar aynı kaldı. Matematik yine çalışanlardan yana değil.';
  }

  // 10. Rica / Destek / Sorumluluk / Ownership
  if (
    hasWord('rica', 'lutfen', 'paylas', 'ilet', 'gonder', 'aksiyon', 'ownership') ||
    hasPhrase('geri bildirim', 'geri donus', 'destek rica')
  ) {
    if (tone === 'samimi-kanka') {
      return 'Kanka bu bir rica değil, kibarca paketlenmiş acil görev emri. Kaçışın yok.';
    }
    if (tone === 'durust-yonetici') {
      return 'Bu işi kimse yapmak istemedi, ben de nezaket maskesi takıp sana devrettim.';
    }
    return 'Bu bir rica değil; yapılacaklar listene nazikçe bırakılmış yeni ve külfetli bir iş.';
  }

  // 11. Tebrik / Harika Is / Takdir
  if (hasWord('tebrik', 'basari', 'takdir') || hasPhrase('harika is', 'guzel is')) {
    if (tone === 'samimi-kanka') {
      return 'Kanka eline sağlık ama çıtayı yükselttin, bundan sonra her işi bu hızda isteyecekler, ayvayı yedin.';
    }
    if (tone === 'durust-yonetici') {
      return 'Çok iyi iş çıkardın, üst yönetime bunu kendi başarım gibi sunup primimi garantiye alacağım.';
    }
    return 'İş harika olmuş. Şimdi aynı kaliteyi, yarısı kadar sürede tekrar bekliyoruz.';
  }

  // Fallback default per tone
  if (tone === 'samimi-kanka') {
    return 'Kanka süslü plaza laflarını geç, Türkçe meali: Ortada net bir plan yok ama iş yine birimizin sırtına kalacak.';
  }
  if (tone === 'durust-yonetici') {
    return 'Yönetici özeti: Konu hakkında net bir fikrim yok ama profesyonel görünmek için böyle afili konuşmak zorundayım.';
  }
  return 'Gerçek iç ses: Bir an önce saat 18:00 olsa da şu anlamsız jargon fırtınasından kurtulsam. Ne dendiği değil, ne kadar yorulacağımız belli.';
}
