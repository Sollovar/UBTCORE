import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type LanguageCode = 'en' | 'zh' | 'es' | 'ru' | 'pt' | 'ar' | 'tr' | 'ko';

export const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ko', label: '한국어' },
];

const STORAGE_KEY = 'unbound_language';
const DEFAULT_LANGUAGE: LanguageCode = 'en';

const translations: Record<string, Record<LanguageCode, string>> = {
  'header.nav.trade': {
    en: 'Trade', zh: '交易', es: 'Comerciar', ru: 'Торговля', pt: 'Negociar', ar: 'تداول', tr: 'Ticaret', ko: '거래',
  },
  'header.nav.pairs': {
    en: 'Pairs', zh: '交易对', es: 'Pares', ru: 'Пары', pt: 'Pares', ar: 'الأزواج', tr: 'Paralar', ko: '페어',
  },
  'header.nav.watchlist': {
    en: 'Watchlist', zh: '自选', es: 'Favoritos', ru: 'Список', pt: 'Favoritos', ar: 'المراقبة', tr: 'İzleme Listesi', ko: '관심 목록',
  },
  'header.nav.home': {
    en: 'Home', zh: '首页', es: 'Inicio', ru: 'Домой', pt: 'Início', ar: 'الرئيسية', tr: 'Ana Sayfa', ko: '홈',
  },
  'header.nav.docs': {
    en: 'Docs', zh: '文档', es: 'Docs', ru: 'Документация', pt: 'Docs', ar: 'الوثائق', tr: 'Dokümanlar', ko: '문서',
  },
  'header.menu': {
    en: 'Menu', zh: '菜单', es: 'Menú', ru: 'Меню', pt: 'Menu', ar: 'القائمة', tr: 'Menü', ko: '메뉴',
  },
  'header.language': {
    en: 'Language', zh: '语言', es: 'Idioma', ru: 'Язык', pt: 'Idioma', ar: 'اللغة', tr: 'Dil', ko: '언어',
  },
  'header.aria.backHome': {
    en: 'Back home', zh: '返回首页', es: 'Volver al inicio', ru: 'Назад на главную', pt: 'Voltar para casa', ar: 'العودة للرئيسية', tr: 'Ana sayfaya dön', ko: '홈으로 돌아가기',
  },
  'header.aria.toggleTheme': {
    en: 'Toggle theme', zh: '切换主题', es: 'Cambiar tema', ru: 'Переключить тему', pt: 'Alternar tema', ar: 'تبديل السمة', tr: 'Temayı değiştir', ko: '테마 전환',
  },
  'header.aria.menu': {
    en: 'Menu', zh: '菜单', es: 'Menú', ru: 'Меню', pt: 'Menu', ar: 'القائمة', tr: 'Menü', ko: '메뉴',
  },
  'header.nav.orders': {
    en: 'Orders', zh: '订单', es: 'Órdenes', ru: 'Заказы', pt: 'Órdenes', ar: 'الطلبات', tr: 'Emirler', ko: '주문',
  },
  'orders.title': {
    en: 'My Orders', zh: '我的订单', es: 'Mis órdenes', ru: 'Мои заказы', pt: 'Minhas ordens', ar: 'طلباتي', tr: 'Emirlerim', ko: '내 주문',
  },
  'orders.connectWallet': {
    en: 'Connect Your Wallet', zh: '连接您的钱包', es: 'Conecta tu billetera', ru: 'Подключите ваш кошелек', pt: 'Conecte sua carteira', ar: 'قم بتوصيل محفظتك', tr: 'Cüzdanınızı bağlayın', ko: '지갑 연결',
  },
  'orders.connectWalletDescription': {
    en: 'Please connect your wallet to view your open and historical orders.', zh: '请连接您的钱包以查看未完成和历史订单。', es: 'Por favor conecta tu billetera para ver tus órdenes abiertas e históricas.', ru: 'Пожалуйста, подключите кошелек, чтобы просмотреть открытые и исторические заказы.', pt: 'Por favor, conecte sua carteira para ver suas ordens abertas e históricas.', ar: 'يرجى توصيل محفظتك لعرض أوامرك المفتوحة والتاريخية.', tr: 'Açık ve geçmiş emirlerinizi görmek için lütfen cüzdanınızı bağlayın.', ko: '열린 주문 및 기록 주문을 보려면 지갑을 연결하세요.',
  },
  'orders.loading': {
    en: 'Loading orders...', zh: '正在加载订单...', es: 'Cargando órdenes...', ru: 'Загрузка заказов...', pt: 'Carregando ordens...', ar: 'جارٍ تحميل الطلبات...', tr: 'Emirler yükleniyor...', ko: '주문 로딩 중...',
  },
  'orders.tab.open': {
    en: 'Open Orders', zh: '未成交订单', es: 'Órdenes abiertas', ru: 'Открытые заказы', pt: 'Ordens abertas', ar: 'الأوامر المفتوحة', tr: 'Açık Emirler', ko: '미체결 주문',
  },
  'orders.tab.history': {
    en: 'History', zh: '历史', es: 'Historial', ru: 'История', pt: 'Histórico', ar: 'التاريخ', tr: 'Geçmiş', ko: '히스토리',
  },
  'orders.emptyTitle.open': {
    en: 'No Open Orders', zh: '没有未成交订单', es: 'No hay órdenes abiertas', ru: 'Нет открытых заказов', pt: 'Sem ordens abertas', ar: 'لا توجد أوامر مفتوحة', tr: 'Açık Emir Yok', ko: '미체결 주문 없음',
  },
  'orders.emptyTitle.history': {
    en: 'No Historical Orders', zh: '没有历史订单', es: 'No hay órdenes históricas', ru: 'Нет исторических заказов', pt: 'Sem ordens históricas', ar: 'لا توجد أوامر تاريخية', tr: 'Geçmiş Emir Yok', ko: '기록된 주문 없음',
  },
  'orders.emptyDescription.open': {
    en: 'Your open orders will appear here', zh: '您的未成交订单将显示在此处', es: 'Tus órdenes abiertas aparecerán aquí', ru: 'Ваши открытые заказы появятся здесь', pt: 'Suas ordens abertas aparecerão aqui', ar: 'ستظهر أوامرك المفتوحة هنا', tr: 'Açık emirleriniz burada görünecek', ko: '미체결 주문이 여기에 표시됩니다.',
  },
  'orders.emptyDescription.history': {
    en: 'Your historical orders will appear here', zh: '您的历史订单将显示在此处', es: 'Tus órdenes históricas aparecerán aquí', ru: 'Ваши исторические заказы появятся здесь', pt: 'Suas ordens históricas aparecerão aqui', ar: 'ستظهر أوامرك التاريخية هنا', tr: 'Geçmiş emirleriniz burada görünecek', ko: '기록된 주문이 여기에 표시됩니다.',
  },
  'orders.cancel': {
    en: 'Cancel Order', zh: '取消订单', es: 'Cancelar orden', ru: 'Отменить заказ', pt: 'Cancelar ordem', ar: 'إلغاء الطلب', tr: 'Emri iptal et', ko: '주문 취소',
  },
  'orders.canceling': {
    en: 'Cancelling...', zh: '正在取消...', es: 'Cancelando...', ru: 'Отмена...', pt: 'Cancelando...', ar: 'جارٍ الإلغاء...', tr: 'İptal ediliyor...', ko: '취소 중...',
  },
  'orders.side.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Al', ko: '매수',
  },
  'orders.side.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '매도',
  },
  'orders.type.limit': {
    en: 'Limit', zh: '限价', es: 'Límite', ru: 'Лимит', pt: 'Limit', ar: 'حد', tr: 'Limit', ko: '지정가',
  },
  'orders.type.market': {
    en: 'Market', zh: '市价', es: 'Mercado', ru: 'Маркет', pt: 'Mercado', ar: 'سوق', tr: 'Piyasa', ko: '시장가',
  },
  'orders.type.postOnly': {
    en: 'Post Only', zh: '仅挂单', es: 'Solo publicar', ru: 'Только выставление', pt: 'Somente postar', ar: 'نشر فقط', tr: 'Yalnızca Limit', ko: '포스트 온리',
  },
  'orders.type.takeProfit': {
    en: 'Take Profit', zh: '止盈', es: 'Take Profit', ru: 'Тейк-профит', pt: 'Take Profit', ar: 'جني الأرباح', tr: 'Kar Al', ko: '이익 실현',
  },
  'orders.type.stopLoss': {
    en: 'Stop Loss', zh: '止损', es: 'Stop Loss', ru: 'Стоп-лосс', pt: 'Stop Loss', ar: 'وقف الخسارة', tr: 'Zarar Durdur', ko: '손절매',
  },
  'orders.type.ladder': {
    en: 'Ladder', zh: '阶梯', es: 'Escalera', ru: 'Лестница', pt: 'Escada', ar: 'سلم', tr: 'Basamak', ko: '사다리',
  },
  'orders.detail.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'orders.detail.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Всего', pt: 'Total', ar: 'الإجمالي', tr: 'Toplam', ko: '총액',
  },
  'orders.detail.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'orders.detail.receive': {
    en: 'Receive', zh: '接收', es: 'Recibir', ru: 'Получить', pt: 'Receber', ar: 'استلام', tr: 'Al', ko: '수령',
  },
  'orders.detail.expires': {
    en: 'Expires', zh: '过期', es: 'Expira', ru: 'Истекает', pt: 'Expira', ar: 'ينتهي', tr: 'Sona erer', ko: '만료',
  },
  'orders.detail.never': {
    en: 'Never', zh: '永不', es: 'Nunca', ru: 'Никогда', pt: 'Nunca', ar: 'أبدًا', tr: 'Asla', ko: '없음',
  },
  'orders.detail.trigger': {
    en: 'Trigger', zh: '触发', es: 'Activar', ru: 'Триггер', pt: 'Gatilho', ar: 'تنشيط', tr: 'Tetik', ko: '트리거',
  },
  'orders.detail.ladder': {
    en: 'Ladder', zh: '阶梯', es: 'Escalera', ru: 'Лестница', pt: 'Escada', ar: 'سلم', tr: 'Basamak', ko: '사다리',
  },
  'orders.detail.ladderChild': {
    en: 'Child order in ladder', zh: '阶梯中的子订单', es: 'Orden secundaria en escalera', ru: 'Дочерний ордер в лестнице', pt: 'Ordem filha na escada', ar: 'طلب فرعي في السلم', tr: 'Basamaktaki alt emir', ko: '사다리 내 자식 주문',
  },
  'hero.badge': {
    en: 'Now Live — Trade DeFi pairs before CEX listing', zh: '现已上线 — 在中心化交易所上市前交易 DeFi 交易对', es: 'Ya en vivo — opera pares DeFi antes de su listado en CEX', ru: 'Уже в эфире — торгуйте DeFi-парами до листинга на CEX', pt: 'Agora ao vivo — negocie pares DeFi antes da listagem em CEX', ar: 'متاح الآن — تداول أزواج DeFi قبل إدراجها في CEX', tr: 'Şimdi Canlı — CEX listelenmeden önce DeFi çiftleriyle işlemler yap', ko: '지금 라이브 — CEX 상장 전에 DeFi 페어 거래',
  },
  'hero.title': {
    en: 'Trade Trending Tokens Early.', zh: '热门代币，抢先交易。', es: 'Opera tokens de tendencia temprano.', ru: 'Торгуйте популярными токенами раньше всех.', pt: 'Negocie tokens em alta cedo.', ar: 'تداول الرموز الرائجة مبكراً.', tr: 'Trend Tokenleri Erken Al-Sat.', ko: '트렌딩 토큰을 미리 거래하세요.',
  },
  'hero.subtitle': {
    en: 'Unbound indexes trending pairs from DEX aggregators — giving you early access with a decentralized orderbook before tokens go mainstream.',
    zh: 'Unbound 从 DEX 聚合器索引热门交易对，在代币进入主流之前为你提供去中心化订单簿的早期接入。',
    es: 'Unbound indexa pares tendencia de agregadores DEX, dándote acceso temprano con un libro de órdenes descentralizado antes de que los tokens lleguen al mainstream.',
    ru: 'Unbound индексирует трендовые пары с агрегаторов DEX, давая вам ранний доступ через децентрализованный ордербук до выхода токенов в мейнстрим.',
    pt: 'Unbound indexa pares em tendência de agregadores DEX, dando acesso antecipado com um livro de ordens descentralizado antes dos tokens irem ao mainstream.',
    ar: 'Unbound يفهرس الأزواج الرائجة من مجمعات DEX — ويمنحك وصولاً مبكراً عبر دفتر أوامر لامركزي قبل أن تصبح الرموز شائعة.',
    tr: 'Unbound, DEX toplayıcılarından trend çiftleri indexler — tokenler ana akıma girmeden önce merkeziyetsiz bir emir defteriyle erken erişim sağlar.',
    ko: 'Unbound는 DEX 애그리게이터에서 트렌딩 페어를 인덱싱합니다 — 토큰이 주류가 되기 전에 탈중앙화 주문서로 조기 접근을 제공합니다.',
  },
  'hero.cta.startTrading': {
    en: 'Start Trading', zh: '开始交易', es: 'Comenzar a comerciar', ru: 'Начать торговлю', pt: 'Começar a negociar', ar: 'ابدأ التداول', tr: 'Ticarete Başla', ko: '거래 시작',
  },
  'hero.cta.viewPairs': {
    en: 'View Pairs', zh: '查看交易对', es: 'Ver pares', ru: 'Просмотреть пары', pt: 'Ver pares', ar: 'عرض الأزواج', tr: 'Çiftleri Gör', ko: '페어 보기',
  },
  'hero.trending.loading': {
    en: 'Loading trending pairs...', zh: '正在加载热门交易对...', es: 'Cargando pares en tendencia...', ru: 'Загрузка трендовых пар...', pt: 'Carregando pares em tendência...', ar: 'جاري تحميل الأزواج الرائجة...', tr: 'Trend çiftleri yükleniyor...', ko: '트렌딩 페어 로딩 중...',
  },
  'hero.trending.error': {
    en: 'Unable to load live pairs. Please try again later.', zh: '无法加载实时交易对，请稍后再试。', es: 'No se pueden cargar pares en vivo. Intente de nuevo más tarde.', ru: 'Не удалось загрузить живые пары. Пожалуйста, попробуйте позже.', pt: 'Não foi possível carregar pares ao vivo. Tente novamente mais tarde.', ar: 'تعذر تحميل الأزواج المباشرة. الرجاء المحاولة مرة أخرى لاحقاً.', tr: 'Canlı çiftler yüklenemedi. Lütfen daha sonra tekrar deneyin.', ko: '라이브 페어를 로드할 수 없습니다. 나중에 다시 시도하세요.',
  },
  'hero.trending.empty': {
    en: 'No trending pairs available yet.', zh: '尚无热门交易对可用。', es: 'Aún no hay pares en tendencia disponibles.', ru: 'Пока нет доступных трендовых пар.', pt: 'Ainda não há pares em tendência disponíveis.', ar: 'لا توجد أزواج رائجة متاحة بعد.', tr: 'Henüz trend çiftleri yok.', ko: '아직 트렌딩 페어가 없습니다.',
  },
  'hero.trust.totalVolume': {
    en: 'Total Volume', zh: '总交易量', es: 'Volumen total', ru: 'Общий объем', pt: 'Volume total', ar: 'إجمالي الحجم', tr: 'Toplam Hacim', ko: '총 거래량',
  },
  'hero.trust.trendingPairs': {
    en: 'Trending Pairs', zh: '热门交易对', es: 'Pares en tendencia', ru: 'Трендовые пары', pt: 'Pares em tendência', ar: 'الأزواج الرائجة', tr: 'Trend Çiftleri', ko: '트렌딩 페어',
  },
  'hero.trust.tradesExecuted': {
    en: 'Trades Executed', zh: '执行交易', es: 'Operaciones ejecutadas', ru: 'Исполненных сделок', pt: 'Negócios executados', ar: 'الصفقات المنفذة', tr: 'Gerçekleşen İşlemler', ko: '체결된 거래',
  },
  'hero.trust.execSpeed': {
    en: 'Execution Speed', zh: '执行速度', es: 'Velocidad de ejecución', ru: 'Скорость исполнения', pt: 'Velocidade de execução', ar: 'سرعة التنفيذ', tr: 'İcra Hızı', ko: '실행 속도',
  },
  'features.sectionTitle': {
    en: 'Built for early movers in DeFi', zh: 'DeFi에서 선구자를 위한 설계', es: 'Creado para movimientos tempranos en DeFi', ru: 'Создано для ранних игроков в DeFi', pt: 'Construído para os primeiros movimentos em DeFi', ar: 'مصمم للمتحركين الأوائل في DeFi', tr: 'DeFi’de erken hareket edenler için hazırlandı', ko: 'DeFi의 얼리무버를 위해 설계되었습니다.',
  },
  'features.sectionBadge': {
    en: 'Why Unbound?', zh: '为什么选择 Unbound？', es: '¿Por qué Unbound?', ru: 'Почему Unbound?', pt: 'Por que Unbound?', ar: 'لماذا Unbound؟', tr: 'Neden Unbound?', ko: '왜 언바운드인가요?',
  },
  'features.sectionDescription': {
    en: 'Everything you need to discover, analyse, and trade trending tokens before they hit mainstream exchanges.',
    zh: '您需要的一切工具，让您在热门代币进入主流交易所之前发现、分析并交易它们。',
    es: 'Todo lo que necesitas para descubrir, analizar y comerciar tokens en tendencia antes de que lleguen a los exchanges principales.',
    ru: 'Всё, что нужно для поиска, анализа и торговли трендовыми токенами до их выхода на основные биржи.',
    pt: 'Tudo o que você precisa para descobrir, analisar e negociar tokens em tendência antes de chegarem às exchanges principais.',
    ar: 'كل ما تحتاجه لاكتشاف وتحليل وتداول الرموز الرائجة قبل أن تصل إلى البورصات الرئيسية.',
    tr: 'Trend tokenleri ana borsalara ulaşmadan önce keşfetmek, analiz etmek ve ticaretini yapmak için ihtiyacınız olan her şey.',
    ko: '트렌딩 토큰이 주요 거래소에 등장하기 전에 발견하고 분석하고 거래하는 데 필요한 모든 것.',
  },
  'feature.tag.core': {
    en: 'Core Feature', zh: '核心功能', es: 'Función central', ru: 'Основная функция', pt: 'Funcionalidade central', ar: 'الميزة الأساسية', tr: 'Temel Özellik', ko: '핵심 기능',
  },
  'feature.tag.onchain': {
    en: 'On-Chain', zh: '链上', es: 'On-Chain', ru: 'On-Chain', pt: 'On-Chain', ar: 'على السلسلة', tr: 'Zincir Üstü', ko: '온체인',
  },
  'feature.tag.freeForever': {
    en: 'Free Forever', zh: '永久免费', es: 'Gratis para siempre', ru: 'Бесплатно навсегда', pt: 'Grátis para sempre', ar: 'مجاني إلى الأبد', tr: 'Her Zaman Ücretsiz', ko: '영구 무료',
  },
  'feature.tag.dexes': {
    en: '10+ DEXes', zh: '10+ DEX', es: '10+ DEX', ru: '10+ DEX', pt: '10+ DEX', ar: '10+ DEX', tr: '10+ DEX', ko: '10개 이상 DEX',
  },
  'feature.tag.fast': {
    en: '<1s', zh: '<1秒', es: '<1s', ru: '<1с', pt: '<1s', ar: '<1ث', tr: '<1sn', ko: '<1초',
  },
  'feature.tag.audited': {
    en: 'Audited', zh: '已审计', es: 'Auditado', ru: 'Аудитировано', pt: 'Auditoria', ar: 'مدقق', tr: 'Denetlendi', ko: '감사 완료',
  },
  'feature.earlyAccess.title': {
    en: 'Early Access to Trending Pairs', zh: '热门交易对抢先访问', es: 'Acceso temprano a pares en tendencia', ru: 'Ранний доступ к трендовым парам', pt: 'Acesso antecipado a pares em tendência', ar: 'وصول مبكر إلى الأزواج الرائجة', tr: 'Trend Çiftlerine Erken Erişim', ko: '트렌딩 페어 조기 접근',
  },
  'feature.earlyAccess.description': {
    en: 'Discover tokens hours before they list on Binance, Coinbase, or Kraken. Our trend engine scores pairs by volume velocity, social signals, and on-chain activity — so you\'re always first.',
    zh: '在 Binance、Coinbase 或 Kraken 上市前几小时发现代币。我们的趋势引擎根据成交量速度、社交信号和链上活动对交易对打分，让你始终领先。',
    es: 'Descubre tokens horas antes de que se coticen en Binance, Coinbase o Kraken. Nuestro motor de tendencias puntúa pares por velocidad de volumen, señales sociales y actividad on-chain para que siempre llegues primero.',
    ru: 'Открывайте токены за несколько часов до листинга на Binance, Coinbase или Kraken. Наш движок оценивает пары по скорости объема, социальным сигналам и on-chain активности, чтобы вы всегда были первыми.',
    pt: 'Descubra tokens horas antes de serem listados na Binance, Coinbase ou Kraken. Nosso motor de tendências pontua pares por velocidade de volume, sinais sociais e atividade on-chain — para você estar sempre à frente.',
    ar: 'اكتشف الرموز قبل ساعات من إدراجها على Binance أو Coinbase أو Kraken. يقوم محرك الاتجاه لدينا بتقييم الأزواج حسب سرعة الحجم والإشارات الاجتماعية والنشاط على السلسلة — لذا ستكون دائماً الأول.',
    tr: 'Binance, Coinbase veya Kraken’de listelenmeden saatler önce tokenleri keşfedin. Trend motorumuz, hacim hızı, sosyal sinyaller ve zincir üstü etkinlik ile çiftleri puanlar — böylece her zaman ilk siz olursunuz.',
    ko: 'Binance, Coinbase 또는 Kraken에 상장되기 몇 시간 전에 토큰을 발견하세요. 우리의 트렌드 엔진은 거래량 속도, 소셜 신호, 온체인 활동으로 페어를 평가하여 항상 먼저 볼 수 있게 합니다.',
  },
  'feature.orderbook.title': {
    en: 'Decentralized Orderbook', zh: '去中心化订单簿', es: 'Libro de órdenes descentralizado', ru: 'Децентрализованный ордербук', pt: 'Livro de ordens descentralizado', ar: 'دفتر أوامر لامركزي', tr: 'Merkeziyetsiz Emir Defteri', ko: '탈중앙화 주문서',
  },
  'feature.orderbook.description': {
    en: 'Place limit orders on-chain with tighter spreads than AMM pools. Our matching engine provides professional-grade trading without counterparty risk.',
    zh: '在链上以比 AMM 池更紧的价差挂限价单。我们的撮合引擎提供专业级交易体验，无对手方风险。',
    es: 'Coloca órdenes limitadas on-chain con spreads más ajustados que los pools AMM. Nuestro motor de emparejamiento ofrece trading de nivel profesional sin riesgo de contraparte.',
    ru: 'Размещайте лимитные ордера на цепочке с более узкими спредами, чем у AMM-пулов. Наш движок сопоставления дает профессиональную торговлю без контрагента.',
    pt: 'Coloque ordens limitadas on-chain com spreads mais apertados que pools AMM. Nosso motor de correspondência oferece trading profissional sem risco de contraparte.',
    ar: 'ضع أوامر محددة على السلسلة بهوامش أضيق من مجمعات AMM. يوفر محرك المطابقة لدينا تداولًا احترافيًا بدون مخاطر الطرف المقابل.',
    tr: 'AMM havuzlarından daha dar spreadlerle zincir üzerinde limit emirler girin. Eşleştirme motorumuz, karşı taraf riskine yer vermeden profesyonel seviyede ticaret sağlar.',
    ko: 'AMM 풀보다 더 좁은 스프레드로 온체인 지정가 주문을 하세요. 우리의 매칭 엔진은 상대방 위험 없이 프로급 거래를 제공합니다.',
  },
  'feature.zeroFees.title': {
    en: 'Zero Listing Fees', zh: '零上市费用', es: 'Cero tarifas de listado', ru: 'Нулевая плата за листинг', pt: 'Taxas de listagem zero', ar: 'رسوم إدراج صفرية', tr: 'Listeleme Ücreti Yok', ko: '상장 수수료 없음',
  },
  'feature.zeroFees.description': {
    en: 'Any trending pair gets listed automatically. No gatekeepers, no pay-to-play, no delays. Pure meritocracy driven by real trading volume.',
    zh: '任何热门交易对都会自动上线。无需门槛、无需付费才能上榜、无需延迟。纯粹由真实交易量驱动的准入机制。',
    es: 'Cualquier par en tendencia se lista automáticamente. Sin guardianes, sin pagos para participar, sin demoras. Pureza meritocrática impulsada por volumen real.',
    ru: 'Любая трендовая пара автоматически листится. Без воротил, без pay-to-play, без задержек. Чистая меритократия на основе реального торгового объема.',
    pt: 'Qualquer par em tendência é listado automaticamente. Sem gatekeepers, sem pay-to-play, sem atrasos. Meritocracia pura movida por volume real.',
    ar: 'أي زوج رائج يُدرج تلقائياً. لا حراس، لا دفع للحصول على فرصة، لا تأخير. مبدأ الجدارة النقي مدفوع بحجم تداول حقيقي.',
    tr: 'Her trend çift otomatik olarak listelenir. Hiç bekçi yok, hiç öde-oyna yok, hiç gecikme yok. Gerçek işlem hacmiyle yönlendirilen saf liyakat sistemi.',
    ko: '트렌디한 페어는 자동으로 상장됩니다. 게이트키퍼 없음, 페이투플레이 없음, 지연 없음. 실제 거래량으로 움직이는 순수 실력주의.',
  },
  'feature.multiDex.title': {
    en: 'Multi-DEX Aggregation', zh: '多DEX聚合', es: 'Agregación multi-DEX', ru: 'Агрегация нескольких DEX', pt: 'Agregação multi-DEX', ar: 'تجميع متعدد لـ DEX', tr: 'Çoklu DEX Toplama', ko: '멀티 DEX 집계',
  },
  'feature.multiDex.description': {
    en: 'Unified liquidity from Uniswap, PancakeSwap, Raydium, Orca, Jupiter and more — all through a single professional interface.',
    zh: '来自 Uniswap、PancakeSwap、Raydium、Orca、Jupiter 等的一体化流动性 — 全部通过单一专业界面。',
    es: 'Liquidez unificada de Uniswap, PancakeSwap, Raydium, Orca, Jupiter y más — todo a través de una única interfaz profesional.',
    ru: 'Единая ликвидность от Uniswap, PancakeSwap, Raydium, Orca, Jupiter и других — через один профессиональный интерфейс.',
    pt: 'Liquidez unificada da Uniswap, PancakeSwap, Raydium, Orca, Jupiter e mais — tudo através de uma única interface profissional.',
    ar: 'سيولة موحدة من Uniswap وPancakeSwap وRaydium وOrca وJupiter والمزيد — جميعها عبر واجهة محترفة واحدة.',
    tr: 'Uniswap, PancakeSwap, Raydium, Orca, Jupiter ve daha fazlasından birleşik likidite — hepsi tek bir profesyonel arayüzde.',
    ko: 'Uniswap, PancakeSwap, Raydium, Orca, Jupiter 등에서 통합된 유동성 — 모두 단일 전문 인터페이스에서.',
  },
  'feature.fast.title': {
    en: 'Sub-Second Execution', zh: '亚秒执行', es: 'Ejecución en menos de un segundo', ru: 'Выполнение за доли секунды', pt: 'Execução em menos de um segundo', ar: 'تنفيذ أقل من ثانية', tr: 'Saniyeden Az Sürede İcra', ko: '1초 미만 실행',
  },
  'feature.fast.description': {
    en: 'Optimized routing and gas estimation ensure your trades execute in under one second with minimal slippage.',
    zh: '优化的路由和 gas 估算可确保您的交易在不到一秒内执行，且滑点最低。',
    es: 'Enrutamiento optimizado y estimación de gas aseguran que tus operaciones se ejecuten en menos de un segundo con deslizamiento mínimo.',
    ru: 'Оптимизированный роутинг и оценка газа гарантируют исполнение сделок менее чем за секунду с минимальным проскальзыванием.',
    pt: 'Roteamento otimizado e estimativa de gás garantem que suas negociações sejam executadas em menos de um segundo com deslizamento mínimo.',
    ar: 'يضمن التوجيه المحسن وتقدير الغاز تنفيذ صفقاتك في أقل من ثانية مع انزلاق ضئيل.',
    tr: 'Optimize yönlendirme ve gaz tahmini, işlemlerinizin bir saniyenin altında minimal kayma ile gerçekleşmesini garanti eder.',
    ko: '최적화된 라우팅과 가스 추정으로 거래가 1초 이내에 최소 슬리피지로 실행되도록 합니다.',
  },
  'feature.secure.title': {
    en: 'Non-Custodial & Secure', zh: '非托管且安全', es: 'No custodiado y seguro', ru: 'Никакого хранения и безопасно', pt: 'Não custodial e seguro', ar: 'غير وصائي وآمن', tr: 'Emanet Tutmaz ve Güvenli', ko: '비수탁 & 안전',
  },
  'feature.secure.description': {
    en: 'Your keys, your coins. We never hold funds. Smart contracts are audited and fully open-source.',
    zh: '你的密钥，你的资金。我们从不保管用户资产。智能合约已审计并完全开源。',
    es: 'Tus claves, tus monedas. Nunca retenemos fondos. Los contratos inteligentes son auditados y completamente de código abierto.',
    ru: 'Ваши ключи, ваши монеты. Мы никогда не храним средства. Смарт-контракты проверены и полностью открыты.',
    pt: 'Suas chaves, suas moedas. Nunca retemos fundos. Contratos inteligentes auditados e totalmente open-source.',
    ar: 'مفاتيحك، عملاتك. نحن لا نحتفظ بالأموال أبداً. العقود الذكية مدققة ومفتوحة المصدر بالكامل.',
    tr: 'Anahtarlarınız, paralarınız. Fon tutmuyoruz. Akıllı sözleşmeler denetlendi ve tamamen açık kaynak.',
    ko: '당신의 키, 당신의 코인. 우리는 자금을 보유하지 않습니다. 스마트 컨트랙트는 감사되었고 완전히 오픈 소스입니다.',
  },
  'pairs.search.placeholder': {
    en: 'Search pairs by name, symbol, id or address...', zh: '按名称、符号、ID 或地址搜索交易对...', es: 'Buscar pares por nombre, símbolo, ID o dirección...', ru: 'Поиск пар по имени, символу, ID или адресу...', pt: 'Pesquisar pares por nome, símbolo, ID ou endereço...', ar: 'ابحث عن الأزواج بالاسم أو الرمز أو المعرف أو العنوان...', tr: 'Çiftleri ada, sembol, kimlik veya adrese göre ara...', ko: '이름, 심볼, ID 또는 주소로 페어 검색...',
  },
  'pairs.tab.all': {
    en: 'All', zh: '全部', es: 'Todo', ru: 'Все', pt: 'Todos', ar: 'الكل', tr: 'Tümü', ko: '전체',
  },
  'pairs.tab.trending': {
    en: 'Trending', zh: '热门', es: 'Tendencia', ru: 'Тренды', pt: 'Tendência', ar: 'الرائجة', tr: 'Trend', ko: '트렌딩',
  },
  'pairs.tab.gainers': {
    en: 'Gainers', zh: '涨幅', es: 'Ganadores', ru: 'Лидеры', pt: 'Ganhadores', ar: 'الرابحة', tr: 'Kazananlar', ko: '상승',
  },
  'pairs.tab.losers': {
    en: 'Losers', zh: '跌幅', es: 'Perdedores', ru: 'Аутсайдеры', pt: 'Perdedores', ar: 'الخاسرة', tr: 'Kaybedenler', ko: '하락',
  },
  'pairs.col.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'pairs.col.change': {
    en: '24h %', zh: '24小时 %', es: '24h %', ru: '24ч %', pt: '24h %', ar: '24س %', tr: '24s %', ko: '24시간 %',
  },
  'pairs.col.volume': {
    en: 'Volume (24h)', zh: '成交量 (24h)', es: 'Volumen (24h)', ru: 'Объем (24ч)', pt: 'Volume (24h)', ar: 'الحجم (24س)', tr: 'Hacim (24s)', ko: '거래량 (24h)',
  },
  'pairs.col.liquidity': {
    en: 'Liquidity', zh: '流动性', es: 'Liquidez', ru: 'Ликвидность', pt: 'Liquidez', ar: 'السيولة', tr: 'Likidite', ko: '유동성',
  },
  'pairs.col.score': {
    en: 'Score', zh: '评分', es: 'Puntaje', ru: 'Оценка', pt: 'Pontuação', ar: 'النتيجة', tr: 'Skor', ko: '점수',
  },
  'pairs.col.chart': {
    en: 'Chart (7d)', zh: '图表 (7天)', es: 'Gráfico (7d)', ru: 'График (7д)', pt: 'Gráfico (7d)', ar: 'الرسم البياني (7 أيام)', tr: 'Grafik (7g)', ko: '차트 (7일)',
  },
  'pairs.col.pair': {
    en: 'Pair', zh: '交易对', es: 'Par', ru: 'Пара', pt: 'Par', ar: 'زوج', tr: 'Çift', ko: '페어',
  },
  'pairs.col.marketCap': {
    en: 'Market Cap', zh: '市值', es: 'Capitalización', ru: 'Рыночная капитализация', pt: 'Capitalização', ar: 'القيمة السوقية', tr: 'Piyasa Değeri', ko: '시가총액',
  },
  'pairs.noResults': {
    en: 'No pairs found', zh: '未找到交易对', es: 'No se encontraron pares', ru: 'Пары не найдены', pt: 'Nenhum par encontrado', ar: 'لم يتم العثور على أزواج', tr: 'Çift bulunamadı', ko: '페어를 찾을 수 없음',
  },
  'watchlist.pairsCount': {
    en: '{{count}} pairs', zh: '{{count}} 个交易对', es: '{{count}} pares', ru: '{{count}} пар', pt: '{{count}} pares', ar: '{{count}} أزواج', tr: '{{count}} çift', ko: '{{count}} 페어',
  },
  'watchlist.emptyTitle': {
    en: 'No pairs in watchlist', zh: '关注列表中没有交易对', es: 'No hay pares en la lista de seguimiento', ru: 'Нет пар в списке наблюдения', pt: 'Sem pares na lista de observação', ar: 'لا توجد أزواج في القائمة', tr: 'İzleme listesinde çift yok', ko: '관심 목록에 페어가 없습니다',
  },
  'watchlist.emptyDescription': {
    en: 'Add pairs to your watchlist to track them here', zh: '将交易对添加到关注列表以在此跟踪', es: 'Agrega pares a tu lista de seguimiento para rastrearlos aquí', ru: 'Добавьте пары в список наблюдения, чтобы отслеживать их здесь', pt: 'Adicione pares à sua lista de observação para acompanhá-los aqui', ar: 'أضف أزواجًا إلى قائمة المتابعة لتتبعها هنا', tr: 'İzleme listene çift ekleyerek burada takip et', ko: '관심 목록에 페어를 추가하여 여기에서 추적하세요',
  },
  'watchlist.emptyDescriptionMobile': {
    en: 'Add pairs from the Pairs screen', zh: '从交易对页面添加交易对', es: 'Agrega pares desde la pantalla de pares', ru: 'Добавьте пары с экрана пар', pt: 'Adicione pares a partir da tela de pares', ar: 'أضف أزواجًا من شاشة الأزواج', tr: 'Çiftler ekranından çift ekle', ko: '페어 화면에서 페어를 추가하세요',
  },
  'watchlist.browsePairs': {
    en: 'Browse Pairs', zh: '浏览交易对', es: 'Explorar pares', ru: 'Просмотреть пары', pt: 'Navegar pares', ar: 'تصفح الأزواج', tr: 'Pazar çiftleri', ko: '페어 둘러보기',
  },
  'watchlist.col.pair': {
    en: 'Pair', zh: '交易对', es: 'Par', ru: 'Пара', pt: 'Par', ar: 'زوج', tr: 'Çift', ko: '페어',
  },
  'watchlist.noChart': {
    en: 'No chart', zh: '无图表', es: 'Sin gráfico', ru: 'Нет графика', pt: 'Sem gráfico', ar: 'لا يوجد رسم بياني', tr: 'Grafik yok', ko: '차트 없음',
  },
  'howitworks.badge': {
    en: 'How It Works', zh: '工作原理', es: 'Cómo funciona', ru: 'Как это работает', pt: 'Como funciona', ar: 'كيف تعمل', tr: 'Nasıl Çalışır', ko: '작동 방식',
  },
  'howitworks.title.line1': {
    en: 'Three steps to start', zh: '启动的三步', es: 'Tres pasos para comenzar', ru: 'Три шага к началу', pt: 'Três passos para começar', ar: 'ثلاث خطوات للبدء', tr: 'Başlamak için üç adım', ko: '시작하는 세 단계',
  },
  'howitworks.title.line2': {
    en: 'trading early', zh: '提前交易', es: 'a operar temprano', ru: 'торговать раньше', pt: 'a negociar cedo', ar: 'التداول مبكراً', tr: 'erken ticaret', ko: '미리 거래하기',
  },
  'howitworks.subtitle': {
    en: 'From wallet connection to your first trade — set up in under a minute.', zh: '从钱包连接到您的第一笔交易 — 只需一分钟即可完成。', es: 'Desde conectar la billetera hasta tu primera operación — configúralo en menos de un minuto.', ru: 'От подключения кошелька до первой сделки — настройка за минуту.', pt: 'Da conexão da carteira ao seu primeiro trade — configure em menos de um minuto.', ar: 'من ربط المحفظة إلى أول صفقة لك — الإعداد في أقل من دقيقة.', tr: 'Cüzdan bağlantısından ilk işleminize kadar — bir dakikadan kısa sürede kurulum.', ko: '지갑 연결부터 첫 거래까지 — 1분 이내에 설정하세요.',
  },
  'howitworks.step.connect.title': {
    en: 'Connect Wallet', zh: '连接钱包', es: 'Conectar billetera', ru: 'Подключите кошелек', pt: 'Conectar carteira', ar: 'ربط المحفظة', tr: 'Cüzdan Bağla', ko: '지갑 연결',
  },
  'howitworks.step.connect.description': {
    en: 'Link your MetaMask, Phantom, WalletConnect, or any Web3 wallet in a single click. No sign-up, no KYC, no friction.', zh: '一键连接 MetaMask、Phantom、WalletConnect 或任何 Web3 钱包。无需注册，无需 KYC，无阻力。', es: 'Conecta MetaMask, Phantom, WalletConnect o cualquier wallet Web3 con un solo clic. Sin registro, sin KYC, sin fricción.', ru: 'Подключите MetaMask, Phantom, WalletConnect или любой Web3-кошелек одним кликом. Никакой регистрации, никакого KYC, никакого трения.', pt: 'Conecte MetaMask, Phantom, WalletConnect ou qualquer carteira Web3 com um clique. Sem cadastro, sem KYC, sem atrito.', ar: 'اربط MetaMask أو Phantom أو WalletConnect أو أي محفظة Web3 بنقرة واحدة. بدون تسجيل، بدون KYC، بدون احتكاك.', tr: 'MetaMask, Phantom, WalletConnect veya herhangi bir Web3 cüzdanını tek tıklamayla bağlayın. Kayıt yok, KYC yok, sürtünme yok.', ko: 'MetaMask, Phantom, WalletConnect 또는 모든 Web3 지갑을 한 번의 클릭으로 연결하세요. 회원가입 불필요, KYC 불필요, 불편함 없음.',
  },
  'howitworks.step.discover.title': {
    en: 'Discover Pairs', zh: '发现交易对', es: 'Descubrir pares', ru: 'Найдите пары', pt: 'Descobrir pares', ar: 'اكتشف الأزواج', tr: 'Çiftleri Keşfet', ko: '페어 발견',
  },
  'howitworks.step.discover.description': {
    en: 'Browse trending pairs ranked by volume velocity, liquidity depth, and our proprietary momentum score updated in real time.', zh: '浏览按成交量速度、流动性深度和我们专有动量评分实时排名的热门交易对。', es: 'Explora pares en tendencia ordenados por velocidad de volumen, profundidad de liquidez y nuestra puntuación de momentum patentada actualizada en tiempo real.', ru: 'Просматривайте трендовые пары по скорости объема, глубине ликвидности и нашему собственному momentum-скорору, обновляемому в реальном времени.', pt: 'Navegue por pares em tendência classificados por velocidade de volume, profundidade de liquidez e nossa pontuação de momentum proprietária atualizada em tempo real.', ar: 'استعرض الأزواج الرائجة المصنفة حسب سرعة الحجم وعمق السيولة ونقاط القوة الحركية الخاصة بنا المحدثة في الوقت الحقيقي.', tr: 'Hacim hızı, likidite derinliği ve gerçek zamanlı güncellenen özel momentum puanımıza göre sıralanmış trend çiftleri keşfedin.', ko: '거래량 속도, 유동성 깊이 및 실시간 업데이트되는 자체 모멘텀 점수로 순위가 매겨진 트렌딩 페어를 찾아보세요.',
  },
  'howitworks.step.trade.title': {
    en: 'Trade & Earn', zh: '交易并赚取', es: 'Operar y ganar', ru: 'Торговать и зарабатывать', pt: 'Negociar e ganhar', ar: 'تداول واكسب', tr: 'Ticaret Yap & Kazan', ko: '거래하고 수익 올리기',
  },
  'howitworks.step.trade.description': {
    en: 'Place limit or market orders through our decentralized orderbook. Get in early and ride the wave before CEX listing pumps.', zh: '通过我们的去中心化订单簿下限价或市价单。抢先入场，在中心化交易所上市前顺势而上。', es: 'Haz órdenes límite o de mercado a través de nuestro libro de órdenes descentralizado. Entra temprano y aprovecha el impulso antes de la cotización en CEX.', ru: 'Размещайте лимитные или рыночные ордера через наш децентрализованный ордербук. Заходите раньше и поймайте волну до листинга на CEX.', pt: 'Faça ordens limitadas ou de mercado através do nosso livro de ordens descentralizado. Entre cedo e aproveite a onda antes do listing em CEX.', ar: 'ضع أوامر محددة أو سوقية عبر دفتر الأوامر اللامركزي الخاص بنا. ادخل مبكراً وركب الموجة قبل إدراجها في CEX.', tr: 'Merkeziyetsiz emir defterimiz üzerinden limit veya piyasa emirleri verin. CEX listelenmelerinden önce erken girin ve dalgayı yakalayın.', ko: '탈중앙화 주문서를 통해 지정가 또는 시장가 주문을 하세요. CEX 상장 전에 일찍 진입해 물결을 타세요.',
  },
  'howitworks.launchApp': {
    en: 'Launch App', zh: '启动应用', es: 'Lanzar app', ru: 'Запустить приложение', pt: 'Iniciar app', ar: 'تشغيل التطبيق', tr: 'Uygulamayı Başlat', ko: '앱 실행',
  },
  'showcase.badge': {
    en: 'Platform Preview', zh: '平台预览', es: 'Vista previa de la plataforma', ru: 'Обзор платформы', pt: 'Visualização da plataforma', ar: 'معاينة المنصة', tr: 'Platform Önizlemesi', ko: '플랫폼 미리보기',
  },
  'showcase.title.line1': {
    en: 'A trading experience', zh: '一个交易体验', es: 'Una experiencia de trading', ru: 'Торговый опыт', pt: 'Uma experiência de trading', ar: 'تجربة تداول', tr: 'Bir ticaret deneyimi', ko: '거래 경험',
  },
  'showcase.title.line2': {
    en: 'built for power users', zh: '为高级用户打造', es: 'diseñada para usuarios avanzados', ru: 'созданная для профессионалов', pt: 'projetada para usuários avançados', ar: 'مصممة للمستخدمين المحترفين', tr: 'güçlü kullanıcılar için tasarlandı', ko: '파워 유저를 위해 설계됨',
  },
  'showcase.subtitle': {
    en: 'Clean, fast, and data-dense. Every piece of information you need — nothing you don’t.', zh: '干净、快速且信息密集。你需要的每一个数据点 — 没有多余内容。', es: 'Limpio, rápido y lleno de datos. Toda la información que necesitas — nada de lo que no.', ru: 'Чистый, быстрый и насыщенный данными. Вся нужная информация — ничего лишнего.', pt: 'Limpo, rápido e cheio de dados. Cada informação que você precisa — nada a mais.', ar: 'نظيف وسريع ومليء بالبيانات. كل المعلومات التي تحتاجها — ولا شيء زائد.', tr: 'Temiz, hızlı ve veri yoğun. İhtiyacınız olan her bilgi — gereksiz hiçbir şey yok.', ko: '깔끔하고 빠르며 데이터가 풍부합니다. 필요한 정보만 — 불필요한 것은 없습니다.',
  },
  'showcase.annotation.liveOrderbook': {
    en: 'Live Orderbook', zh: '实时订单簿', es: 'Libro de órdenes en vivo', ru: 'Живой ордербук', pt: 'Livro de ordens ao vivo', ar: 'دفتر أوامر مباشر', tr: 'Canlı Emir Defteri', ko: '실시간 주문서',
  },
  'showcase.annotation.realTimeChart': {
    en: 'Real-time Chart', zh: '实时图表', es: 'Gráfico en tiempo real', ru: 'График в реальном времени', pt: 'Gráfico em tempo real', ar: 'الرسم البياني في الوقت الحقيقي', tr: 'Gerçek zamanlı grafik', ko: '실시간 차트',
  },
  'showcase.annotation.oneClickTrade': {
    en: 'One-click Trade', zh: '一键交易', es: 'Comercio con un clic', ru: 'Торговля в один клик', pt: 'Negociação com um clique', ar: 'تداول بنقرة واحدة', tr: 'Tek tıklamayla ticaret', ko: '원클릭 거래',
  },
  'showcase.tab.orderbook': {
    en: 'Orderbook', zh: '订单簿', es: 'Libro de órdenes', ru: 'Ордербук', pt: 'Livro de ordens', ar: 'دفتر الأوامر', tr: 'Emir Defteri', ko: '주문서',
  },
  'showcase.tab.info': {
    en: 'Info', zh: '信息', es: 'Info', ru: 'Инфо', pt: 'Info', ar: 'معلومات', tr: 'Bilgi', ko: '정보',
  },
  'showcase.tab.chart': {
    en: 'Chart', zh: '图表', es: 'Gráfico', ru: 'График', pt: 'Gráfico', ar: 'الرسم البياني', tr: 'Grafik', ko: '차트',
  },
  'showcase.tab.trades': {
    en: 'Trades', zh: '交易', es: 'Operaciones', ru: 'Сделки', pt: 'Trades', ar: 'التداولات', tr: 'İşlemler', ko: '체결',
  },
  'showcase.spread': {
    en: 'Spread', zh: '差价', es: 'Spread', ru: 'Спред', pt: 'Spread', ar: 'الفارق', tr: 'Spread', ko: '스프레드',
  },
  'showcase.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'showcase.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'showcase.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Всего', pt: 'Total', ar: 'الإجمالي', tr: 'Toplam', ko: '총액',
  },
  'showcase.button.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Al', ko: '매수',
  },
  'showcase.button.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '매도',
  },
  'showcase.buyButton': {
    en: 'Buy PEPE / WETH', zh: '购买 PEPE / WETH', es: 'Comprar PEPE / WETH', ru: 'Купить PEPE / WETH', pt: 'Comprar PEPE / WETH', ar: 'شراء PEPE / WETH', tr: 'PEPE / WETH Al', ko: 'PEPE / WETH 구매',
  },
  'showcase.trendingScore': {
    en: 'Trending score:', zh: '趋势得分：', es: 'Puntuación de tendencia:', ru: 'Индекс тренда:', pt: 'Pontuação de tendência:', ar: 'درجة الترند:', tr: 'Trend skoru:', ko: '트렌드 점수:',
  },
  'showcase.totalLabel': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Всего', pt: 'Total', ar: 'الإجمالي', tr: 'Toplam', ko: '총액',
  },
  'showcase.feeLabel': {
    en: 'Fee (0.1%)', zh: '费用 (0.1%)', es: 'Tarifa (0.1%)', ru: 'Комиссия (0.1%)', pt: 'Taxa (0.1%)', ar: 'الرسوم (0.1%)', tr: 'Ücret (0.1%)', ko: '수수료 (0.1%)',
  },
  'showcase.volumeLabel': {
    en: 'Vol', zh: '成交量', es: 'Vol', ru: 'Объем', pt: 'Vol', ar: 'حجم', tr: 'Hacim', ko: '볼륨',
  },
  'stats.badge': {
    en: 'The Numbers', zh: '关键数据', es: 'Los números', ru: 'Цифры', pt: 'Os números', ar: 'الأرقام', tr: 'Rakamlar', ko: '숫자',
  },
  'stats.title.line1': {
    en: 'Trusted by traders', zh: '交易者信赖', es: 'Confiado por traders', ru: 'Доверяют трейдеры', pt: 'Confiado por traders', ar: 'يثق به المتداولون', tr: 'Tüccarlar tarafından güvenilir', ko: '트레이더가 신뢰하는',
  },
  'stats.title.line2': {
    en: 'worldwide', zh: '全球', es: 'a nivel mundial', ru: 'по всему миру', pt: 'em todo o mundo', ar: 'حول العالم', tr: 'dünya çapında', ko: '전 세계',
  },
  'stats.volume.label': {
    en: 'Total Volume Traded', zh: '总交易量', es: 'Volumen total negociado', ru: 'Общий объем торгов', pt: 'Volume total negociado', ar: 'إجمالي الحجم المتداول', tr: 'Toplam işlem hacmi', ko: '총 거래량',
  },
  'stats.volume.sublabel': {
    en: 'Across all pairs', zh: '覆盖所有交易对', es: 'En todos los pares', ru: 'По всем парам', pt: 'Em todos os pares', ar: 'عبر جميع الأزواج', tr: 'Tüm çiftlerde', ko: '모든 페어에서',
  },
  'stats.trending.label': {
    en: 'Trending Pairs Live', zh: '热门交易对实时', es: 'Pares en tendencia en vivo', ru: 'Трендовые пары в реальном времени', pt: 'Pares em tendência ao vivo', ar: 'الأزواج الرائجة مباشرة', tr: 'Canlı trend çiftleri', ko: '실시간 트렌딩 페어',
  },
  'stats.trending.sublabel': {
    en: 'Updated every 5 min', zh: '每 5 分钟更新', es: 'Actualizado cada 5 min', ru: 'Обновляется каждые 5 минут', pt: 'Atualizado a cada 5 min', ar: 'يتم تحديثه كل 5 دقائق', tr: 'Her 5 dakikada bir güncellenir', ko: '5분마다 업데이트',
  },
  'stats.trades.label': {
    en: 'Trades Executed', zh: '执行交易', es: 'Operaciones ejecutadas', ru: 'Исполненных сделок', pt: 'Negócios executados', ar: 'الصفقات المنفذة', tr: 'Gerçekleşen işlemler', ko: '체결된 거래',
  },
  'stats.trades.sublabel': {
    en: 'And counting', zh: '持续增加', es: 'Y contando', ru: 'И это только начало', pt: 'E contando', ar: 'وما زال العدد في تزايد', tr: 'Ve saymaya devam ediyor', ko: '계속 증가 중',
  },
  'stats.fees.label': {
    en: 'Listing Fees', zh: '上市费用', es: 'Tarifas de listado', ru: 'Плата за листинг', pt: 'Taxas de listagem', ar: 'رسوم الإدراج', tr: 'Listeleme Ücretleri', ko: '상장 수수료',
  },
  'stats.fees.sublabel': {
    en: 'Forever free', zh: '永久免费', es: 'Gratis para siempre', ru: 'Навсегда бесплатно', pt: 'Grátis para sempre', ar: 'مجاني إلى الأبد', tr: 'Her zaman ücretsiz', ko: '영구 무료',
  },
  'stats.supportedDexes': {
    en: 'Supported DEXes', zh: '支持的 DEX', es: 'DEXes compatibles', ru: 'Поддерживаемые DEX', pt: 'DEXs suportados', ar: 'DEXes المدعومة', tr: 'Desteklenen DEXler', ko: '지원되는 DEX',
  },
  'cta.badge': {
    en: 'Ready to trade early?', zh: '准备提前交易？', es: '¿Listo para comerciar temprano?', ru: 'Готовы торговать заранее?', pt: 'Pronto para negociar cedo?', ar: 'هل أنت جاهز للتداول مبكراً؟', tr: 'Erken ticarete hazır mısınız?', ko: '미리 거래할 준비가 되셨나요?',
  },
  'cta.title.line1': {
    en: 'Start Trading', zh: '开始交易', es: 'Comienza a comerciar', ru: 'Начните торговать', pt: 'Comece a negociar', ar: 'ابدأ التداول', tr: 'Ticarete Başla', ko: '거래 시작',
  },
  'cta.title.line2': {
    en: 'in Seconds', zh: '仅需几秒', es: 'en segundos', ru: 'за секунды', pt: 'em segundos', ar: 'في ثوانٍ', tr: 'saniyeler içinde', ko: '몇 초 안에',
  },
  'cta.subtitle': {
    en: 'Join thousands of traders already ahead of the market. No account, no KYC — just connect your wallet and trade.', zh: '加入数千名已经领先市场的交易者。无需账户，无需 KYC — 只需连接钱包并交易。', es: 'Únete a miles de traders que ya están por delante del mercado. Sin cuenta, sin KYC — solo conecta tu wallet y opera.', ru: 'Присоединяйтесь к тысячам трейдеров, уже опережающим рынок. Нет аккаунта, нет KYC — просто подключите кошелек и торгуйте.', pt: 'Junte-se a milhares de traders que já estão à frente do mercado. Sem conta, sem KYC — apenas conecte sua carteira e negocie.', ar: 'انضم إلى آلاف المتداولين الذين سبقوا السوق بالفعل. لا حاجة لحساب، لا حاجة لـ KYC — فقط ربط المحفظة والتداول.', tr: 'Piyasadan önce hareket eden binlerce tradera katılın. Hesap yok, KYC yok — sadece cüzdanınızı bağlayın ve ticaret yapın.', ko: '이미 시장보다 앞서 있는 수천 명의 트레이더에 합류하세요. 계정 없음, KYC 없음 — 지갑 연결 후 거래하세요.',
  },
  'cta.launchApp': {
    en: 'Launch App', zh: '启动应用', es: 'Lanzar app', ru: 'Запустить приложение', pt: 'Iniciar app', ar: 'تشغيل التطبيق', tr: 'Uygulamayı Başlat', ko: '앱 실행',
  },
  'cta.readDocs': {
    en: 'Read Docs', zh: '阅读文档', es: 'Leer docs', ru: 'Читать документацию', pt: 'Ler docs', ar: 'اقرأ الوثائق', tr: 'Dokümanları Oku', ko: '문서 읽기',
  },
  'cta.benefits.noSignUp': {
    en: 'No sign-up required', zh: '无需注册', es: 'No se requiere registro', ru: 'Регистрация не требуется', pt: 'Sem necessidade de cadastro', ar: 'لا حاجة للتسجيل', tr: 'Kayıt gerektirmez', ko: '가입 불필요',
  },
  'cta.benefits.nonCustodial': {
    en: 'Non-custodial', zh: '非托管', es: 'No custodial', ru: 'Без хранения средств', pt: 'Não custodial', ar: 'غير وصائي', tr: 'Müşterek olmayan', ko: '비수탁',
  },
  'cta.benefits.audited': {
    en: 'Audited contracts', zh: '审计合约', es: 'Contratos auditados', ru: 'Аудитированные контракты', pt: 'Contratos auditados', ar: 'عقود مدققة', tr: 'Denetlenmiş sözleşmeler', ko: '감사된 스마트 계약',
  },
  'cta.benefits.support': {
    en: '24/7 support', zh: '全天候支持', es: 'Soporte 24/7', ru: 'Поддержка 24/7', pt: 'Suporte 24/7', ar: 'دعم 24/7', tr: '7/24 destek', ko: '24/7 지원',
  },
  'footer.cta.line1': {
    en: 'Ready to trade before the crowd?', zh: '准备在拥挤之前交易？', es: '¿Listo para comerciar antes que la multitud?', ru: 'Готовы торговать до толпы?', pt: 'Pronto para negociar antes da multidão?', ar: 'هل أنت مستعد للتداول قبل الحشد؟', tr: 'Kalabalıktan önce işlem yapmaya hazır mısınız?', ko: '군중보다 먼저 거래할 준비가 되셨나요?',
  },
  'footer.cta.line2': {
    en: 'Start in under a minute.', zh: '在一分钟内开始。', es: 'Comienza en menos de un minuto.', ru: 'Начните менее чем за минуту.', pt: 'Comece em menos de um minuto.', ar: 'ابدأ في أقل من دقيقة.', tr: 'Bir dakikadan kısa sürede başlayın.', ko: '1분 이내에 시작하세요.',
  },
  'footer.cta.launchApp': {
    en: 'Launch App', zh: '启动应用', es: 'Lanzar app', ru: 'Запустить приложение', pt: 'Iniciar app', ar: 'تشغيل التطبيق', tr: 'Uygulamayı Başlat', ko: '앱 실행',
  },
  'footer.description': {
    en: 'Decentralized orderbook for trending pairs. Trade before they hit CEX.', zh: '面向热门交易对的去中心化订单簿。在它们进入 CEX 之前交易。', es: 'Libro de órdenes descentralizado para pares en tendencia. Opera antes de que lleguen a CEX.', ru: 'Децентрализованный ордербук для трендовых пар. Торгуйте до листинга на CEX.', pt: 'Livro de ordens descentralizado para pares em tendência. Negocie antes de chegar ao CEX.', ar: 'دفتر أوامر لامركزي للأزواج الرائجة. تداول قبل أن تصل إلى CEX.', tr: 'Trend çiftleri için merkeziyetsiz emir defteri. CEX’e ulaşmadan önce işlem yapın.', ko: '트렌딩 페어를 위한 탈중앙화 주문서. CEX에 상장되기 전에 거래하세요.',
  },
  'footer.platformHeading': {
    en: 'Platform', zh: '平台', es: 'Plataforma', ru: 'Платформа', pt: 'Plataforma', ar: 'المنصة', tr: 'Platform', ko: '플랫폼',
  },
  'footer.link.trade': {
    en: 'Trade', zh: '交易', es: 'Comerciar', ru: 'Торговля', pt: 'Negociar', ar: 'تداول', tr: 'Ticaret', ko: '거래',
  },
  'footer.link.pairs': {
    en: 'Pairs', zh: '交易对', es: 'Pares', ru: 'Пары', pt: 'Pares', ar: 'الأزواج', tr: 'Çiftler', ko: '페어',
  },
  'footer.resourcesHeading': {
    en: 'Resources', zh: '资源', es: 'Recursos', ru: 'Ресурсы', pt: 'Recursos', ar: 'الموارد', tr: 'Kaynaklar', ko: '리소스',
  },
  'footer.link.documentation': {
    en: 'Documentation', zh: '文档', es: 'Documentación', ru: 'Документация', pt: 'Documentação', ar: 'التوثيق', tr: 'Dokümantasyon', ko: '문서',
  },
  'footer.link.status': {
    en: 'Status', zh: '状态', es: 'Estado', ru: 'Статус', pt: 'Status', ar: 'الحالة', tr: 'Durum', ko: '상태',
  },
  'footer.link.support': {
    en: 'Support', zh: '支持', es: 'Soporte', ru: 'Поддержка', pt: 'Suporte', ar: 'الدعم', tr: 'Destek', ko: '지원',
  },
  'footer.communityHeading': {
    en: 'Community', zh: '社区', es: 'Comunidad', ru: 'Сообщество', pt: 'Comunidade', ar: 'المجتمع', tr: 'Topluluk', ko: '커뮤니티',
  },
  'footer.link.twitter': {
    en: 'Twitter / X', zh: 'Twitter / X', es: 'Twitter / X', ru: 'Twitter / X', pt: 'Twitter / X', ar: 'Twitter / X', tr: 'Twitter / X', ko: 'Twitter / X',
  },
  'footer.link.discord': {
    en: 'Discord', zh: 'Discord', es: 'Discord', ru: 'Discord', pt: 'Discord', ar: 'Discord', tr: 'Discord', ko: 'Discord',
  },
  'footer.link.telegram': {
    en: 'Telegram', zh: 'Telegram', es: 'Telegram', ru: 'Telegram', pt: 'Telegram', ar: 'Telegram', tr: 'Telegram', ko: '텔레그램',
  },
  'footer.social.twitter': {
    en: 'Twitter / X', zh: 'Twitter / X', es: 'Twitter / X', ru: 'Twitter / X', pt: 'Twitter / X', ar: 'Twitter / X', tr: 'Twitter / X', ko: 'Twitter / X',
  },
  'footer.social.discord': {
    en: 'Discord', zh: 'Discord', es: 'Discord', ru: 'Discord', pt: 'Discord', ar: 'Discord', tr: 'Discord', ko: 'Discord',
  },
  'footer.social.telegram': {
    en: 'Telegram', zh: 'Telegram', es: 'Telegram', ru: 'Telegram', pt: 'Telegram', ar: 'Telegram', tr: 'Telegram', ko: '텔레그램',
  },
  'footer.copyright': {
    en: '© 2026 Unbound. All rights reserved.', zh: '© 2026 Unbound。版权所有。', es: '© 2026 Unbound. Todos los derechos reservados.', ru: '© 2026 Unbound. Все права защищены.', pt: '© 2026 Unbound. Todos os direitos reservados.', ar: '© 2026 Unbound. جميع الحقوق محفوظة.', tr: '© 2026 Unbound. Tüm hakları saklıdır.', ko: '© 2026 Unbound. 모든 권리 보유.',
  },
  'footer.terms': {
    en: 'Terms of Service', zh: '服务条款', es: 'Términos de servicio', ru: 'Условия использования', pt: 'Termos de serviço', ar: 'شروط الخدمة', tr: 'Hizmet Şartları', ko: '서비스 약관',
  },
  'footer.privacy': {
    en: 'Privacy Policy', zh: '隐私政策', es: 'Política de privacidad', ru: 'Политика конфиденциальности', pt: 'Política de privacidade', ar: 'سياسة الخصوصية', tr: 'Gizlilik Politikası', ko: '개인정보 처리방침',
  },
  'footer.brand': {
    en: 'Unbound', zh: 'Unbound', es: 'Unbound', ru: 'Unbound', pt: 'Unbound', ar: 'Unbound', tr: 'Unbound', ko: 'Unbound',
  },
  'footer.connectHeading': {
    en: 'Connect', zh: '连接', es: 'Conectar', ru: 'Подключиться', pt: 'Conectar', ar: 'اتصل', tr: 'Bağlan', ko: '연결',
  },
  'trade.heading': {
    en: 'Markets', zh: '市场', es: 'Mercados', ru: 'Рынки', pt: 'Mercados', ar: 'الأسواق', tr: 'Piyasalar', ko: '마켓',
  },
  'trade.subtitle': {
    en: 'Trending trading pairs from DEX aggregators', zh: '来自 DEX 聚合器的热门交易对', es: 'Pares de trading en tendencia de agregadores DEX', ru: 'Трендовые торговые пары из агрегаторов DEX', pt: 'Pares de negociação em tendência de agregadores DEX', ar: 'أزواج التداول الرائجة من مجمِّعي DEX', tr: 'DEX toplayıcılarından trend işlem çiftleri', ko: 'DEX 애그리게이터의 트렌딩 거래 페어',
  },
  'trade.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Al', ko: '매수',
  },
  'trade.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '매도',
  },
  'trade.back': {
    en: 'Back', zh: '返回', es: 'Atrás', ru: 'Назад', pt: 'Voltar', ar: 'عودة', tr: 'Geri', ko: '뒤로',
  },
  'trade.limit': {
    en: 'Limit', zh: '限价', es: 'Límite', ru: 'Лимит', pt: 'Limit', ar: 'حد', tr: 'Limit', ko: '지정가',
  },
  'trade.market': {
    en: 'Market', zh: '市价', es: 'Mercado', ru: 'Маркет', pt: 'Mercado', ar: 'سوق', tr: 'Piyasa', ko: '시장가',
  },
  'trade.postOnly': {
    en: 'Post Only', zh: '仅挂单', es: 'Solo ejecutar', ru: 'Только выставление', pt: 'Apenas postar', ar: 'نشر فقط', tr: 'Sadece Post', ko: '포스트 온리',
  },
  'trade.postOnlyLimitOnly': {
    en: 'Post Only is only available for limit orders', zh: '仅限价单可使用仅挂单', es: 'Post Only está disponible solo para órdenes limitadas', ru: 'Post Only доступен только для лимитных ордеров', pt: 'Post Only está disponível apenas para ordens limitadas', ar: 'Post Only متاحة فقط لأوامر الحد', tr: 'Post Only yalnızca limit emirler için kullanılabilir', ko: 'Post Only는 지정가 주문에만 사용할 수 있습니다',
  },
  'trade.none': {
    en: 'None', zh: '无', es: 'Ninguno', ru: 'Нет', pt: 'Nenhum', ar: 'لا شيء', tr: 'Hiçbiri', ko: '없음',
  },
  'trade.takeProfit': {
    en: 'Take Profit', zh: '止盈', es: 'Take Profit', ru: 'Тейк-профит', pt: 'Take Profit', ar: 'تحقيق الربح', tr: 'Kar Al', ko: '이익 실현',
  },
  'trade.stopLoss': {
    en: 'Stop Loss', zh: '止损', es: 'Stop Loss', ru: 'Стоп-лосс', pt: 'Stop Loss', ar: 'وقف الخسارة', tr: 'Zarar Durdur', ko: '손절매',
  },
  'trade.ladder': {
    en: 'Ladder', zh: '阶梯', es: 'Escalera', ru: 'Лестница', pt: 'Escada', ar: 'سلم', tr: 'Basamak', ko: '사다리',
  },
  'trade.expand': {
    en: '▲', zh: '▲', es: '▲', ru: '▲', pt: '▲', ar: '▲', tr: '▲', ko: '▲',
  },
  'trade.collapse': {
    en: '▼', zh: '▼', es: '▼', ru: '▼', pt: '▼', ar: '▼', tr: '▼', ko: '▼',
  },
  'trade.ladderConfiguration': {
    en: 'Ladder Configuration', zh: '阶梯配置', es: 'Configuración de escalera', ru: 'Конфигурация лестницы', pt: 'Configuração de escada', ar: 'تهيئة السلم', tr: 'Basamak Yapılandırması', ko: '사다리 설정',
  },
  'trade.levels': {
    en: 'Levels', zh: '级别', es: 'Niveles', ru: 'Уровни', pt: 'Níveis', ar: 'المستويات', tr: 'Seviye', ko: '레벨',
  },
  'trade.startPrice': {
    en: 'Start Price', zh: '起始价', es: 'Precio inicial', ru: 'Начальная цена', pt: 'Preço inicial', ar: 'السعر الابتدائي', tr: 'Başlangıç Fiyatı', ko: '시작 가격',
  },
  'trade.endPrice': {
    en: 'End Price', zh: '结束价', es: 'Precio final', ru: 'Конечная цена', pt: 'Preço final', ar: 'السعر النهائي', tr: 'Bitiş Fiyatı', ko: '종료 가격',
  },
  'trade.tiers': {
    en: 'tiers', zh: '层', es: 'niveles', ru: 'уровней', pt: 'níveis', ar: 'طبقات', tr: 'seviye', ko: '계층',
  },
  'trade.ordersDistributed': {
    en: 'Orders will be distributed across {{count}} price levels between start and end prices', zh: '订单将在起始价和结束价之间的 {{count}} 个价格级别上分布', es: 'Las órdenes se distribuirán en {{count}} niveles de precio entre el precio inicial y el final', ru: 'Приказы будут распределены по {{count}} уровням цены между начальной и конечной ценой', pt: 'As ordens serão distribuídas por {{count}} níveis de preço entre o preço inicial e o final', ar: 'سيتم توزيع الطلبات عبر {{count}} مستويات سعر بين السعر الابتدائي والنهائي', tr: 'Emirler başlangıç ve bitiş fiyatları arasında {{count}} fiyat seviyesine dağıtılacaktır', ko: '주문은 시작 가격과 종료 가격 사이의 {{count}} 가격 수준에 분배됩니다',
  },
  'trade.available': {
    en: 'Available', zh: '可用', es: 'Disponible', ru: 'Доступно', pt: 'Disponível', ar: 'متاح', tr: 'Mevcut', ko: '사용 가능',
  },
  'trade.connectWallet': {
    en: 'Connect wallet', zh: '连接钱包', es: 'Conectar billetera', ru: 'Подключите кошелек', pt: 'Conectar carteira', ar: 'ربط المحفظة', tr: 'Cüzdan Bağla', ko: '지갑 연결',
  },
  'trade.loading': {
    en: 'Loading...', zh: '加载中...', es: 'Cargando...', ru: 'Загрузка...', pt: 'Carregando...', ar: 'جار التحميل...', tr: 'Yükleniyor...', ko: '로딩 중...',
  },
  'trade.error': {
    en: 'Error', zh: '错误', es: 'Error', ru: 'Ошибка', pt: 'Erro', ar: 'خطأ', tr: 'Hata', ko: '오류',
  },
  'trade.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'trade.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'trade.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Всего', pt: 'Total', ar: 'المجموع', tr: 'Toplam', ko: '총액',
  },
  'trade.receiverOptional': {
    en: 'Receiver (Optional)', zh: '接收者（可选）', es: 'Receptor (Opcional)', ru: 'Получатель (необязательно)', pt: 'Destinatário (Opcional)', ar: 'المستلم (اختياري)', tr: 'Alıcı (İsteğe bağlı)', ko: '수신자 (선택 사항)',
  },
  'trade.receiverPlaceholder': {
    en: 'Enter wallet address to receive tokens', zh: '输入用于接收代币的钱包地址', es: 'Introduce la dirección de la billetera para recibir tokens', ru: 'Введите адрес кошелька для получения токенов', pt: 'Insira o endereço da carteira para receber tokens', ar: 'أدخل عنوان المحفظة لاستلام الرموز', tr: 'Tokenleri almak için cüzdan adresini girin', ko: '토큰을 받으려면 지갑 주소를 입력하세요',
  },
  'trade.receiverHelp': {
    en: 'Leave empty to receive in your connected wallet', zh: '留空以接收连接的钱包', es: 'Déjalo vacío para recibir en tu wallet conectada', ru: 'Оставьте пустым, чтобы получить на подключенный кошелек', pt: 'Deixe em branco para receber em sua carteira conectada', ar: 'اتركه فارغًا للاستلام في محفظتك المتصلة', tr: 'Bağlı cüzdanınıza almak için boş bırakın', ko: '연결된 지갑으로 받으려면 비워 두세요',
  },
  'trade.expiration': {
    en: 'Expiration', zh: '到期', es: 'Expiración', ru: 'Истечение', pt: 'Expiração', ar: 'انتهاء الصلاحية', tr: 'Sona Erme', ko: '만료',
  },
  'trade.expirationMin': {
    en: 'Min', zh: '分钟', es: 'Min', ru: 'Мин', pt: 'Min', ar: 'دقيقة', tr: 'Dak', ko: '분',
  },
  'trade.expirationDays': {
    en: 'Days', zh: '天', es: 'Días', ru: 'Дни', pt: 'Dias', ar: 'أيام', tr: 'Gün', ko: '일',
  },
  'trade.nonceOptional': {
    en: 'Nonce (Optional)', zh: '随机数（可选）', es: 'Nonce (Opcional)', ru: 'Nonce (необязательно)', pt: 'Nonce (Opcional)', ar: 'رقم تسلسل (اختياري)', tr: 'Nonce (İsteğe bağlı)', ko: '논스 (선택 사항)',
  },
  'trade.noncePlaceholder': {
    en: 'Unique order identifier', zh: '唯一订单标识', es: 'Identificador único de orden', ru: 'Уникальный идентификатор ордера', pt: 'Identificador único de pedido', ar: 'معرّف الطلب الفريد', tr: 'Benzersiz emir kimliği', ko: '고유 주문 식별자',
  },
  'trade.placingOrder': {
    en: 'Placing order...', zh: '挂单中...', es: 'Colocando orden...', ru: 'Размещение ордера...', pt: 'Enviando ordem...', ar: 'جارٍ وضع الأمر...', tr: 'Emir yerleştiriliyor...', ko: '주문 중...',
  },
  'trade.tab.chart': {
    en: 'Chart', zh: '图表', es: 'Gráfico', ru: 'График', pt: 'Gráfico', ar: 'الرسم البياني', tr: 'Grafik', ko: '차트',
  },
  'trade.tab.book': {
    en: 'Book', zh: '盘口', es: 'Libro', ru: 'Книга', pt: 'Livro', ar: 'الدفتر', tr: 'Defter', ko: '북',
  },
  'trade.tab.info': {
    en: 'Info', zh: '信息', es: 'Info', ru: 'Инфо', pt: 'Info', ar: 'معلومات', tr: 'Bilgi', ko: '정보',
  },
  'trade.tab.trade': {
    en: 'Trade', zh: '交易', es: 'Comerciar', ru: 'Торговля', pt: 'Negociar', ar: 'تداول', tr: 'Ticaret', ko: '거래',
  },
  'trade.tab.history': {
    en: 'History', zh: '历史', es: 'Historial', ru: 'История', pt: 'Histórico', ar: 'التاريخ', tr: 'Geçmiş', ko: '히스토리',
  },
  'trade.aria.backToMarkets': {
    en: 'Back to markets', zh: '返回市场', es: 'Volver a mercados', ru: 'Назад к рынкам', pt: 'Voltar aos mercados', ar: 'العودة إلى الأسواق', tr: 'Pazarlara dön', ko: '마켓으로 돌아가기',
  },
  'trade.enterAmount': {
    en: 'Enter {{symbol}} amount', zh: '请输入 {{symbol}} 数量', es: 'Introduce la cantidad de {{symbol}}', ru: 'Введите количество {{symbol}}', pt: 'Insira a quantidade de {{symbol}}', ar: 'أدخل كمية {{symbol}}', tr: '{{symbol}} miktarını girin', ko: '{{symbol}} 수량을 입력하세요',
  },
  'trade.selectPair': {
    en: 'Select a pair to trade', zh: '请选择要交易的交易对', es: 'Seleccione un par para comerciar', ru: 'Выберите пару для торговли', pt: 'Selecione um par para negociar', ar: 'اختر زوجًا للتداول', tr: 'Ticaret yapmak için bir çift seçin', ko: '거래할 페어를 선택하세요',
  },
  'nav.home': {
    en: 'Home', zh: '首页', es: 'Inicio', ru: 'Главная', pt: 'Início', ar: 'الرئيسية', tr: 'Ana Sayfa', ko: '홈',
  },
  'nav.trade': {
    en: 'Trade', zh: '交易', es: 'Comerciar', ru: 'Торговля', pt: 'Negociar', ar: 'تداول', tr: 'Ticaret', ko: '거래',
  },
  'nav.orders': {
    en: 'Orders', zh: '订单', es: 'Órdenes', ru: 'Заказы', pt: 'Ordens', ar: 'الطلبات', tr: 'Siparişler', ko: '주문',
  },
  'nav.watchlist': {
    en: 'Watchlist', zh: '关注列表', es: 'Lista de seguimiento', ru: 'Список наблюдения', pt: 'Lista de observação', ar: 'قائمة المراقبة', tr: 'İzleme Listesi', ko: '관심 목록',
  },
  'pairs.searchPlaceholder': {
    en: 'Search pairs by name, symbol, id or address...', zh: '按名称、符号、ID或地址搜索交易对...', es: 'Buscar pares por nombre, símbolo, ID o dirección...', ru: 'Поиск пар по имени, символу, ID или адресу...', pt: 'Pesquisar pares por nome, símbolo, ID ou endereço...', ar: 'البحث عن الأزواج بالاسم أو الرمز أو المعرف أو العنوان...', tr: 'İsim, sembol, kimlik veya adres ile çiftleri ara...', ko: '이름, 심볼, ID 또는 주소로 페어 검색...',
  },
  'pairs.filter.all': {
    en: 'All', zh: '全部', es: 'Todos', ru: 'Все', pt: 'Todos', ar: 'الكل', tr: 'Tümü', ko: '모두',
  },
  'pairs.filter.hot': {
    en: '🔥 Hot', zh: '🔥 热门', es: '🔥 Caliente', ru: '🔥 Горячий', pt: '🔥 Quente', ar: '🔥 ساخن', tr: '🔥 Sıcak', ko: '🔥 핫',
  },
  'pairs.filter.gainers': {
    en: '▲ Gainers', zh: '▲ 涨幅', es: '▲ Ganadores', ru: '▲ Рост', pt: '▲ Ganhadores', ar: '▲ الرابحون', tr: '▲ Kazananlar', ko: '▲ 상승',
  },
  'pairs.filter.losers': {
    en: '▼ Losers', zh: '▼ 跌幅', es: '▼ Perdedores', ru: '▼ Падение', pt: '▼ Perdedores', ar: '▼ الخاسرون', tr: '▼ Kaybedenler', ko: '▼ 하락',
  },
  'pairs.noResults': {
    en: 'No pairs found', zh: '未找到交易对', es: 'No se encontraron pares', ru: 'Пары не найдены', pt: 'Nenhum par encontrado', ar: 'لم يتم العثور على أزواج', tr: 'Çift bulunamadı', ko: '페어를 찾을 수 없습니다',
  },
  'pairs.header.pair': {
    en: 'Pair', zh: '交易对', es: 'Par', ru: 'Пара', pt: 'Par', ar: 'زوج', tr: 'Çift', ko: '페어',
  },
  'pairs.header.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'pairs.header.change': {
    en: '24h %', zh: '24小时%', es: '24h %', ru: '24ч %', pt: '24h %', ar: '24س %', tr: '24s %', ko: '24시간 %',
  },
  'pairs.header.volume': {
    en: 'Volume', zh: '成交量', es: 'Volumen', ru: 'Объем', pt: 'Volume', ar: 'الحجم', tr: 'Hacim', ko: '거래량',
  },
  'pairs.header.marketCap': {
    en: 'MCap', zh: '市值', es: 'Cap. Mercado', ru: 'Капитализация', pt: 'Cap. Mercado', ar: 'القيمة السوقية', tr: 'Piyasa Değeri', ko: '시가총액',
  },
  'pairs.header.chart': {
    en: 'Chart', zh: '图表', es: 'Gráfico', ru: 'График', pt: 'Gráfico', ar: 'الرسم البياني', tr: 'Grafik', ko: '차트',
  },
  'common.copied': {
    en: 'Copied', zh: '已复制', es: 'Copiado', ru: 'Скопировано', pt: 'Copiado', ar: 'تم النسخ', tr: 'Kopyalandı', ko: '복사됨',
  },
  'trade.selectPair': {
    en: 'Select a pair to trade', zh: '请选择要交易的交易对', es: 'Seleccione un par para comerciar', ru: 'Выберите пару для торговли', pt: 'Selecione um par para negociar', ar: 'اختر زوجًا للتداول', tr: 'Ticaret yapmak için bir çift seçin', ko: '거래할 페어를 선택하세요',
  },
  'trade.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Satın Al', ko: '구매',
  },
  'trade.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '판매',
  },
  'trade.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'trade.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'trade.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Итого', pt: 'Total', ar: 'المجموع', tr: 'Toplam', ko: '총계',
  },
  'trade.receiverLabel': {
    en: 'Receiver (Optional)', zh: '接收者（可选）', es: 'Receptor (Opcional)', ru: 'Получатель (Необязательно)', pt: 'Destinatário (Opcional)', ar: 'المتلقي (اختياري)', tr: 'Alıcı (İsteğe bağlı)', ko: '수령인 (선택사항)',
  },
  'trade.receiverPlaceholder': {
    en: 'Enter receiver wallet address', zh: '输入接收者钱包地址', es: 'Ingrese la dirección de la billetera del receptor', ru: 'Введите адрес кошелька получателя', pt: 'Digite o endereço da carteira do destinatário', ar: 'أدخل عنوان محفظة المتلقي', tr: 'Alıcı cüzdan adresini girin', ko: '수령인 지갑 주소를 입력하세요',
  },
  'trade.receiverHelp': {
    en: 'Leave empty to receive tokens in your connected wallet', zh: '留空以在连接的钱包中接收代币', es: 'Deje vacío para recibir tokens en su billetera conectada', ru: 'Оставьте пустым, чтобы получить токены в подключенном кошельке', pt: 'Deixe vazio para receber tokens na sua carteira conectada', ar: 'اتركه فارغًا لتلقي الرموز المميزة في محفظتك المتصلة', tr: 'Bağlı cüzdanınızda token almak için boş bırakın', ko: '연결된 지갑에서 토큰을 받으려면 비워두세요',
  },
  'trade.connectWallet': {
    en: 'Connect Wallet', zh: '连接钱包', es: 'Conectar Billetera', ru: 'Подключить Кошелек', pt: 'Conectar Carteira', ar: 'ربط المحفظة', tr: 'Cüzdan Bağla', ko: '지갑 연결',
  },
  'trade.orderCreatedSuccessTitle': {
    en: 'Order created successfully', zh: '订单创建成功', es: 'Orden creada exitosamente', ru: 'Заказ создан успешно', pt: 'Ordem criada com sucesso', ar: 'تم إنشاء الطلب بنجاح', tr: 'Sipariş başarıyla oluşturuldu', ko: '주문이 성공적으로 생성되었습니다',
  },
  'trade.orderCreatedSuccessDescription': {
    en: 'Your order has been confirmed and added to the orderbook.', zh: '您的订单已确认并添加到订单簿中。', es: 'Su orden ha sido confirmada y agregada al libro de órdenes.', ru: 'Ваш заказ подтвержден и добавлен в книгу заказов.', pt: 'Seu pedido foi confirmado e adicionado ao livro de pedidos.', ar: 'تم تأكيد طلبك وإضافته إلى دفتر الطلبات.', tr: 'Siparişiniz onaylandı ve emir defterine eklendi.', ko: '주문이 확인되어 주문서에 추가되었습니다.',
  },
  'trade.chart': {
    en: 'Chart', zh: '图表', es: 'Gráfico', ru: 'График', pt: 'Gráfico', ar: 'الرسم البياني', tr: 'Grafik', ko: '차트',
  },
  'trade.book': {
    en: 'Book', zh: '订单簿', es: 'Libro', ru: 'Книга', pt: 'Livro', ar: 'الكتاب', tr: 'Defter', ko: '북',
  },
  'trade.history': {
    en: 'History', zh: '历史', es: 'Historial', ru: 'История', pt: 'Histórico', ar: 'التاريخ', tr: 'Geçmiş', ko: '역사',
  },
  'trade.backToMarkets': {
    en: 'Back to markets', zh: '返回市场', es: 'Volver a mercados', ru: 'Вернуться к рынкам', pt: 'Voltar aos mercados', ar: 'العودة إلى الأسواق', tr: 'Pazarlara geri dön', ko: '시장으로 돌아가기',
  },
  'trade.volume24h': {
    en: 'Volume 24h', zh: '24小时成交量', es: 'Volumen 24h', ru: 'Объем 24ч', pt: 'Volume 24h', ar: 'الحجم 24س', tr: 'Hacim 24s', ko: '거래량 24시간',
  },
  'trade.liquidity': {
    en: 'Liquidity', zh: '流动性', es: 'Liquidez', ru: 'Ликвидность', pt: 'Liquidez', ar: 'السيولة', tr: 'Likidite', ko: '유동성',
  },
  'trade.spread': {
    en: 'Spread', zh: '价差', es: 'Diferencial', ru: 'Спред', pt: 'Diferença', ar: 'الفرق', tr: 'Fark', ko: '스프레드',
  },
  'trade.change24h': {
    en: 'Change 24h', zh: '24小时变化', es: 'Cambio 24h', ru: 'Изменение 24ч', pt: 'Mudança 24h', ar: 'التغيير 24س', tr: 'Değişim 24s', ko: '변화 24시간',
  },
  'trade.noAsks': {
    en: 'No asks', zh: '无卖单', es: 'Sin ofertas de venta', ru: 'Нет предложений продажи', pt: 'Sem ofertas de venda', ar: 'لا يوجد عروض بيع', tr: 'Satış teklifi yok', ko: '매도 없음',
  },
  'trade.noBids': {
    en: 'No bids', zh: '无买单', es: 'Sin ofertas de compra', ru: 'Нет предложений покупки', pt: 'Sem ofertas de compra', ar: 'لا يوجد عروض شراء', tr: 'Alış teklifi yok', ko: '매수 없음',
  },
  'trade.midPrice': {
    en: 'Mid Price', zh: '中间价', es: 'Precio Medio', ru: 'Средняя Цена', pt: 'Preço Médio', ar: 'السعر المتوسط', tr: 'Orta Fiyat', ko: '중간 가격',
  },
  'trade.limit': {
    en: 'Limit', zh: '限价', es: 'Límite', ru: 'Лимит', pt: 'Limite', ar: 'الحد', tr: 'Limit', ko: '리밋',
  },
  'trade.market': {
    en: 'Market', zh: '市价', es: 'Mercado', ru: 'Рынок', pt: 'Mercado', ar: 'السوق', tr: 'Pazar', ko: '시장',
  },
  'trade.postOnly': {
    en: 'Post Only', zh: '仅挂单', es: 'Solo Publicar', ru: 'Только Пост', pt: 'Apenas Postar', ar: 'نشر فقط', tr: 'Sadece Yayınla', ko: '포스트 온리',
  },
  'trade.postOnlyLimitOnly': {
    en: 'Post Only is only available for limit orders', zh: '仅挂单仅适用于限价订单', es: 'Post Only solo está disponible para órdenes límite', ru: 'Post Only доступен только для лимитных ордеров', pt: 'Post Only está disponível apenas para ordens limite', ar: 'نشر فقط متاح فقط للطلبات المحدودة', tr: 'Sadece Yayınla sadece limit emirleri için geçerlidir', ko: '포스트 온리는 리밋 주문에만 사용할 수 있습니다',
  },
  'trade.takeProfit': {
    en: 'Take Profit', zh: '止盈', es: 'Tomar Ganancia', ru: 'Взять Прибыль', pt: 'Tomar Lucro', ar: 'أخذ الربح', tr: 'Kâr Al', ko: '테이크 프로핏',
  },
  'trade.stopLoss': {
    en: 'Stop Loss', zh: '止损', es: 'Detener Pérdida', ru: 'Стоп Лосс', pt: 'Parar Perda', ar: 'إيقاف الخسارة', tr: 'Zarar Durdur', ko: '스탑 로스',
  },
  'trade.ladder': {
    en: 'Ladder', zh: '阶梯', es: 'Escalera', ru: 'Лестница', pt: 'Escada', ar: 'السلم', tr: 'Merdiven', ko: '래더',
  },
  'trade.none': {
    en: 'None', zh: '无', es: 'Ninguno', ru: 'Нет', pt: 'Nenhum', ar: 'لا شيء', tr: 'Hiçbiri', ko: '없음',
  },
  'trade.tp': {
    en: 'TP', zh: '止盈', es: 'TG', ru: 'ВП', pt: 'TL', ar: 'أخذ الربح', tr: 'KA', ko: 'TP',
  },
  'trade.sl': {
    en: 'SL', zh: '止损', es: 'DP', ru: 'СП', pt: 'PP', ar: 'إيقاف الخسارة', tr: 'ZD', ko: 'SL',
  },
  'trade.ld': {
    en: 'LD', zh: '阶梯', es: 'ES', ru: 'ЛЕ', pt: 'ES', ar: 'السلم', tr: 'ME', ko: 'LD',
  },
  'trade.collapse': {
    en: 'Collapse', zh: '折叠', es: 'Colapsar', ru: 'Свернуть', pt: 'Recolher', ar: 'طي', tr: 'Daralt', ko: '접기',
  },
  'trade.expand': {
    en: 'Expand', zh: '展开', es: 'Expandir', ru: 'Развернуть', pt: 'Expandir', ar: 'توسيع', tr: 'Genişlet', ko: '펼치기',
  },
  'trade.triggerPrice': {
    en: 'Trigger Price', zh: '触发价格', es: 'Precio de Disparo', ru: 'Цена Триггера', pt: 'Preço de Gatilho', ar: 'سعر التشغيل', tr: 'Tetik Fiyatı', ko: '트리거 가격',
  },
  'trade.triggerPricePlaceholder': {
    en: '0.00', zh: '0.00', es: '0.00', ru: '0.00', pt: '0.00', ar: '0.00', tr: '0.00', ko: '0.00',
  },
  'trade.ladderConfiguration': {
    en: 'Ladder Configuration', zh: '阶梯配置', es: 'Configuración de Escalera', ru: 'Конфигурация Лестницы', pt: 'Configuração de Escada', ar: 'تكوين السلم', tr: 'Merdiven Yapılandırması', ko: '래더 구성',
  },
  'trade.sellOnly': {
    en: 'Sell Only', zh: '仅卖出', es: 'Solo Venta', ru: 'Только Продажа', pt: 'Apenas Venda', ar: 'بيع فقط', tr: 'Sadece Satış', ko: '판매 전용',
  },
  'trade.levels': {
    en: 'Levels', zh: '级别', es: 'Niveles', ru: 'Уровни', pt: 'Níveis', ar: 'المستويات', tr: 'Seviyeler', ko: '레벨',
  },
  'trade.tiers': {
    en: 'tiers', zh: '层', es: 'niveles', ru: 'уровней', pt: 'níveis', ar: 'مستويات', tr: 'katman', ko: '단계',
  },
  'trade.startPrice': {
    en: 'Start Price', zh: '起始价格', es: 'Precio Inicial', ru: 'Начальная Цена', pt: 'Preço Inicial', ar: 'سعر البداية', tr: 'Başlangıç Fiyatı', ko: '시작 가격',
  },
  'trade.endPrice': {
    en: 'End Price', zh: '结束价格', es: 'Precio Final', ru: 'Конечная Цена', pt: 'Preço Final', ar: 'سعر النهاية', tr: 'Bitiş Fiyatı', ko: '종료 가격',
  },
  'trade.ordersDistributed': {
    en: 'Orders will be distributed evenly across {{count}} price levels', zh: '订单将在{{count}}个价格水平上均匀分布', es: 'Las órdenes se distribuirán uniformemente en {{count}} niveles de precio', ru: 'Заказы будут равномерно распределены по {{count}} ценовым уровням', pt: 'Os pedidos serão distribuídos uniformemente em {{count}} níveis de preço', ar: 'سيتم توزيع الطلبات بالتساوي عبر {{count}} مستويات سعر', tr: 'Siparişler {{count}} fiyat seviyesinde eşit olarak dağıtılacak', ko: '{{count}} 가격 레벨에 걸쳐 주문이 균등하게 분배됩니다',
  },
  'trade.available': {
    en: 'Available', zh: '可用', es: 'Disponible', ru: 'Доступно', pt: 'Disponível', ar: 'متاح', tr: 'Mevcut', ko: '사용 가능',
  },
  'trade.error': {
    en: 'Error', zh: '错误', es: 'Error', ru: 'Ошибка', pt: 'Erro', ar: 'خطأ', tr: 'Hata', ko: '오류',
  },
  'trade.loading': {
    en: 'Loading...', zh: '加载中...', es: 'Cargando...', ru: 'Загрузка...', pt: 'Carregando...', ar: 'جارٍ التحميل...', tr: 'Yükleniyor...', ko: '로딩 중...',
  },
  'trade.expiration': {
    en: 'Expiration', zh: '到期', es: 'Expiración', ru: 'Истечение', pt: 'Expiração', ar: 'انتهاء الصلاحية', tr: 'Son Kullanma', ko: '만료',
  },
  'trade.expirationMin': {
    en: 'Min', zh: '分钟', es: 'Min', ru: 'Мин', pt: 'Min', ar: 'دقيقة', tr: 'Dk', ko: '분',
  },
  'trade.expirationDays': {
    en: 'Days', zh: '天', es: 'Días', ru: 'Дни', pt: 'Dias', ar: 'أيام', tr: 'Gün', ko: '일',
  },
  'trade.placingOrder': {
    en: 'Placing order...', zh: '下单中...', es: 'Colocando orden...', ru: 'Размещение заказа...', pt: 'Colocando pedido...', ar: 'وضع الطلب...', tr: 'Sipariş veriliyor...', ko: '주문 중...',
  },
  'trade.enterAmount': {
    en: 'Enter {{symbol}} amount', zh: '请输入 {{symbol}} 数量', es: 'Introduce la cantidad de {{symbol}}', ru: 'Введите количество {{symbol}}', pt: 'Insira a quantidade de {{symbol}}', ar: 'أدخل كمية {{symbol}}', tr: '{{symbol}} miktarını girin', ko: '{{symbol}} 수량을 입력하세요',
  },
  'trade.enterTriggerPrice': {
    en: 'Please enter a trigger price', zh: '请输入触发价格', es: 'Por favor ingrese un precio de disparo', ru: 'Пожалуйста, введите цену триггера', pt: 'Por favor, insira um preço de gatilho', ar: 'يرجى إدخال سعر التشغيل', tr: 'Lütfen tetik fiyatı girin', ko: '트리거 가격을 입력하세요',
  },
  'trade.enterLadderConfiguration': {
    en: 'Please configure ladder settings', zh: '请配置阶梯设置', es: 'Por favor configure los ajustes de escalera', ru: 'Пожалуйста, настройте параметры лестницы', pt: 'Por favor, configure as definições de escada', ar: 'يرجى تكوين إعدادات السلم', tr: 'Lütfen merdiven ayarlarını yapılandırın', ko: '래더 설정을 구성하세요',
  },
  'trade.enterAmountValue': {
    en: 'Please enter an amount', zh: '请输入数量', es: 'Por favor ingrese una cantidad', ru: 'Пожалуйста, введите количество', pt: 'Por favor, insira uma quantidade', ar: 'يرجى إدخال كمية', tr: 'Lütfen bir miktar girin', ko: '수량을 입력하세요',
  },
  'trade.enterPrice': {
    en: 'Please enter a price', zh: '请输入价格', es: 'Por favor ingrese un precio', ru: 'Пожалуйста, введите цену', pt: 'Por favor, insira um preço', ar: 'يرجى إدخال سعر', tr: 'Lütfen bir fiyat girin', ko: '가격을 입력하세요',
  },
  'trade.orderFailed': {
    en: 'Failed to create order', zh: '创建订单失败', es: 'Error al crear la orden', ru: 'Не удалось создать заказ', pt: 'Falha ao criar pedido', ar: 'فشل في إنشاء الطلب', tr: 'Sipariş oluşturulamadı', ko: '주문 생성 실패',
  },
  'trade.priceHeader': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'trade.amountHeader': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'trade.timeHeader': {
    en: 'Time', zh: '时间', es: 'Tiempo', ru: 'Время', pt: 'Tempo', ar: 'الوقت', tr: 'Zaman', ko: '시간',
  },
  'trade.both': {
    en: 'Both', zh: '两者', es: 'Ambos', ru: 'Оба', pt: 'Ambos', ar: 'كلا', tr: 'Her İkisi', ko: '둘 다',
  },
  'trade.bids': {
    en: 'Bids', zh: '买单', es: 'Ofertas', ru: 'Предложения', pt: 'Ofertas', ar: 'العروض', tr: 'Teklifler', ko: '매수',
  },
  'trade.asks': {
    en: 'Asks', zh: '卖单', es: 'Pedidos', ru: 'Запросы', pt: 'Pedidos', ar: 'الطلبات', tr: 'İstekler', ko: '매도',
  },
  'showcase.volumeLabel': {
    en: 'Vol', zh: '成交量', es: 'Vol', ru: 'Об', pt: 'Vol', ar: 'الحج', tr: 'Hac', ko: '거래량',
  },
  'showcase.tabOrderbook': {
    en: 'Orderbook', zh: '订单簿', es: 'Libro de órdenes', ru: 'Книга заказов', pt: 'Livro de pedidos', ar: 'دفتر الطلبات', tr: 'Emir Defteri', ko: '주문서',
  },
  'showcase.tabChart': {
    en: 'Chart', zh: '图表', es: 'Gráfico', ru: 'График', pt: 'Gráfico', ar: 'الرسم البياني', tr: 'Grafik', ko: '차트',
  },
  'showcase.tabTrades': {
    en: 'Trades', zh: '交易', es: 'Operaciones', ru: 'Сделки', pt: 'Negociações', ar: 'التداولات', tr: 'İşlemler', ko: '거래',
  },
  'showcase.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Итого', pt: 'Total', ar: 'المجموع', tr: 'Toplam', ko: '총계',
  },
  'showcase.fee': {
    en: 'Fee', zh: '手续费', es: 'Comisión', ru: 'Комиссия', pt: 'Taxa', ar: 'الرسوم', tr: 'Ücret', ko: '수수료',
  },
  'showcase.trendingScore': {
    en: 'Trending Score', zh: '趋势评分', es: 'Puntuación de Tendencia', ru: 'Рейтинг Тренда', pt: 'Pontuação de Tendência', ar: 'درجة الاتجاه', tr: 'Trend Skoru', ko: '트렌드 점수',
  },
  'hero.badge': {
    en: 'Trade before CEX listing', zh: '在CEX上市前交易', es: 'Comercia antes del listado en CEX', ru: 'Торгуйте до листинга на CEX', pt: 'Negocie antes do listing na CEX', ar: 'تداول قبل إدراج CEX', tr: 'CEX listelemeden önce ticaret yapın', ko: 'CEX 상장 전에 거래하세요',
  },
  'hero.title.line1': {
    en: 'Trade Trending Tokens', zh: '交易热门代币', es: 'Comercia Tokens Tendencia', ru: 'Торгуйте Трендовыми Токенами', pt: 'Negocie Tokens em Tendência', ar: 'تداول الرموز المميزة الرائجة', tr: 'Trend Tokenları Ticaret Yapın', ko: '트렌드 토큰 거래',
  },
  'hero.title.line2': {
    en: 'Before They Go Mainstream', zh: '在它们流行之前', es: 'Antes de que se Vuelvan Mainstream', ru: 'Прежде Чем Они Станут Мейнстримом', pt: 'Antes de Eles se Tornarem Mainstream', ar: 'قبل أن يصبحوا شائعين', tr: 'Ana Akıma Geçmeden Önce', ko: '메인스트림 되기 전에',
  },
  'hero.subtitle': {
    en: 'Unbound indexes trending pairs from DEX aggregators. Trade early with our decentralized orderbook before tokens hit centralized exchanges.', zh: 'Unbound从DEX聚合器索引热门交易对。在代币进入中心化交易所之前，使用我们的去中心化订单簿进行早期交易。', es: 'Unbound indexa pares de tendencia de agregadores DEX. Comercia temprano con nuestro libro de órdenes descentralizado antes de que los tokens lleguen a los exchanges centralizados.', ru: 'Unbound индексирует трендовые пары из агрегаторов DEX. Торгуйте рано с нашим децентрализованным ордербуком, прежде чем токены попадут на централизованные биржи.', pt: 'Unbound indexa pares em tendência de agregadores DEX. Negocie cedo com nosso livro de ordens descentralizado antes dos tokens chegarem às exchanges centralizadas.', ar: 'يفهرس Unbound الأزواج الرائجة من مجمعات DEX. تداول مبكرًا باستخدام دفتر الطلبات اللامركزي الخاص بنا قبل وصول الرموز المميزة إلى البورصات المركزية.', tr: 'Unbound, DEX toplayıcılarından trend çiftleri indeksler. Tokenler merkezi borsalara ulaşmadan önce merkezi olmayan emir defterimizle erken ticaret yapın.', ko: 'Unbound는 DEX 애그리게이터에서 트렌드 페어를 인덱싱합니다. 토큰이 중앙화된 거래소에 오르기 전에 우리의 탈중앙화된 주문서로 조기 거래하세요.',
  },
  'hero.launchApp': {
    en: 'Launch App', zh: '启动应用', es: 'Lanzar App', ru: 'Запустить Приложение', pt: 'Iniciar App', ar: 'تشغيل التطبيق', tr: 'Uygulamayı Başlat', ko: '앱 실행',
  },
  'hero.loading': {
    en: 'Loading trending pairs...', zh: '正在加载热门交易对...', es: 'Cargando pares de tendencia...', ru: 'Загрузка трендовых пар...', pt: 'Carregando pares em tendência...', ar: 'جارٍ تحميل الأزواج الرائجة...', tr: 'Trend çiftleri yükleniyor...', ko: '트렌드 페어 로딩 중...',
  },
  'hero.error': {
    en: 'Failed to load trending pairs', zh: '加载热门交易对失败', es: 'Error al cargar pares de tendencia', ru: 'Не удалось загрузить трендовые пары', pt: 'Falha ao carregar pares em tendência', ar: 'فشل في تحميل الأزواج الرائجة', tr: 'Trend çiftleri yüklenemedi', ko: '트렌드 페어 로드 실패',
  },
  'hero.noPairs': {
    en: 'No trending pairs available', zh: '没有可用的热门交易对', es: 'No hay pares de tendencia disponibles', ru: 'Нет доступных трендовых пар', pt: 'Nenhum par em tendência disponível', ar: 'لا توجد أزواج رائجة متاحة', tr: 'Trend çifti mevcut değil', ko: '사용 가능한 트렌드 페어 없음',
  },
  'orderbook.selectPair': {
    en: 'Select a pair to view orderbook', zh: '选择交易对查看订单簿', es: 'Selecciona un par para ver el libro de órdenes', ru: 'Выберите пару для просмотра стакана', pt: 'Selecione um par para ver o livro de ordens', ar: 'اختر زوجًا لعرض دفتر الطلبات', tr: 'Emir defterini görüntülemek için bir çift seçin', ko: '주문서를 보려면 페어를 선택하세요',
  },
  'orderbook.title': {
    en: 'Orderbook', zh: '订单簿', es: 'Libro de Órdenes', ru: 'Стакан', pt: 'Livro de Ordens', ar: 'دفتر الطلبات', tr: 'Emir Defteri', ko: '주문서',
  },
  'orderbook.mid': {
    en: 'Mid: ', zh: '中间价: ', es: 'Medio: ', ru: 'Средняя: ', pt: 'Meio: ', ar: 'وسط: ', tr: 'Orta: ', ko: '중간: ',
  },
  'orderbook.spread': {
    en: 'Spread: ', zh: '价差: ', es: 'Diferencial: ', ru: 'Спред: ', pt: 'Spread: ', ar: 'انتشار: ', tr: 'Spread: ', ko: '스프레드: ',
  },
  'orderbook.bid': {
    en: 'Bid: ', zh: '买价: ', es: 'Compra: ', ru: 'Бид: ', pt: 'Compra: ', ar: 'عرض: ', tr: 'Alış: ', ko: '매수: ',
  },
  'orderbook.ask': {
    en: 'Ask: ', zh: '卖价: ', es: 'Venta: ', ru: 'Аск: ', pt: 'Venda: ', ar: 'طلب: ', tr: 'Satış: ', ko: '매도: ',
  },
  'orderbook.asks': {
    en: 'Asks', zh: '卖单', es: 'Ventas', ru: 'Аски', pt: 'Vendas', ar: 'طلبات', tr: 'Satışlar', ko: '매도',
  },
  'orderbook.bids': {
    en: 'Bids', zh: '买单', es: 'Compras', ru: 'Биды', pt: 'Compras', ar: 'عروض', tr: 'Alışlar', ko: '매수',
  },
  'orderbook.buy': {
    en: 'Buy', zh: '买入', es: 'Compra', ru: 'Покупка', pt: 'Compra', ar: 'شراء', tr: 'Alış', ko: '매수',
  },
  'orderbook.sell': {
    en: 'Sell', zh: '卖出', es: 'Venta', ru: 'Продажа', pt: 'Venda', ar: 'بيع', tr: 'Satış', ko: '매도',
  },
  'orderbook.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'سعر', tr: 'Fiyat', ko: '가격',
  },
  'orderbook.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'كمية', tr: 'Miktar', ko: '수량',
  },
  'orderbook.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Итого', pt: 'Total', ar: 'المجموع', tr: 'Toplam', ko: '총계',
  },
  'trending.title': {
    en: 'Trending Pairs', zh: '热门交易对', es: 'Pares Tendencia', ru: 'Трендовые Пары', pt: 'Pares em Tendência', ar: 'الأزواج الرائجة', tr: 'Trend Çiftleri', ko: '트렌드 페어',
  },
  'trending.subtitle': {
    en: 'Hot tokens trending on DEX', zh: 'DEX上热门的代币', es: 'Tokens calientes tendiendo en DEX', ru: 'Горячие токены, трендирующие на DEX', pt: 'Tokens quentes tendendo no DEX', ar: 'رموز مميزة ساخنة تتجه على DEX', tr: 'DEX\'te trend olan sıcak tokenlar', ko: 'DEX에서 트렌드하는 핫 토큰',
  },
  'footer.description': {
    en: 'Decentralized orderbook for trending pairs', zh: '热门交易对的去中心化订单簿', es: 'Libro de órdenes descentralizado para pares de tendencia', ru: 'Децентрализованный стакан для трендовых пар', pt: 'Livro de ordens descentralizado para pares em tendência', ar: 'دفتر طلبات لامركزي للأزواج الرائجة', tr: 'Trend çiftleri için merkezi olmayan emir defteri', ko: '트렌드 페어를 위한 탈중앙화 주문서',
  },
  'footer.copyright': {
    en: '© 2026 Unbound', zh: '© 2026 Unbound', es: '© 2026 Unbound', ru: '© 2026 Unbound', pt: '© 2026 Unbound', ar: '© 2026 Unbound', tr: '© 2026 Unbound', ko: '© 2026 Unbound',
  },
  'footer.privacy': {
    en: 'Privacy Policy', zh: '隐私政策', es: 'Política de privacidad', ru: 'Политика конфиденциальности', pt: 'Política de privacidade', ar: 'سياسة الخصوصية', tr: 'Gizlilik Politikası', ko: '개인정보 처리방침',
  },
  'trade.orderCreatedSuccessTitle': {
    en: 'Order created successfully', zh: '订单创建成功', es: 'Orden creada con éxito', ru: 'Ордер успешно создан', pt: 'Ordem criada com sucesso', ar: 'تم إنشاء الطلب بنجاح', tr: 'Emir başarıyla oluşturuldu', ko: '주문이 성공적으로 생성되었습니다',
  },
  'trade.orderCreatedSuccessDescription': {
    en: 'Your order has been confirmed and added to the orderbook.', zh: '您的订单已确认并已添加到订单簿。', es: 'Tu orden ha sido confirmada y agregada al libro de órdenes.', ru: 'Ваш ордер подтвержден и добавлен в ордербук.', pt: 'Sua ordem foi confirmada e adicionada ao livro de ordens.', ar: 'تم تأكيد طلبك وتمت إضافته إلى دفتر الأوامر.', tr: 'Emir onaylandı ve emir defterine eklendi.', ko: '주문이 확인되어 주문서에 추가되었습니다.',
  },
  'trade.orderFailed': {
    en: 'Failed to create order', zh: '创建订单失败', es: 'Error al crear la orden', ru: 'Не удалось создать ордер', pt: 'Falha ao criar ordem', ar: 'فشل إنشاء الطلب', tr: 'Emir oluşturulamadı', ko: '주문 생성 실패',
  },
  'trade.enterLadderConfiguration': {
    en: 'Please enter ladder configuration', zh: '请输入阶梯配置', es: 'Por favor ingresa la configuración de escalera', ru: 'Пожалуйста, введите конфигурацию лестницы', pt: 'Por favor, insira a configuração da escada', ar: 'يرجى إدخال تكوين السلم', tr: 'Lütfen basamak yapılandırmasını girin', ko: '사다리 구성을 입력하세요',
  },
  'trade.enterAmountValue': {
    en: 'Please enter amount', zh: '请输入数量', es: 'Por favor ingresa la cantidad', ru: 'Пожалуйста, введите количество', pt: 'Por favor, insira a quantidade', ar: 'يرجى إدخال الكمية', tr: 'Lütfen miktarı girin', ko: '수량을 입력하세요',
  },
  'trade.enterPrice': {
    en: 'Please enter price', zh: '请输入价格', es: 'Por favor ingresa el precio', ru: 'Пожалуйста, введите цену', pt: 'Por favor, insira o preço', ar: 'يرجى إدخال السعر', tr: 'Lütfen fiyatı girin', ko: '가격을 입력하세요',
  },
  'trade.sellOnly': {
    en: 'Sell only', zh: '仅卖出', es: 'Solo vender', ru: 'Только продажа', pt: 'Apenas vender', ar: 'للبيع فقط', tr: 'Sadece satış', ko: '판매만',
  },
  'trade.noAsks': {
    en: 'No asks', zh: '没有卖单', es: 'Sin ofertas de venta', ru: 'Нет заявок на продажу', pt: 'Sem ofertas de venda', ar: 'لا توجد أوامر بيع', tr: 'Satış yok', ko: '호가 없음',
  },
  'trade.noBids': {
    en: 'No bids', zh: '没有买单', es: 'Sin ofertas de compra', ru: 'Нет заявок на покупку', pt: 'Sem ofertas de compra', ar: 'لا توجد أوامر شراء', tr: 'Alış yok', ko: '매수 없음',
  },
  'trade.midPrice': {
    en: 'Mid price', zh: '中间价', es: 'Precio medio', ru: 'Средняя цена', pt: 'Preço médio', ar: 'السعر الوسطي', tr: 'Orta fiyat', ko: '중간가',
  },
  'trade.spread': {
    en: 'Spread', zh: '差价', es: 'Spread', ru: 'Спред', pt: 'Spread', ar: 'الفارق', tr: 'Spread', ko: '스프레드',
  },
  'trade.cumulative': {
    en: 'Cumulative', zh: '累计', es: 'Acumulado', ru: 'Накопленный', pt: 'Acumulado', ar: 'التراكمي', tr: 'Kümülatif', ko: '누적',
  },
  'trade.high24h': {
    en: '24h High', zh: '24h 最高', es: 'Máx 24h', ru: '24ч Макс', pt: 'Máx 24h', ar: 'أعلى 24 ساعة', tr: '24s En Yüksek', ko: '24시간 최고가',
  },
  'trade.low24h': {
    en: '24h Low', zh: '24h 最低', es: 'Mín 24h', ru: '24ч Мин', pt: 'Mín 24h', ar: 'أدنى 24 ساعة', tr: '24s En Düşük', ko: '24시간 최저가',
  },
  'trade.volume24h': {
    en: '24h Vol', zh: '24h 成交量', es: 'Vol 24h', ru: 'Объем 24ч', pt: 'Vol 24h', ar: 'حجم 24 ساعة', tr: '24s Hacim', ko: '24시간 거래량',
  },
  'trade.change24h': {
    en: '24h', zh: '24h', es: '24h', ru: '24ч', pt: '24h', ar: '24 ساعة', tr: '24s', ko: '24시간',
  },
  'trade.liquidity': {
    en: 'Liquidity', zh: '流动性', es: 'Liquidez', ru: 'Ликвидность', pt: 'Liquidez', ar: 'السيولة', tr: 'Likidite', ko: '유동성',
  },
  'trade.triggerPrice': {
    en: 'Trigger Price (Required)', zh: '触发价格（必填）', es: 'Precio de activación (Requerido)', ru: 'Триггерная цена (обязательно)', pt: 'Preço de disparo (Obrigatório)', ar: 'سعر الزناد (مطلوب)', tr: 'Tetik Fiyatı (Gerekli)', ko: '트리거 가격 (필수)',
  },
  'trade.triggerPricePlaceholder': {
    en: 'Price that triggers TP/SL', zh: '触发止盈/止损的价格', es: 'Precio que activa TP/SL', ru: 'Цена, которая активирует TP/SL', pt: 'Preço que ativa TP/SL', ar: 'السعر الذي ينشط TP/SL', tr: 'TP/SL tetikleyen fiyat', ko: 'TP/SL을 트리거하는 가격',
  },
  'trade.enterTriggerPrice': {
    en: 'Please enter trigger price', zh: '请输入触发价格', es: 'Por favor ingresa el precio de activación', ru: 'Пожалуйста, введите триггерную цену', pt: 'Por favor, insira o preço de gatilho', ar: 'يرجى إدخال سعر الزناد', tr: 'Lütfen tetik fiyatını girin', ko: '트리거 가격을 입력하세요',
  },
};

