import { useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, Clipboard, Clock3, HeartHandshake, MessageSquareText, RotateCcw, Share2, Sparkles } from 'lucide-react';

const examples = [
  'Bir araya gelip hizalanalım',
  'Proaktif aksiyon alalım',
  'Bunu bir sonraki sprintte ele alalım',
  'Takvimlerimize davet düşüyorum',
];

const glossary = [
  { corporate: 'Bir araya gelip hizalanalım', human: 'Herkes aynı şeyi farklı anladı. Bir toplantı daha yapalım.' },
  { corporate: 'Proaktif aksiyon alalım', human: 'Sorun büyümeden bir şey yapalım, ne olduğu sonra belli olur.' },
  { corporate: 'Bunu bir sonraki sprintte ele alalım', human: 'Şu an uğraşmak istemiyorum. İki hafta sonra yine konuşuruz.' },
  { corporate: 'Takvimlerimize davet düşüyorum', human: 'Bu konuyu maille çözemeyiz diye hepinizin vaktini alacağım.' },
];

const audience = [
  'Toplantıdan Toplantıya Koşanlar',
  'Pasif-Agresif Mail Mağdurları',
  'Plaza Dilinden Bıkanlar',
];

const benefitItems = [
  { icon: <Clock3 size={16} strokeWidth={1.7} />, title: 'Zaman kazandırır', copy: 'Üç paragraf kurumsal mailin özünü tek cümlede yakala.' },
  { icon: <HeartHandshake size={16} strokeWidth={1.7} />, title: 'Kurumsal stresi azaltır', copy: 'Jargonu görünce gelen göz seğirmesine küçük bir mola.' },
  { icon: <MessageSquareText size={16} strokeWidth={1.7} />, title: 'Daha net iletişim', copy: 'İstenen şeyi dolambaçsız, anlaşılır hâle getir.' },
  { icon: <Sparkles size={16} strokeWidth={1.7} />, title: 'Daha samimi ofis dili', copy: 'İnsan gibi konuşmak için yönetim kurulu kararı gerekmez.' },
];

const faqs = [
  { question: 'Şirket maillerim kaydediliyor mu?', answer: 'Hayır. Yazdığınız metin yalnızca bu sayfada, tarayıcınızda işlenir; hiçbir yere gönderilmez veya kaydedilmez.' },
  { question: 'Ücretsiz mi?', answer: 'Evet. Kurumdan İnsana ücretsiz bir mini araçtır; kullanmak için hesap açmanız gerekmez.' },
  { question: 'Hangi tonlarda çeviri yapıyor?', answer: 'Sözlükteki örneklere yakın, dürüst ve hafif iğneleyici bir iç ses kullanır. Kimseyi hedef almaz; jargonun kendisiyle dalga geçer.' },
  { question: 'Kendi kurumsal cümlemi ekleyebilir miyim?', answer: 'Elbette. Metin alanına istediğiniz cümleyi yazın. Özel bir eşleşme bulunmazsa araç, metnin bağlamına göre esprili bir insan tercümesi üretir.' },
];