function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (stored && LANGUAGE_OPTIONS.some(option => option.code === stored)) {
    return stored;
  }
  if (navigator.language.startsWith('zh')) return 'zh';
  if (navigator.language.startsWith('es')) return 'es';
  if (navigator.language.startsWith('ru')) return 'ru';
  if (navigator.language.startsWith('pt')) return 'pt';
  if (navigator.language.startsWith('ar')) return 'ar';
  if (navigator.language.startsWith('tr')) return 'tr';
  if (navigator.language.startsWith('ko')) return 'ko';
  return DEFAULT_LANGUAGE;
}

function setStoredLanguage(language: LanguageCode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, language);
}

interface TranslationContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, variables?: Record<string, string>) => string;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

function translate(key: string, language: LanguageCode, variables?: Record<string, string>): string {
  const value = translations[key]?.[language] || translations[key]?.en;
  if (!value) {
    return key;
  }

  if (!variables || Object.keys(variables).length === 0) {
    return value;
  }

  return Object.entries(variables).reduce(
    (text, [name, variableValue]) => text.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), variableValue),
    value,
  );
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getStoredLanguage);

  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: (lang: LanguageCode) => setLanguageState(lang),
    t: (key: string, variables?: Record<string, string>) => translate(key, language, variables),
  }), [language]);

  return React.createElement(TranslationContext.Provider, { value }, children);
}

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