function translateText(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const normalized = text.toLocaleLowerCase('tr-TR').replace(/[.,!?;:]+$/g, '');
  const matches: Array<[string, string]> = [
    ['bir araya gelip hizalanalım', 'Herkes aynı şeyi farklı anladı. Bir toplantı daha yapalım.'],
    ['proaktif aksiyon alalım', 'Sorun büyümeden bir şey yapalım; ne olduğu sonra belli olur.'],
    ['aksiyon alalım', 'Bir şey yapalım da ne yapacağımıza toplantıda karar verelim.'],
    ['aksiyon planı', 'Yapılacaklar listesi. Bu kez belki gerçekten yaparız.'],
    ['değerlendirelim', 'Şimdilik hayır diyemiyorum, o yüzden bekletiyorum.'],
    ['geri dönüş sağlayacağım', 'Cevap vermeyi unutmazsam sana yazarım.'],
    ['geri dönüş', 'Cevap. Muhtemelen biraz gecikmeli gelecek.'],
    ['takvimlerimize davet düşüyorum', 'Bu konuyu maille çözemeyiz diye hepinizin vaktini alacağım.'],
    ['takvimime davet', 'Vaktini alacak bir toplantı ayarlıyorum.'],
    ['bir sonraki sprintte', 'Şu an uğraşmak istemiyorum. İki hafta sonra yine konuşuruz.'],
    ['sprint', 'İşleri aceleyle yetiştirdiğimiz o iki haftalık dönem.'],
    ['sinerji', 'Birlikte çalışmak. Ama bunu daha pahalı söyleyelim.'],
    ['verimliliği artırmak', 'Daha az zamanda daha çok iş çıkarmak; tabii kaynak eklemeden.'],
    ['konuyu park edelim', 'Şu an cevap veremiyorum. Bir süre yok sayalım.'],
    ['uçtan uca', 'Başından sonuna kadar. Arada sorumluluğu da bize kalıyor.'],
    ['stakeholder', 'Bu işten haberi olan ya da olması gereken kişi.'],
    ['önceliklendirelim', 'Hepsi acil ama hangisine önce yetişeceğimizi seçelim.'],
    ['alignment', 'Herkesin aynı fikirdeymiş gibi başını sallaması.'],
    ['toplantı', 'Bir mail olabilecek şey için herkesin takvimini kapatmak.'],
    ['deadline', 'İşin bitmesi gereken ve kimsenin değiştiremeyeceği gün.'],
    ['feedback', 'Birinin yaptığı işe dair söyleyeceklerim var.'],
    ['ownership', 'Sorumluluk. Başarılı olursa hepimizin, olmazsa senin.'],
    ['optimize', 'Daha iyi hâle getirelim; nasıl olacağı toplantıda çıkar.'],
  ];
  const found = matches.find(([phrase]) => normalized.includes(phrase));
  if (found) return found[1];

  const lower = normalized;
  if (/(acil|hemen|ivedi|bugün)/.test(lower)) {
    return `Bunu hemen istiyorum; planlamayı da senin sihirli şekilde çözmeni bekliyorum. (${text})`;
  }
  if (/(toplant|görüş|bir araya|davet)/.test(lower)) {
    return `Bunu yazışarak çözemeyeceğimize karar verdik. Takviminden biraz zaman alıyorum. (${text})`;
  }
  if (/(rapor|sunum|çıktı|teslim|hazır)/.test(lower)) {
    return `Bunun bitmesini istiyoruz; ayrıntıları sen toparla, sonra birlikte üzerinden geçeriz. (${text})`;
  }
  if (/(bekle|sonra|ileri|ertele|gelecek)/.test(lower)) {
    return `Şu an önceliğimiz değil ama tamamen de unutmayalım. (${text})`;
  }
  if (/(rica|lütfen|paylaş|ilet|gönder)/.test(lower)) {
    return `Bunu senden istiyorum; nazik yazınca iş yükü biraz daha hafif görünür. (${text})`;
  }
  return `Bunu daha kısa söyleyince: “${text}” — yani bunu bir şekilde halletmemiz gerekiyor.`;
}

function App() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const sampleIndex = useRef(0);

  const translate = (text = input) => {
    const clean = text.trim();
    if (!clean) {
      setResult('');
      setStatus('Önce çevrilecek bir cümle yazın.');
      textAreaRef.current?.focus();
      return;
    }
    setResult(translateText(clean));
    setStatus('');
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    translate();
  };

  const chooseExample = (text: string) => {
    setInput(text);
    translate(text);
  };

  const newSentence = () => {
    const next = examples[sampleIndex.current % examples.length];
    sampleIndex.current += 1;
    setInput(next);
    translate(next);
    setStatus('');
    textAreaRef.current?.focus();
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setStatus('Tercüme panoya kopyalandı.');
    } catch {
      setStatus('Kopyalama desteklenmiyor. Metni seçip elle kopyalayabilirsiniz.');
    }
  };

  const shareOnX = () => {
    const shareText = `Kurumdan İnsana: “${result}”`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="site-shell">
      <section className="hero" id="cevir">
        <div className="wrap">
          <header className="topbar">
            <a className="brand" href="#cevir" aria-label="Kurumdan İnsana ana sayfa" data-testid="link-home">
              <span className="brand-mark" aria-hidden="true">K</span>
              <span>KURUMDAN İNSANA</span>
            </a>
            <nav className="top-nav" aria-label="Ana gezinme">
              <a href="#nasil-calisir" data-testid="link-about">Nasıl çalışır?</a>
              <a href="#sozluk" data-testid="link-glossary">Mini sözlük</a>
              <a className="top-link" href="#cevir" data-testid="link-translate">Cümlemi çevir <ArrowRight size={13} /></a>
            </nav>
          </header>
          <div className="hero-inner">
            <div className="eyebrow mono">Ofis jargonuna insan müdahalesi</div>
            <h1 data-testid="text-hero-title">Kurumdan<br /><span>İnsana.</span></h1>
            <p className="hero-copy">Toplantıdan sağ çıkmış cümleleri, insanların gerçekten söylediği hâle getir. Kısa, dürüst, biraz da iç sesli.</p>
            <div className="translator" aria-label="Kurumsal jargon çevirmeni">
              <div className="translator-head mono">
                <span>CÜMLEYİ BURAYA BIRAK</span>
                <span className="live-indicator"><i className="live-dot" aria-hidden="true" /> tamamen yerel işlem</span>
              </div>
              <form className="translate-form" onSubmit={onSubmit}>
                <label className="sr-only" htmlFor="corporate-text">Çevrilecek kurumsal cümle</label>
                <textarea
                  ref={textAreaRef}
                  id="corporate-text"
                  data-testid="input-corporate-text"
                  value={input}
                  onChange={(event) => { setInput(event.target.value); setStatus(''); }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault();
                      translate();
                    }
                  }}
                  placeholder="Örn. Proaktif aksiyon alıp konuyu bir sonraki sprintte ele alalım."
                  maxLength={1000}
                />
                <button className="submit-btn" data-testid="button-translate" type="submit">
                  Çevir / Çileden Çık ➔
                  <span>CTRL + ENTER</span>
                </button>
              </form>
              <div className="translator-foot">
                <span>Hiçbir yere gönderilmez. Söz.</span>
                <span className="char-count" data-testid="text-character-count">{input.length} / 1000</span>
              </div>
              <div className="examples" aria-label="Denemek için örnek cümleler">
                <span className="examples-label mono">ÖRNEKLER</span>
                {examples.slice(0, 3).map((example, index) => (
                  <button className="example-chip" type="button" key={example} onClick={() => chooseExample(example)} data-testid={`button-example-${index + 1}`}>
                    {example}
                  </button>
                ))}
              </div>
              {result && (
                <div className="result-card" aria-live="polite" data-testid="card-translation-result">
                  <div className="result-top">
                    <span className="result-label mono">İNSAN TERCÜMESİ</span>
                    <span className="result-tone mono">dürüstlük seviyesi: makul</span>
                  </div>
                  <p className="result-text" data-testid="text-translation-result">{result}</p>
                  <div className="result-actions">
                    <button className="quiet-btn" type="button" onClick={copyResult} data-testid="button-copy-result"><Clipboard size={13} /> Metni Kopyala</button>
                    <button className="quiet-btn" type="button" onClick={shareOnX} data-testid="button-share-x"><Share2 size={13} /> X’te Paylaş</button>
                    <button className="quiet-btn" type="button" onClick={newSentence} data-testid="button-new-sentence"><RotateCcw size={13} /> Yeni cümle</button>
                  </div>
                </div>
              )}
              <div className="status-line" aria-live="polite" role="status" data-testid="status-translator">{status}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="nasil-calisir">
        <div className="wrap">
          <div className="section-kicker mono"><b>01 /</b> NEDEN BÖYLE BİR ŞEY VAR?</div>
          <div className="section-heading">
            <h2>Çünkü bazen “<em>hizalanalım</em>” demek, sadece konuşmamız gerekiyor demek.</h2>
            <p>Plaza dili işin kendisinden daha uzun sürüyorsa, tercümanlık bizden. Jargonu alır, içimizden geçen cümleye yaklaştırırız.</p>
          </div>
          <div className="about-panel" data-testid="panel-about">
            <div className="about-stamp" aria-hidden="true"><div className="stamp-orbit" /><div className="stamp-type">İNSAN<small>İŞ YERİ DİLİ / SÖZLÜK NO. 01</small></div></div>
            <div className="about-copy">
              <p>Bu küçük araç, kurumsal cümlelerin arkasındaki asıl niyeti görünür kılmak için var. Biraz mizah, biraz iç ses; kimseyi değil, gereksiz jargonu hedef alıyor.</p>
              <p>Metniniz tarayıcınızdan dışarı çıkmaz. Tercüme burada, anında ve sadece sizin için yapılır.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="audience-title">
        <div className="wrap">
          <div className="section-kicker mono"><b>02 /</b> TANIDIK GELDİ Mİ?</div>
          <div className="section-heading">
            <h2 id="audience-title">Bu cümleler <em>bir yerden</em> tanıdık.</h2>
            <p>İş yerinde “tam olarak ne demek istiyor?” diye düşündüğün olduysa, doğru masadasın.</p>
          </div>
          <div className="audience-grid">
            {audience.map((title, index) => (
              <article className="audience-card" key={title} data-testid={`card-audience-${index + 1}`}>
                <span className="card-number">0{index + 1} / PLAZA GERÇEĞİ</span>
                <h3>{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="sozluk">
        <div className="wrap">
          <div className="section-kicker mono"><b>03 /</b> CEP SÖZLÜĞÜ</div>
          <div className="section-heading">
            <h2>Kurumsal cümle.<br /><em>İnsanca karşılığı.</em></h2>
            <p>Serbest çeviri. Akademik geçerliliği yok, toplantı sonrası geçerliliği yüksek.</p>
          </div>
          <div className="glossary-list" data-testid="list-glossary">
            {glossary.map((entry, index) => (
              <div className="glossary-row" key={entry.corporate} data-testid={`row-glossary-${index + 1}`}>
                <p className="glossary-corp">{entry.corporate}</p>
                <span className="glossary-arrow" aria-hidden="true">→</span>
                <p className="glossary-human">{entry.human}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-kicker mono"><b>04 /</b> KÜÇÜK BİR NEFES</div>
          <div className="section-heading">
            <h2>İş aynı iş.<br /><em>En azından cümleler net.</em></h2>
            <p>İş yerini bir anda değiştiremeyiz. Ama ne dendiğini daha hızlı anlayabiliriz.</p>
          </div>
          <div className="benefit-grid" data-testid="list-benefits">
            {benefitItems.map((benefit, index) => (
              <article className="benefit" key={benefit.title} data-testid={`card-benefit-${index + 1}`}>
                <div className="benefit-icon" aria-hidden="true">{benefit.icon}</div>
                <h3>{benefit.title}</h3>
                <p>{benefit.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="sss">
        <div className="wrap">
          <div className="section-kicker mono"><b>05 /</b> SIK SORULANLAR</div>
          <div className="section-heading">
            <h2>İçin rahat <em>olsun.</em></h2>
            <p>Gizlilik ve kullanım hakkında kısa, net cevaplar. Kurumsal dolambaç yok.</p>
          </div>
          <div className="faq-list" data-testid="list-faq">
            {faqs.map((faq, index) => (
              <details className="faq-item" key={faq.question} data-testid={`faq-item-${index + 1}`}>
                <summary data-testid={`faq-question-${index + 1}`}>{faq.question}</summary>
                <div className="faq-answer" data-testid={`faq-answer-${index + 1}`}>{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-main">
            <a className="brand" href="#cevir" data-testid="link-footer-home">
              <span className="brand-mark" aria-hidden="true">K</span>
              <span>KURUMDAN İNSANA</span>
            </a>
            <p className="footer-note">Kurumsal jargonun arasına sıkışmış gerçek cümlelere küçük bir tercüman. İnsan insana, arada toplantısız.</p>
            <a className="quiet-btn" href="#cevir" data-testid="link-footer-translate">Bir cümle çevir <ArrowDown size={13} /></a>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Kurumdan İnsana</span>
            <span>Bu sayfa metninizi saklamaz. Cidden.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;
