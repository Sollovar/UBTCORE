import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type LanguageCode = 'en' | 'zh' | 'es' | 'ru' | 'pt' | 'ar' | 'tr' | 'ko';

export const LANGUAGE_OPTIONS: { code: LanguageCode; name: string; native: string }[] = [
  { code: 'en', name: 'English',    native: 'English'   },
  { code: 'zh', name: 'Chinese',    native: '中文'       },
  { code: 'es', name: 'Spanish',    native: 'Español'   },
  { code: 'ru', name: 'Russian',    native: 'Русский'   },
  { code: 'ko', name: 'Korean',     native: '한국어'     },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'tr', name: 'Turkish',    native: 'Türkçe'    },
  { code: 'ar', name: 'Arabic',     native: 'العربية'   },
];

const STORAGE_KEY = 'unbound_language';
const DEFAULT_LANGUAGE: LanguageCode = 'en';

const translations: Record<string, Record<LanguageCode, string>> = {
  /* ── Navigation ── */
  'nav.home': {
    en: 'Home', zh: '首页', es: 'Inicio', ru: 'Главная', pt: 'Início', ar: 'الرئيسية', tr: 'Ana Sayfa', ko: '홈',
  },
  'nav.markets': {
    en: 'Markets', zh: '市场', es: 'Mercados', ru: 'Рынки', pt: 'Mercados', ar: 'الأسواق', tr: 'Piyasalar', ko: '마켓',
  },
  'nav.trade': {
    en: 'Trade', zh: '交易', es: 'Comerciar', ru: 'Торговля', pt: 'Negociar', ar: 'تداول', tr: 'Ticaret', ko: '거래',
  },
  'nav.portfolio': {
    en: 'Portfolio', zh: '投资组合', es: 'Portafolio', ru: 'Портфель', pt: 'Portfólio', ar: 'المحفظة', tr: 'Portföy', ko: '포트폴리오',
  },
  'nav.account': {
    en: 'Account', zh: '账户', es: 'Cuenta', ru: 'Аккаунт', pt: 'Conta', ar: 'الحساب', tr: 'Hesap', ko: '계정',
  },
  'nav.settings': {
    en: 'Settings', zh: '设置', es: 'Ajustes', ru: 'Настройки', pt: 'Configurações', ar: 'الإعدادات', tr: 'Ayarlar', ko: '설정',
  },

  /* ── Header ── */
  'header.language': {
    en: 'Language', zh: '语言', es: 'Idioma', ru: 'Язык', pt: 'Idioma', ar: 'اللغة', tr: 'Dil', ko: '언어',
  },
  'header.menu': {
    en: 'Menu', zh: '菜单', es: 'Menú', ru: 'Меню', pt: 'Menu', ar: 'القائمة', tr: 'Menü', ko: '메뉴',
  },

  /* ── Menu / Hamburger ── */
  'menu.connectWallet': {
    en: 'Connect Wallet', zh: '连接钱包', es: 'Conectar billetera', ru: 'Подключить кошелек', pt: 'Conectar carteira', ar: 'ربط المحفظة', tr: 'Cüzdan Bağla', ko: '지갑 연결',
  },
  'menu.resources': {
    en: 'Resources', zh: '资源', es: 'Recursos', ru: 'Ресурсы', pt: 'Recursos', ar: 'الموارد', tr: 'Kaynaklar', ko: '리소스',
  },
  'menu.community': {
    en: 'Community', zh: '社区', es: 'Comunidad', ru: 'Сообщество', pt: 'Comunidade', ar: 'المجتمع', tr: 'Topluluk', ko: '커뮤니티',
  },
  'menu.allSystemsOk': {
    en: 'All systems operational', zh: '所有系统正常运行', es: 'Todos los sistemas operativos', ru: 'Все системы работают', pt: 'Todos os sistemas operacionais', ar: 'جميع الأنظمة تعمل', tr: 'Tüm sistemler çalışıyor', ko: '모든 시스템 정상',
  },
  'menu.earn': {
    en: 'Earn', zh: '赚取', es: 'Ganar', ru: 'Заработок', pt: 'Ganhar', ar: 'الكسب', tr: 'Kazan', ko: '적립',
  },
  'menu.insurance': {
    en: 'Insurance', zh: '保险', es: 'Seguro', ru: 'Страхование', pt: 'Seguro', ar: 'التأمين', tr: 'Sigorta', ko: '보험',
  },
  'menu.docs': {
    en: 'Docs', zh: '文档', es: 'Docs', ru: 'Документация', pt: 'Docs', ar: 'الوثائق', tr: 'Dokümanlar', ko: '문서',
  },
  'menu.blog': {
    en: 'Blog', zh: '博客', es: 'Blog', ru: 'Блог', pt: 'Blog', ar: 'المدونة', tr: 'Blog', ko: '블로그',
  },
  'menu.support': {
    en: 'Support', zh: '支持', es: 'Soporte', ru: 'Поддержка', pt: 'Suporte', ar: 'الدعم', tr: 'Destek', ko: '지원',
  },
  'menu.new': {
    en: 'New', zh: '新', es: 'Nuevo', ru: 'Новое', pt: 'Novo', ar: 'جديد', tr: 'Yeni', ko: '새로운',
  },

  /* ── Network ── */
  'network.select': {
    en: 'Select Network', zh: '选择网络', es: 'Seleccionar red', ru: 'Выбрать сеть', pt: 'Selecionar rede', ar: 'اختر الشبكة', tr: 'Ağ Seç', ko: '네트워크 선택',
  },
  'network.switching': {
    en: 'Switching…', zh: '切换中…', es: 'Cambiando…', ru: 'Переключение…', pt: 'Trocando…', ar: 'جاري التبديل…', tr: 'Değiştiriliyor…', ko: '전환 중…',
  },

  /* ── Common ── */
  'common.close': {
    en: 'Close', zh: '关闭', es: 'Cerrar', ru: 'Закрыть', pt: 'Fechar', ar: 'إغلاق', tr: 'Kapat', ko: '닫기',
  },
  'common.cancel': {
    en: 'Cancel', zh: '取消', es: 'Cancelar', ru: 'Отмена', pt: 'Cancelar', ar: 'إلغاء', tr: 'İptal', ko: '취소',
  },
  'common.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Al', ko: '매수',
  },
  'common.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '매도',
  },
  'common.connect': {
    en: 'Connect', zh: '连接', es: 'Conectar', ru: 'Подключить', pt: 'Conectar', ar: 'اتصال', tr: 'Bağlan', ko: '연결',
  },

  /* ── Settings ── */
  'settings.title': {
    en: 'Settings', zh: '设置', es: 'Ajustes', ru: 'Настройки', pt: 'Configurações', ar: 'الإعدادات', tr: 'Ayarlar', ko: '설정',
  },
  'settings.appearance': {
    en: 'Appearance', zh: '外观', es: 'Apariencia', ru: 'Внешний вид', pt: 'Aparência', ar: 'المظهر', tr: 'Görünüm', ko: '모양',
  },
  'settings.darkMode': {
    en: 'Dark Mode', zh: '深色模式', es: 'Modo oscuro', ru: 'Тёмный режим', pt: 'Modo escuro', ar: 'الوضع الداكن', tr: 'Karanlık Mod', ko: '다크 모드',
  },
  'settings.darkMode.subDark': {
    en: 'Currently dark', zh: '当前为深色', es: 'Actualmente oscuro', ru: 'Сейчас тёмный', pt: 'Atualmente escuro', ar: 'داكن حالياً', tr: 'Şu anda karanlık', ko: '현재 다크',
  },
  'settings.darkMode.subLight': {
    en: 'Currently light', zh: '当前为浅色', es: 'Actualmente claro', ru: 'Сейчас светлый', pt: 'Atualmente claro', ar: 'فاتح حالياً', tr: 'Şu anda açık', ko: '현재 라이트',
  },
  'settings.hideBalances': {
    en: 'Hide Balances', zh: '隐藏余额', es: 'Ocultar saldos', ru: 'Скрыть балансы', pt: 'Ocultar saldos', ar: 'إخفاء الأرصدة', tr: 'Bakiyeleri Gizle', ko: '잔액 숨기기',
  },
  'settings.hideBalances.sub': {
    en: 'Mask portfolio values', zh: '遮盖投资组合数值', es: 'Enmascarar valores de cartera', ru: 'Скрыть значения портфеля', pt: 'Mascarar valores do portfólio', ar: 'إخفاء قيم المحفظة', tr: 'Portföy değerlerini maskele', ko: '포트폴리오 값 마스킹',
  },
  'settings.headerDisplay': {
    en: 'Header Display', zh: '标题显示', es: 'Pantalla de encabezado', ru: 'Отображение заголовка', pt: 'Exibição do cabeçalho', ar: 'عرض الرأس', tr: 'Başlık Görünümü', ko: '헤더 표시',
  },
  'settings.liveGas': {
    en: 'Live Gas Price', zh: '实时 Gas 价格', es: 'Precio de gas en tiempo real', ru: 'Цена газа в реальном времени', pt: 'Preço de gás ao vivo', ar: 'سعر الغاز المباشر', tr: 'Canlı Gas Fiyatı', ko: '실시간 가스 가격',
  },
  'settings.liveGas.sub': {
    en: 'Show real-time gas in the header', zh: '在标题中显示实时 Gas', es: 'Mostrar gas en tiempo real en el encabezado', ru: 'Показывать газ в заголовке', pt: 'Mostrar gás em tempo real no cabeçalho', ar: 'إظهار الغاز في الوقت الفعلي في الرأس', tr: 'Başlıkta gerçek zamanlı gaz göster', ko: '헤더에 실시간 가스 표시',
  },
  'settings.liveBlock': {
    en: 'Live Block Number', zh: '实时区块编号', es: 'Número de bloque en vivo', ru: 'Номер блока в реальном времени', pt: 'Número de bloco ao vivo', ar: 'رقم الكتلة المباشر', tr: 'Canlı Blok Numarası', ko: '실시간 블록 번호',
  },
  'settings.liveBlock.sub': {
    en: 'Show current block in the header', zh: '在标题中显示当前区块', es: 'Mostrar bloque actual en el encabezado', ru: 'Показывать блок в заголовке', pt: 'Mostrar bloco atual no cabeçalho', ar: 'إظهار الكتلة الحالية في الرأس', tr: 'Başlıkta geçerli bloğu göster', ko: '헤더에 현재 블록 표시',
  },
  'settings.trading': {
    en: 'Trading', zh: '交易', es: 'Trading', ru: 'Торговля', pt: 'Trading', ar: 'التداول', tr: 'Trading', ko: '트레이딩',
  },
  'settings.slippage': {
    en: 'Slippage Tolerance', zh: '滑点容差', es: 'Tolerancia al deslizamiento', ru: 'Допуск проскальзывания', pt: 'Tolerância ao deslizamento', ar: 'تسامح الانزلاق', tr: 'Kayma Toleransı', ko: '슬리피지 허용치',
  },
  'settings.slippage.custom': {
    en: 'Custom', zh: '自定义', es: 'Personalizado', ru: 'Своё', pt: 'Personalizado', ar: 'مخصص', tr: 'Özel', ko: '커스텀',
  },
  'settings.orderConfirm': {
    en: 'Order Confirmation', zh: '订单确认', es: 'Confirmación de orden', ru: 'Подтверждение ордера', pt: 'Confirmação de ordem', ar: 'تأكيد الطلب', tr: 'Sipariş Onayı', ko: '주문 확인',
  },
  'settings.orderConfirm.always': {
    en: 'Always', zh: '始终', es: 'Siempre', ru: 'Всегда', pt: 'Sempre', ar: 'دائماً', tr: 'Her Zaman', ko: '항상',
  },
  'settings.orderConfirm.large': {
    en: 'Large orders only', zh: '仅大额订单', es: 'Solo órdenes grandes', ru: 'Только большие ордера', pt: 'Apenas ordens grandes', ar: 'الطلبات الكبيرة فقط', tr: 'Yalnızca büyük emirler', ko: '대형 주문만',
  },
  'settings.orderConfirm.never': {
    en: 'Never', zh: '从不', es: 'Nunca', ru: 'Никогда', pt: 'Nunca', ar: 'أبداً', tr: 'Asla', ko: '안함',
  },
  'settings.advancedMode': {
    en: 'Advanced Mode', zh: '高级模式', es: 'Modo avanzado', ru: 'Расширенный режим', pt: 'Modo avançado', ar: 'الوضع المتقدم', tr: 'Gelişmiş Mod', ko: '고급 모드',
  },
  'settings.advancedMode.sub': {
    en: 'Show extra order options', zh: '显示额外订单选项', es: 'Mostrar opciones adicionales de orden', ru: 'Показывать дополнительные опции', pt: 'Mostrar opções extras de ordem', ar: 'إظهار خيارات إضافية للطلب', tr: 'Ekstra emir seçeneklerini göster', ko: '추가 주문 옵션 표시',
  },
  'settings.notifications': {
    en: 'Notifications', zh: '通知', es: 'Notificaciones', ru: 'Уведомления', pt: 'Notificações', ar: 'الإشعارات', tr: 'Bildirimler', ko: '알림',
  },
  'settings.pushNotifs': {
    en: 'Push Notifications', zh: '推送通知', es: 'Notificaciones push', ru: 'Push-уведомления', pt: 'Notificações push', ar: 'الإشعارات الفورية', tr: 'Anlık Bildirimler', ko: '푸시 알림',
  },
  'settings.pushNotifs.sub': {
    en: 'Order fills, alerts', zh: '订单成交、提醒', es: 'Llenados de orden, alertas', ru: 'Исполнение ордеров, оповещения', pt: 'Preenchimento de ordens, alertas', ar: 'تنفيذ الطلبات والتنبيهات', tr: 'Emir doldurmalar, uyarılar', ko: '주문 체결, 알림',
  },
  'settings.priceAlerts': {
    en: 'Price Alerts', zh: '价格提醒', es: 'Alertas de precio', ru: 'Ценовые оповещения', pt: 'Alertas de preço', ar: 'تنبيهات الأسعار', tr: 'Fiyat Uyarıları', ko: '가격 알림',
  },
  'settings.priceAlerts.sub': {
    en: 'When target price is hit', zh: '达到目标价格时', es: 'Cuando se alcanza el precio objetivo', ru: 'При достижении целевой цены', pt: 'Quando o preço alvo é atingido', ar: 'عند الوصول إلى السعر المستهدف', tr: 'Hedef fiyata ulaşıldığında', ko: '목표 가격 도달 시',
  },
  'settings.orderUpdates': {
    en: 'Order Updates', zh: '订单更新', es: 'Actualizaciones de orden', ru: 'Обновления ордеров', pt: 'Atualizações de ordem', ar: 'تحديثات الطلب', tr: 'Emir Güncellemeleri', ko: '주문 업데이트',
  },
  'settings.orderUpdates.sub': {
    en: 'Fill, cancel, and reject', zh: '成交、取消和拒绝', es: 'Relleno, cancelación y rechazo', ru: 'Исполнение, отмена и отклонение', pt: 'Preenchimento, cancelamento e rejeição', ar: 'التنفيذ والإلغاء والرفض', tr: 'Doldurma, iptal ve red', ko: '체결, 취소, 거부',
  },
  'settings.soundAlerts': {
    en: 'Sound Alerts', zh: '声音提醒', es: 'Alertas sonoras', ru: 'Звуковые оповещения', pt: 'Alertas sonoros', ar: 'تنبيهات صوتية', tr: 'Ses Uyarıları', ko: '사운드 알림',
  },
  'settings.soundAlerts.sub': {
    en: 'Audio on order fill', zh: '订单成交时播放声音', es: 'Audio al llenar orden', ru: 'Звук при исполнении ордера', pt: 'Áudio ao preencher ordem', ar: 'صوت عند تنفيذ الطلب', tr: 'Emir doldurmada ses çal', ko: '주문 체결 시 소리',
  },
  'settings.security': {
    en: 'Security', zh: '安全', es: 'Seguridad', ru: 'Безопасность', pt: 'Segurança', ar: 'الأمان', tr: 'Güvenlik', ko: '보안',
  },
  'settings.connectedApps': {
    en: 'Connected Apps', zh: '已连接应用', es: 'Aplicaciones conectadas', ru: 'Подключённые приложения', pt: 'Aplicativos conectados', ar: 'التطبيقات المتصلة', tr: 'Bağlı Uygulamalar', ko: '연결된 앱',
  },
  'settings.connectedApps.sub': {
    en: 'Manage dApp permissions', zh: '管理 dApp 权限', es: 'Gestionar permisos de dApp', ru: 'Управление разрешениями dApp', pt: 'Gerenciar permissões de dApp', ar: 'إدارة أذونات dApp', tr: 'dApp izinlerini yönet', ko: 'dApp 권한 관리',
  },

  /* ── Trade ── */
  'trade.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Al', ko: '매수',
  },
  'trade.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '매도',
  },
  'trade.limit': {
    en: 'Limit', zh: '限价', es: 'Límite', ru: 'Лимит', pt: 'Limit', ar: 'حد', tr: 'Limit', ko: '지정가',
  },
  'trade.market': {
    en: 'Market', zh: '市价', es: 'Mercado', ru: 'Маркет', pt: 'Mercado', ar: 'سوق', tr: 'Piyasa', ko: '시장가',
  },
  'trade.ladder': {
    en: 'Ladder', zh: '阶梯', es: 'Escalera', ru: 'Лестница', pt: 'Escada', ar: 'سلم', tr: 'Basamak', ko: '사다리',
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
  'trade.size': {
    en: 'Size', zh: '数量', es: 'Tamaño', ru: 'Размер', pt: 'Tamanho', ar: 'الحجم', tr: 'Boyut', ko: '크기',
  },
  'trade.availToTrade': {
    en: 'Avail. to Trade', zh: '可用于交易', es: 'Disponible para operar', ru: 'Доступно для торговли', pt: 'Disponível para negociar', ar: 'متاح للتداول', tr: 'Ticarete Mevcut', ko: '거래 가능',
  },
  'trade.placeOrder': {
    en: 'Place Order', zh: '下单', es: 'Colocar orden', ru: 'Разместить ордер', pt: 'Fazer pedido', ar: 'تقديم طلب', tr: 'Emir Ver', ko: '주문하기',
  },
  'trade.placingOrder': {
    en: 'Placing order…', zh: '下单中…', es: 'Colocando orden…', ru: 'Размещение ордера…', pt: 'Colocando pedido…', ar: 'وضع الطلب…', tr: 'Emir veriliyor…', ko: '주문 중…',
  },
  'trade.orderPlaced': {
    en: 'Order placed!', zh: '下单成功！', es: '¡Orden colocada!', ru: 'Ордер размещён!', pt: 'Pedido feito!', ar: 'تم تقديم الطلب!', tr: 'Emir verildi!', ko: '주문 완료!',
  },
  'trade.connectWallet': {
    en: 'Connect Wallet', zh: '连接钱包', es: 'Conectar billetera', ru: 'Подключить кошелек', pt: 'Conectar carteira', ar: 'ربط المحفظة', tr: 'Cüzdan Bağla', ko: '지갑 연결',
  },
  'trade.startPrice': {
    en: 'Start Price', zh: '起始价格', es: 'Precio inicial', ru: 'Начальная цена', pt: 'Preço inicial', ar: 'سعر البداية', tr: 'Başlangıç Fiyatı', ko: '시작 가격',
  },
  'trade.endPrice': {
    en: 'End Price', zh: '结束价格', es: 'Precio final', ru: 'Конечная цена', pt: 'Preço final', ar: 'سعر النهاية', tr: 'Bitiş Fiyatı', ko: '종료 가격',
  },
  'trade.levels': {
    en: 'Levels', zh: '级别', es: 'Niveles', ru: 'Уровни', pt: 'Níveis', ar: 'المستويات', tr: 'Seviyeler', ko: '레벨',
  },
  'trade.postOnly': {
    en: 'Post Only', zh: '只挂单', es: 'Solo publicar', ru: 'Только размещение', pt: 'Apenas postar', ar: 'النشر فقط', tr: 'Sadece Gönder', ko: '포스트 온리',
  },
  'trade.reduceOnly': {
    en: 'Reduce Only', zh: '只减仓', es: 'Solo reducir', ru: 'Только сокращение', pt: 'Apenas reduzir', ar: 'التقليل فقط', tr: 'Sadece Azalt', ko: '축소만',
  },
  'trade.orderValue': {
    en: 'Order Value', zh: '订单价值', es: 'Valor del pedido', ru: 'Стоимость ордера', pt: 'Valor do pedido', ar: 'قيمة الطلب', tr: 'Emir Değeri', ko: '주문 가치',
  },
  'trade.slippage': {
    en: 'Slippage', zh: '滑点', es: 'Deslizamiento', ru: 'Проскальзывание', pt: 'Slippage', ar: 'الانزلاق', tr: 'Kayma', ko: '슬리피지',
  },
  'trade.chart': {
    en: 'Chart', zh: '图表', es: 'Gráfico', ru: 'График', pt: 'Gráfico', ar: 'الرسم البياني', tr: 'Grafik', ko: '차트',
  },
  'trade.orderBook': {
    en: 'Order Book', zh: '订单簿', es: 'Libro de órdenes', ru: 'Книга ордеров', pt: 'Livro de ordens', ar: 'دفتر الطلبات', tr: 'Emir Defteri', ko: '호가창',
  },
  'trade.trades': {
    en: 'Trades', zh: '成交', es: 'Operaciones', ru: 'Сделки', pt: 'Negociações', ar: 'الصفقات', tr: 'İşlemler', ko: '거래',
  },
  'trade.info': {
    en: 'Info', zh: '信息', es: 'Info', ru: 'Инфо', pt: 'Info', ar: 'معلومات', tr: 'Bilgi', ko: '정보',
  },
  'trade.more': {
    en: 'More', zh: '更多', es: 'Más', ru: 'Ещё', pt: 'Mais', ar: 'المزيد', tr: 'Daha Fazla', ko: '더보기',
  },

  /* ── Orders tabs ── */
  'orders.tab.open': {
    en: 'Open Orders', zh: '未成交订单', es: 'Órdenes abiertas', ru: 'Открытые ордера', pt: 'Ordens abertas', ar: 'الأوامر المفتوحة', tr: 'Açık Emirler', ko: '미체결 주문',
  },
  'orders.tab.history': {
    en: 'Order History', zh: '历史订单', es: 'Historial de órdenes', ru: 'История ордеров', pt: 'Histórico de ordens', ar: 'سجل الطلبات', tr: 'Emir Geçmişi', ko: '주문 내역',
  },
  'orders.tab.tradeHistory': {
    en: 'Trade History', zh: '交易历史', es: 'Historial de operaciones', ru: 'История сделок', pt: 'Histórico de negócios', ar: 'سجل التداول', tr: 'İşlem Geçmişi', ko: '거래 내역',
  },
  'orders.col.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'orders.col.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'orders.col.filled': {
    en: 'Filled', zh: '已成交', es: 'Completado', ru: 'Исполнено', pt: 'Preenchido', ar: 'مُنفَّذ', tr: 'Dolduruldu', ko: '체결됨',
  },
  'orders.col.qty': {
    en: 'Qty', zh: '数量', es: 'Cant.', ru: 'Кол-во', pt: 'Qtd.', ar: 'الكمية', tr: 'Adet', ko: '수량',
  },
  'orders.col.estFee': {
    en: 'Est. Fee', zh: '预估手续费', es: 'Tarifa est.', ru: 'Оцен. комиссия', pt: 'Taxa est.', ar: 'الرسوم التقديرية', tr: 'Tahmini Ücret', ko: '예상 수수료',
  },
  'orders.col.time': {
    en: 'Time', zh: '时间', es: 'Tiempo', ru: 'Время', pt: 'Tempo', ar: 'الوقت', tr: 'Zaman', ko: '시간',
  },
  'orders.cancel': {
    en: 'Cancel', zh: '取消', es: 'Cancelar', ru: 'Отмена', pt: 'Cancelar', ar: 'إلغاء', tr: 'İptal', ko: '취소',
  },
  'orders.cancelling': {
    en: '…', zh: '…', es: '…', ru: '…', pt: '…', ar: '…', tr: '…', ko: '…',
  },
  'orders.side.buy': {
    en: 'Buy', zh: '买入', es: 'Comprar', ru: 'Купить', pt: 'Comprar', ar: 'شراء', tr: 'Al', ko: '매수',
  },
  'orders.side.sell': {
    en: 'Sell', zh: '卖出', es: 'Vender', ru: 'Продать', pt: 'Vender', ar: 'بيع', tr: 'Sat', ko: '매도',
  },
  'orders.empty.openOrders': {
    en: 'open orders', zh: '未成交订单', es: 'órdenes abiertas', ru: 'открытые ордера', pt: 'ordens abertas', ar: 'الأوامر المفتوحة', tr: 'açık emirler', ko: '미체결 주문',
  },
  'orders.empty.orderHistory': {
    en: 'order history', zh: '历史订单', es: 'historial de órdenes', ru: 'история ордеров', pt: 'histórico de ordens', ar: 'سجل الطلبات', tr: 'emir geçmişi', ko: '주문 내역',
  },
  'orders.empty.tradeHistory': {
    en: 'trade history', zh: '交易历史', es: 'historial de operaciones', ru: 'история сделок', pt: 'histórico de negócios', ar: 'سجل التداول', tr: 'işlem geçmişi', ko: '거래 내역',
  },

  /* ── Account page ── */
  'account.noWallet.title': {
    en: 'No wallet connected', zh: '未连接钱包', es: 'Sin billetera conectada', ru: 'Кошелёк не подключён', pt: 'Nenhuma carteira conectada', ar: 'لا توجد محفظة متصلة', tr: 'Cüzdan bağlı değil', ko: '지갑 미연결',
  },
  'account.noWallet.sub': {
    en: 'Connect your wallet to view your profile, balances and trade history.', zh: '连接钱包以查看您的个人资料、余额和交易历史。', es: 'Conecta tu billetera para ver tu perfil, saldos e historial de operaciones.', ru: 'Подключите кошелёк, чтобы просматривать профиль, балансы и историю сделок.', pt: 'Conecte sua carteira para ver seu perfil, saldos e histórico de negócios.', ar: 'قم بتوصيل محفظتك لعرض ملفك الشخصي وأرصدتك وسجل تداولاتك.', tr: 'Profilinizi, bakiyelerinizi ve işlem geçmişinizi görmek için cüzdanınızı bağlayın.', ko: '프로필, 잔액, 거래 내역을 보려면 지갑을 연결하세요.',
  },
  'account.connectWallet': {
    en: 'Connect Wallet', zh: '连接钱包', es: 'Conectar billetera', ru: 'Подключить кошелёк', pt: 'Conectar carteira', ar: 'ربط المحفظة', tr: 'Cüzdan Bağla', ko: '지갑 연결',
  },
  'account.tab.assets': {
    en: 'Assets', zh: '资产', es: 'Activos', ru: 'Активы', pt: 'Ativos', ar: 'الأصول', tr: 'Varlıklar', ko: '자산',
  },
  'account.tab.history': {
    en: 'History', zh: '历史', es: 'Historial', ru: 'История', pt: 'Histórico', ar: 'التاريخ', tr: 'Geçmiş', ko: '내역',
  },
  'account.totalPortfolio': {
    en: 'Total Portfolio', zh: '总资产', es: 'Portafolio total', ru: 'Общий портфель', pt: 'Portfólio total', ar: 'إجمالي المحفظة', tr: 'Toplam Portföy', ko: '총 포트폴리오',
  },
  'account.deposit': {
    en: 'Deposit', zh: '充值', es: 'Depositar', ru: 'Пополнить', pt: 'Depositar', ar: 'إيداع', tr: 'Yatır', ko: '입금',
  },
  'account.withdraw': {
    en: 'Withdraw', zh: '提现', es: 'Retirar', ru: 'Вывести', pt: 'Sacar', ar: 'سحب', tr: 'Çek', ko: '출금',
  },

  /* ── Markets ── */
  'markets.search': {
    en: 'Search markets…', zh: '搜索市场…', es: 'Buscar mercados…', ru: 'Поиск рынков…', pt: 'Pesquisar mercados…', ar: 'البحث في الأسواق…', tr: 'Piyasaları ara…', ko: '마켓 검색…',
  },
  'markets.tab.all': {
    en: 'All', zh: '全部', es: 'Todo', ru: 'Все', pt: 'Todos', ar: 'الكل', tr: 'Tümü', ko: '전체',
  },
  'markets.tab.favorites': {
    en: 'Favorites', zh: '自选', es: 'Favoritos', ru: 'Избранное', pt: 'Favoritos', ar: 'المفضلة', tr: 'Favoriler', ko: '관심',
  },
  'markets.tab.gainers': {
    en: 'Gainers', zh: '涨幅榜', es: 'Ganadores', ru: 'Растущие', pt: 'Ganhadores', ar: 'الرابحون', tr: 'Kazananlar', ko: '상승',
  },
  'markets.tab.losers': {
    en: 'Losers', zh: '跌幅榜', es: 'Perdedores', ru: 'Падающие', pt: 'Perdedores', ar: 'الخاسرون', tr: 'Kaybedenler', ko: '하락',
  },
  'markets.volume': {
    en: 'Vol', zh: '量', es: 'Vol', ru: 'Объем', pt: 'Vol', ar: 'حجم', tr: 'Hacim', ko: '거래량',
  },
  'markets.liquidity': {
    en: 'Liq', zh: '流动性', es: 'Liq', ru: 'Ликв.', pt: 'Liq', ar: 'سيولة', tr: 'Lik.', ko: '유동성',
  },
  'markets.noResults': {
    en: 'No pairs found', zh: '未找到交易对', es: 'No se encontraron pares', ru: 'Пары не найдены', pt: 'Nenhum par encontrado', ar: 'لم يُعثر على أزواج', tr: 'Çift bulunamadı', ko: '페어 없음',
  },

  /* ── Portfolio page ── */
  'portfolio.noWallet.sub': {
    en: 'Connect your wallet to view your portfolio balance and asset breakdown.',
    zh: '连接钱包以查看您的投资组合余额和资产明细。',
    es: 'Conecta tu billetera para ver el saldo de tu portafolio y el desglose de activos.',
    ru: 'Подключите кошелёк для просмотра баланса портфеля и разбивки активов.',
    pt: 'Conecte sua carteira para ver o saldo do portfólio e o detalhamento de ativos.',
    ar: 'قم بتوصيل محفظتك لعرض رصيد محفظتك وتفاصيل الأصول.',
    tr: 'Portföy bakiyenizi ve varlık dağılımınızı görmek için cüzdanınızı bağlayın.',
    ko: '포트폴리오 잔액과 자산 내역을 보려면 지갑을 연결하세요.',
  },
  'portfolio.totalValue': {
    en: 'Total Portfolio Value', zh: '总资产价值', es: 'Valor total del portafolio', ru: 'Общая стоимость портфеля', pt: 'Valor total do portfólio', ar: 'إجمالي قيمة المحفظة', tr: 'Toplam Portföy Değeri', ko: '총 포트폴리오 가치',
  },
  'portfolio.fetchError': {
    en: 'Unable to fetch portfolio', zh: '无法获取投资组合', es: 'No se puede obtener el portafolio', ru: 'Не удалось загрузить портфель', pt: 'Não foi possível buscar portfólio', ar: 'تعذر جلب المحفظة', tr: 'Portföy alınamadı', ko: '포트폴리오를 불러올 수 없음',
  },
  'portfolio.retry': {
    en: 'Retry', zh: '重试', es: 'Reintentar', ru: 'Повторить', pt: 'Tentar novamente', ar: 'إعادة المحاولة', tr: 'Tekrar Dene', ko: '재시도',
  },
  'portfolio.holdingsError': {
    en: 'Could not load holdings', zh: '无法加载持仓', es: 'No se pudieron cargar los activos', ru: 'Не удалось загрузить активы', pt: 'Não foi possível carregar ativos', ar: 'تعذر تحميل الحيازات', tr: 'Varlıklar yüklenemedi', ko: '보유 자산을 불러올 수 없음',
  },
  'portfolio.noHoldings': {
    en: 'No holdings found on this network', zh: '此网络上未找到持仓', es: 'No se encontraron activos en esta red', ru: 'В этой сети не найдено активов', pt: 'Nenhum ativo encontrado nesta rede', ar: 'لم يُعثر على حيازات في هذه الشبكة', tr: 'Bu ağda varlık bulunamadı', ko: '이 네트워크에서 보유 자산 없음',
  },
  'portfolio.holdings': {
    en: 'Holdings', zh: '持仓', es: 'Activos', ru: 'Активы', pt: 'Ativos', ar: 'الحيازات', tr: 'Varlıklar', ko: '보유 자산',
  },
  'portfolio.today': {
    en: 'today', zh: '今日', es: 'hoy', ru: 'сегодня', pt: 'hoje', ar: 'اليوم', tr: 'bugün', ko: '오늘',
  },
  'portfolio.allTime': {
    en: 'All-time', zh: '历史总计', es: 'Todo el tiempo', ru: 'За всё время', pt: 'Todo o tempo', ar: 'كل الوقت', tr: 'Tüm Zamanlar', ko: '전체 기간',
  },
  'portfolio.costBasis': {
    en: 'Cost basis', zh: '成本基础', es: 'Base de costo', ru: 'Базовая стоимость', pt: 'Base de custo', ar: 'أساس التكلفة', tr: 'Maliyet Bazı', ko: '매입 원가',
  },
  'portfolio.unrealizedPnl': {
    en: 'Unrealized PnL', zh: '未实现盈亏', es: 'PnL no realizado', ru: 'Нереализованный PnL', pt: 'PnL não realizado', ar: 'الربح/الخسارة غير المحققة', tr: 'Gerçekleşmemiş K/Z', ko: '미실현 손익',
  },

  /* ── Landing page ── */
  'landing.heroTitle': {
    en: 'The Frontier of', zh: '链上交易的', es: 'La Frontera del', ru: 'Рубеж', pt: 'A Fronteira do', ar: 'حدود', tr: 'Sınırı', ko: '온체인 트레이딩의',
  },
  'landing.heroHighlight': {
    en: 'On-chain Trading', zh: '新前沿', es: 'Trading On-Chain', ru: 'Торговли в сети', pt: 'Trading On-Chain', ar: 'التداول على السلسلة', tr: 'Zincir Üstü Ticaret', ko: '새 경계',
  },
  'landing.heroSub': {
    en: 'Built on advanced on-chain tech for efficiency, scale, and real privacy.',
    zh: '基于先进的链上技术，实现高效、可扩展和真正的隐私。',
    es: 'Construido sobre tecnología avanzada on-chain para eficiencia, escala y privacidad real.',
    ru: 'Построено на передовых технологиях блокчейна для эффективности, масштаба и реальной конфиденциальности.',
    pt: 'Construído com tecnologia on-chain avançada para eficiência, escala e privacidade real.',
    ar: 'مبني على تقنية متقدمة على السلسلة لتحقيق الكفاءة والنطاق والخصوصية الحقيقية.',
    tr: 'Verimlilik, ölçek ve gerçek gizlilik için gelişmiş zincir üstü teknoloji üzerine inşa edilmiştir.',
    ko: '효율성, 확장성, 실질적인 프라이버시를 위한 고급 온체인 기술 기반.',
  },
  'landing.startTrading': {
    en: 'Start Trading', zh: '开始交易', es: 'Comenzar a operar', ru: 'Начать торговлю', pt: 'Começar a negociar', ar: 'ابدأ التداول', tr: 'Ticarete Başla', ko: '거래 시작',
  },
  'landing.learnMore': {
    en: 'Learn More', zh: '了解更多', es: 'Saber más', ru: 'Узнать больше', pt: 'Saiba mais', ar: 'اعرف أكثر', tr: 'Daha Fazla', ko: '더 알아보기',
  },
  'landing.launchApp': {
    en: 'Launch App', zh: '启动应用', es: 'Lanzar App', ru: 'Запустить приложение', pt: 'Lançar App', ar: 'تشغيل التطبيق', tr: 'Uygulamayı Başlat', ko: '앱 실행',
  },
  'landing.startTradingNow': {
    en: 'Start Trading Now', zh: '立即开始交易', es: 'Comienza a operar ahora', ru: 'Начать торговлю сейчас', pt: 'Comece a negociar agora', ar: 'ابدأ التداول الآن', tr: 'Şimdi Ticarete Başla', ko: '지금 거래 시작',
  },
  'landing.stat.assets': {
    en: 'Assets', zh: '资产', es: 'Activos', ru: 'Активы', pt: 'Ativos', ar: 'الأصول', tr: 'Varlıklar', ko: '자산',
  },
  'landing.stat.openInterest': {
    en: 'Open Interest', zh: '未平仓量', es: 'Interés abierto', ru: 'Открытый интерес', pt: 'Interesse em aberto', ar: 'الاهتمام المفتوح', tr: 'Açık Faiz', ko: '미결제 약정',
  },
  'landing.stat.users': {
    en: 'Users', zh: '用户', es: 'Usuarios', ru: 'Пользователи', pt: 'Usuários', ar: 'المستخدمون', tr: 'Kullanıcılar', ko: '사용자',
  },
  'landing.stat.volume': {
    en: 'Total Trading Volume', zh: '总交易量', es: 'Volumen total de trading', ru: 'Общий объём торгов', pt: 'Volume total de negócios', ar: 'إجمالي حجم التداول', tr: 'Toplam İşlem Hacmi', ko: '총 거래량',
  },
  'landing.why.label': {
    en: 'Why Choose Us', zh: '为什么选择我们', es: '¿Por qué elegirnos?', ru: 'Почему мы', pt: 'Por que nos escolher', ar: 'لماذا تختارنا', tr: 'Neden Bizi Seçmelisiniz', ko: '왜 선택하나요',
  },
  'landing.why.title': {
    en: 'Why UNBOUND', zh: '为何选择 UNBOUND', es: 'Por qué UNBOUND', ru: 'Почему UNBOUND', pt: 'Por que UNBOUND', ar: 'لماذا UNBOUND', tr: 'Neden UNBOUND', ko: '왜 UNBOUND인가',
  },
  'landing.why.universal.title': { en: 'Universal Access', zh: '普惠访问', es: 'Acceso universal', ru: 'Универсальный доступ', pt: 'Acesso universal', ar: 'الوصول الشامل', tr: 'Evrensel Erişim', ko: '보편적 접근' },
  'landing.why.universal.desc': {
    en: 'Trade any asset in every market. No restrictions, no borders.',
    zh: '在每个市场交易任意资产，无限制，无边界。',
    es: 'Comercia cualquier activo en todos los mercados. Sin restricciones, sin fronteras.',
    ru: 'Торгуйте любым активом на любом рынке. Без ограничений, без границ.',
    pt: 'Negocie qualquer ativo em todos os mercados. Sem restrições, sem fronteiras.',
    ar: 'تداول أي أصل في كل سوق. بلا قيود، بلا حدود.',
    tr: 'Her piyasada her varlıkla işlem yapın. Kısıtlama yok, sınır yok.',
    ko: '모든 시장에서 모든 자산을 거래하세요. 제한도 국경도 없습니다.',
  },
  'landing.why.privacy.title': { en: 'Native Privacy', zh: '原生隐私', es: 'Privacidad nativa', ru: 'Встроенная конфиденциальность', pt: 'Privacidade nativa', ar: 'الخصوصية الأصلية', tr: 'Yerel Gizlilik', ko: '기본 프라이버시' },
  'landing.why.privacy.desc': {
    en: 'Higher leverage margin that earns. Nobody needs to see, privacy by default.',
    zh: '更高的杠杆保证金，还能赚取收益。默认隐私，无需任何人知晓。',
    es: 'Margen de apalancamiento más alto que genera ingresos. Privacidad por defecto.',
    ru: 'Высокое кредитное плечо с доходом. Конфиденциальность по умолчанию.',
    pt: 'Margem de alavancagem mais alta que gera renda. Privacidade por padrão.',
    ar: 'هامش رافعة أعلى يكسب. لا أحد يحتاج للرؤية، الخصوصية افتراضية.',
    tr: 'Kazanç sağlayan yüksek kaldıraç marjı. Gizlilik varsayılan.',
    ko: '수익을 창출하는 높은 레버리지 마진. 기본적으로 프라이버시 보장.',
  },
  'landing.why.capital.title': { en: 'Capital Efficiency', zh: '资本效率', es: 'Eficiencia de capital', ru: 'Эффективность капитала', pt: 'Eficiência de capital', ar: 'كفاءة رأس المال', tr: 'Sermaye Verimliliği', ko: '자본 효율성' },
  'landing.why.capital.desc': {
    en: 'Maximum output from your capital. Sub-second settlement, zero slippage.',
    zh: '最大化资本产出，亚秒级结算，零滑点。',
    es: 'Máximo rendimiento de tu capital. Liquidación en milisegundos, cero deslizamiento.',
    ru: 'Максимальная отдача от капитала. Мгновенный расчёт, нулевое проскальзывание.',
    pt: 'Máximo retorno do seu capital. Liquidação em milissegundos, zero slippage.',
    ar: 'أقصى عائد من رأس مالك. تسوية في أقل من ثانية، انزلاق صفري.',
    tr: 'Sermayenizden maksimum çıktı. Saniye altı uzlaşma, sıfır kayma.',
    ko: '자본에서 최대 출력. 1초 미만 결제, 슬리피지 제로.',
  },
  'landing.why.composability.title': { en: 'Open Composability', zh: '开放可组合性', es: 'Componibilidad abierta', ru: 'Открытая компонуемость', pt: 'Composabilidade aberta', ar: 'قابلية التركيب المفتوحة', tr: 'Açık Birleştirilebilirlik', ko: '개방형 조합 가능성' },
  'landing.why.composability.desc': {
    en: 'Permissionless building blocks for the next generation of DeFi apps.',
    zh: '无需许可的积木块，用于下一代 DeFi 应用程序。',
    es: 'Bloques de construcción sin permisos para la próxima generación de aplicaciones DeFi.',
    ru: 'Безразрешительные строительные блоки для DeFi приложений нового поколения.',
    pt: 'Blocos de construção sem permissão para a próxima geração de apps DeFi.',
    ar: 'لبنات بناء بلا إذن لجيل تطبيقات DeFi القادم.',
    tr: 'Yeni nesil DeFi uygulamaları için izinsiz yapı taşları.',
    ko: '차세대 DeFi 앱을 위한 무허가 빌딩 블록.',
  },
  'landing.platform.label': { en: 'Platform', zh: '平台', es: 'Plataforma', ru: 'Платформа', pt: 'Plataforma', ar: 'المنصة', tr: 'Platform', ko: '플랫폼' },
  'landing.platform.title': { en: 'The UNBOUND Experience', zh: 'UNBOUND 体验', es: 'La Experiencia UNBOUND', ru: 'Опыт UNBOUND', pt: 'A Experiência UNBOUND', ar: 'تجربة UNBOUND', tr: 'UNBOUND Deneyimi', ko: 'UNBOUND 경험' },
  'landing.platform.sub': {
    en: 'Deploy across every frontier. Commodities, prediction markets, AI, and more — all in one terminal.',
    zh: '跨越每个前沿。大宗商品、预测市场、AI 等，全在一个终端。',
    es: 'Despliega en cada frontera. Materias primas, mercados de predicción, IA y más — todo en un terminal.',
    ru: 'Развёртывайтесь на каждом рубеже. Товары, рынки предсказаний, ИИ и многое другое.',
    pt: 'Opere em todas as fronteiras. Commodities, mercados de previsão, IA e mais — em um terminal.',
    ar: 'انتشر عبر كل الحدود. السلع والأسواق التنبؤية والذكاء الاصطناعي والمزيد — كل ذلك في محطة واحدة.',
    tr: 'Her alanda yayılın. Emtialar, tahmin piyasaları, yapay zeka ve daha fazlası — hepsi tek terminalde.',
    ko: '모든 프론티어에 배포. 원자재, 예측 시장, AI 등 — 모두 하나의 터미널에서.',
  },
  'landing.row1.badge': { en: '24 / 7', zh: '24 / 7', es: '24 / 7', ru: '24 / 7', pt: '24 / 7', ar: '24 / 7', tr: '24 / 7', ko: '24 / 7' },
  'landing.row1.title': { en: 'Trade every frontier', zh: '交易每一个前沿', es: 'Opera en cada frontera', ru: 'Торгуйте на каждом рубеже', pt: 'Opere em cada fronteira', ar: 'تداول كل الحدود', tr: 'Her sınırda işlem yapın', ko: '모든 프론티어 거래' },
  'landing.row1.desc': {
    en: 'Equities, commodities, prediction markets, AI tokens. UNBOUND gives you access to every on-chain market — anytime, anywhere.',
    zh: '股票、大宗商品、预测市场、AI 代币。UNBOUND 为您提供访问每个链上市场的机会——随时随地。',
    es: 'Acciones, materias primas, mercados de predicción, tokens de IA. UNBOUND te da acceso a todos los mercados on-chain.',
    ru: 'Акции, сырьё, рынки предсказаний, AI-токены. UNBOUND даёт доступ к каждому рынку на блокчейне.',
    pt: 'Ações, commodities, mercados de previsão, tokens de IA. UNBOUND te dá acesso a todos os mercados on-chain.',
    ar: 'الأسهم والسلع وأسواق التنبؤ ورموز الذكاء الاصطناعي. UNBOUND يمنحك الوصول إلى كل سوق على السلسلة.',
    tr: 'Hisse senetleri, emtialar, tahmin piyasaları, yapay zeka tokenleri. UNBOUND size her zincir üstü pazara erişim sağlar.',
    ko: '주식, 원자재, 예측 시장, AI 토큰. UNBOUND는 언제 어디서나 모든 온체인 시장에 접근을 제공합니다.',
  },
  'landing.row2.badge': { en: 'Privacy', zh: '隐私', es: 'Privacidad', ru: 'Приватность', pt: 'Privacidade', ar: 'الخصوصية', tr: 'Gizlilik', ko: '프라이버시' },
  'landing.row2.title': { en: 'Move without being watched', zh: '无人监视下行动', es: 'Muévete sin ser observado', ru: 'Действуйте незаметно', pt: 'Mova-se sem ser observado', ar: 'تحرك دون مراقبة', tr: 'Gözetlenmeden hareket edin', ko: '감시 없이 움직이세요' },
  'landing.row2.desc': {
    en: 'UNBOUND has privacy baked in at the protocol level. Your strategy is yours. Stealth addresses and shielded transactions keep your positions private.',
    zh: 'UNBOUND 在协议层内置隐私。您的策略是您的。隐身地址和屏蔽交易让您的仓位保持私密。',
    es: 'UNBOUND tiene privacidad integrada a nivel de protocolo. Tu estrategia es tuya. Direcciones sigilosas y transacciones blindadas.',
    ru: 'В UNBOUND конфиденциальность встроена на уровне протокола. Ваша стратегия — только ваша.',
    pt: 'UNBOUND tem privacidade incorporada no nível do protocolo. Sua estratégia é sua.',
    ar: 'UNBOUND يتضمن الخصوصية على مستوى البروتوكول. استراتيجيتك لك وحدك.',
    tr: 'UNBOUND gizliliği protokol seviyesinde yerleşiktir. Stratejiniz sizindir.',
    ko: 'UNBOUND는 프로토콜 수준에서 프라이버시를 내장했습니다. 전략은 당신만의 것입니다.',
  },
  'landing.row3.badge': { en: 'Yield', zh: '收益', es: 'Rendimiento', ru: 'Доходность', pt: 'Rendimento', ar: 'العائد', tr: 'Getiri', ko: '수익' },
  'landing.row3.title': { en: 'Earn on idle margin', zh: '在闲置保证金上赚取收益', es: 'Gana con el margen inactivo', ru: 'Зарабатывайте на свободной марже', pt: 'Ganhe com margem ociosa', ar: 'اكسب على الهامش الخامل', tr: 'Atıl marjinle kazanın', ko: '유휴 마진으로 수익 창출' },
  'landing.row3.desc': {
    en: 'Margin deposits earn yield automatically. Every dollar sitting in your account works for you — even when you\'re not actively trading.',
    zh: '保证金存款自动赚取收益。账户中的每一美元都为您工作——即使您没有主动交易。',
    es: 'Los depósitos de margen generan rendimiento automáticamente. Cada dólar en tu cuenta trabaja para ti.',
    ru: 'Маржинальные депозиты автоматически генерируют доход. Каждый доллар на счёте работает на вас.',
    pt: 'Depósitos de margem geram rendimento automaticamente. Cada dólar na sua conta trabalha para você.',
    ar: 'ودائع الهامش تكسب عائداً تلقائياً. كل دولار في حسابك يعمل من أجلك.',
    tr: 'Marjin yatırımları otomatik olarak getiri sağlar. Hesabınızdaki her dolar sizin için çalışır.',
    ko: '마진 예치금이 자동으로 수익을 창출합니다. 계좌의 모든 달러가 당신을 위해 일합니다.',
  },
  'landing.chain.label': { en: 'Infrastructure', zh: '基础设施', es: 'Infraestructura', ru: 'Инфраструктура', pt: 'Infraestrutura', ar: 'البنية التحتية', tr: 'Altyapı', ko: '인프라' },
  'landing.chain.title': { en: 'UNBOUND Chain', zh: 'UNBOUND 链', es: 'UNBOUND Chain', ru: 'UNBOUND Chain', pt: 'UNBOUND Chain', ar: 'سلسلة UNBOUND', tr: 'UNBOUND Zinciri', ko: 'UNBOUND 체인' },
  'landing.chain.sub': {
    en: 'A purpose-built blockchain designed for high-frequency trading at internet scale.',
    zh: '专为互联网规模的高频交易而设计的专用区块链。',
    es: 'Una blockchain construida para trading de alta frecuencia a escala de internet.',
    ru: 'Специально созданный блокчейн для высокочастотной торговли в масштабе интернета.',
    pt: 'Uma blockchain construída para trading de alta frequência em escala de internet.',
    ar: 'بلوكشين مصمم خصيصاً للتداول عالي التردد على نطاق الإنترنت.',
    tr: 'İnternet ölçeğinde yüksek frekanslı ticaret için tasarlanmış özel blok zinciri.',
    ko: '인터넷 규모의 고빈도 거래를 위해 특별히 설계된 블록체인.',
  },
  'landing.chain.finality.title': { en: 'Sub-Second Finality', zh: '亚秒最终性', es: 'Finalidad en menos de un segundo', ru: 'Финальность менее секунды', pt: 'Finalidade sub-segundo', ar: 'نهائية أقل من ثانية', tr: 'Saniye Altı Kesinlik', ko: '1초 미만 최종성' },
  'landing.chain.finality.desc': {
    en: 'Up to 100,000 TPS. Sub-gas, PoSA. Every trade generates a fresh zero-knowledge proof for immediate trustless settlement.',
    zh: '高达 100,000 TPS。Sub-gas，PoSA。每笔交易生成全新零知识证明，实现即时无信任结算。',
    es: 'Hasta 100.000 TPS. Sub-gas, PoSA. Cada operación genera una prueba de conocimiento cero.',
    ru: 'До 100 000 TPS. Sub-gas, PoSA. Каждая сделка генерирует доказательство с нулевым разглашением.',
    pt: 'Até 100.000 TPS. Sub-gas, PoSA. Cada negócio gera uma prova zero-knowledge.',
    ar: 'ما يصل إلى 100,000 TPS. كل صفقة تولد دليلاً بمعرفة صفرية.',
    tr: '100.000 TPS\'ye kadar. Her işlem anında trustless uzlaşma için sıfır bilgi kanıtı üretir.',
    ko: '최대 100,000 TPS. 모든 거래는 즉각적인 무신뢰 결제를 위한 ZK 증명을 생성합니다.',
  },
  'landing.chain.privacy.title': { en: 'Built-in Privacy', zh: '内置隐私', es: 'Privacidad integrada', ru: 'Встроенная приватность', pt: 'Privacidade integrada', ar: 'خصوصية مدمجة', tr: 'Yerleşik Gizlilik', ko: '내장 프라이버시' },
  'landing.chain.privacy.desc': {
    en: 'Stealth addresses and shielded accounts. Your trades, your portfolio — fully private by default.',
    zh: '隐身地址和屏蔽账户。您的交易、您的投资组合——默认完全私密。',
    es: 'Direcciones sigilosas y cuentas blindadas. Tus operaciones, tu portafolio — totalmente privados.',
    ru: 'Скрытые адреса и защищённые счета. Ваши сделки и портфель — полностью приватны.',
    pt: 'Endereços stealth e contas blindadas. Suas negociações, seu portfólio — totalmente privados.',
    ar: 'عناوين خفية وحسابات محمية. صفقاتك ومحفظتك — خاصة تماماً افتراضياً.',
    tr: 'Gizli adresler ve korumalı hesaplar. İşlemleriniz ve portföyünüz — varsayılan olarak tamamen özel.',
    ko: '스텔스 주소와 보호된 계좌. 거래와 포트폴리오 — 기본적으로 완전 비공개.',
  },
  'landing.chain.multichain.title': { en: 'Multi-Chain by Design', zh: '设计上的多链', es: 'Multi-cadena por diseño', ru: 'Многоцепочечность по замыслу', pt: 'Multi-chain por design', ar: 'متعدد السلاسل بالتصميم', tr: 'Tasarım Gereği Çoklu Zincir', ko: '설계상 멀티체인' },
  'landing.chain.multichain.desc': {
    en: 'Supports BNB Chain, Arbitrum, Ethereum and Solana. Bridging handled automatically, unified liquidity across chains.',
    zh: '支持 BNB Chain、Arbitrum、以太坊和 Solana。自动处理跨链，统一流动性。',
    es: 'Soporta BNB Chain, Arbitrum, Ethereum y Solana. Puentes automáticos, liquidez unificada.',
    ru: 'Поддерживает BNB Chain, Arbitrum, Ethereum и Solana. Мосты автоматически, единая ликвидность.',
    pt: 'Suporta BNB Chain, Arbitrum, Ethereum e Solana. Bridging automático, liquidez unificada.',
    ar: 'يدعم BNB Chain وArbitrum وEthereum وSolana. جسر تلقائي، سيولة موحدة.',
    tr: 'BNB Chain, Arbitrum, Ethereum ve Solana destekler. Otomatik köprüleme, birleşik likidite.',
    ko: 'BNB Chain, Arbitrum, Ethereum, Solana 지원. 자동 브리징, 통합 유동성.',
  },
  'landing.ecosystem.label': { en: 'Partners', zh: '合作伙伴', es: 'Socios', ru: 'Партнёры', pt: 'Parceiros', ar: 'الشركاء', tr: 'Ortaklar', ko: '파트너' },
  'landing.ecosystem.title': { en: 'Trusted by the Ecosystem', zh: '受生态系统信任', es: 'De confianza del ecosistema', ru: 'Доверяет экосистема', pt: 'Confiado pelo ecossistema', ar: 'موثوق به من النظام البيئي', tr: 'Ekosistem Tarafından Güvenilen', ko: '생태계의 신뢰를 받는' },
  'landing.mobile.label': { en: 'Mobile', zh: '移动端', es: 'Móvil', ru: 'Мобильное', pt: 'Mobile', ar: 'الجوال', tr: 'Mobil', ko: '모바일' },
  'landing.mobile.title': { en: 'UNBOUND in Your Pocket', zh: 'UNBOUND 随身携带', es: 'UNBOUND en tu bolsillo', ru: 'UNBOUND в кармане', pt: 'UNBOUND no seu bolso', ar: 'UNBOUND في جيبك', tr: 'Cebinizde UNBOUND', ko: '주머니 속 UNBOUND' },
  'landing.mobile.desc': {
    en: 'Never miss an opportunity with the UNBOUND mobile app. Trade BNB, ETH, SOL and thousands of altcoins from anywhere. Available on iOS and Android.',
    zh: '随时随地不错过任何机会，使用 UNBOUND 移动应用。支持 iOS 和 Android。',
    es: 'Nunca pierdas una oportunidad con la app móvil de UNBOUND. Disponible en iOS y Android.',
    ru: 'Не пропускайте возможности с мобильным приложением UNBOUND. Доступно на iOS и Android.',
    pt: 'Nunca perca uma oportunidade com o app móvel UNBOUND. Disponível no iOS e Android.',
    ar: 'لا تفوت أي فرصة مع تطبيق UNBOUND الجوال. متاح على iOS وAndroid.',
    tr: 'UNBOUND mobil uygulamasıyla hiçbir fırsatı kaçırmayın. iOS ve Android\'de mevcut.',
    ko: 'UNBOUND 모바일 앱으로 어떤 기회도 놓치지 마세요. iOS와 Android에서 사용 가능.',
  },
  'landing.mobile.appStore': { en: 'App Store', zh: 'App Store', es: 'App Store', ru: 'App Store', pt: 'App Store', ar: 'App Store', tr: 'App Store', ko: 'App Store' },
  'landing.mobile.googlePlay': { en: 'Google Play', zh: 'Google Play', es: 'Google Play', ru: 'Google Play', pt: 'Google Play', ar: 'Google Play', tr: 'Google Play', ko: 'Google Play' },
  'landing.cta.title': { en: 'Trade at the', zh: '以', es: 'Opera a la', ru: 'Торгуйте со', pt: 'Opere na', ar: 'تداول بسرعة', tr: 'Düşünce hızında', ko: '생각의 속도로' },
  'landing.cta.highlight': { en: 'speed of thought.', zh: '思维速度交易。', es: 'velocidad del pensamiento.', ru: 'скоростью мысли.', pt: 'velocidade do pensamento.', ar: 'الفكر.', tr: 'işlem yapın.', ko: '거래하세요.' },
  'landing.cta.sub': {
    en: 'Join thousands of traders already on UNBOUND. No KYC. No limits. Full control.',
    zh: '加入已在 UNBOUND 上的数千名交易者。无需 KYC，无限制，完全掌控。',
    es: 'Únete a miles de traders en UNBOUND. Sin KYC. Sin límites. Control total.',
    ru: 'Присоединяйтесь к тысячам трейдеров на UNBOUND. Без KYC. Без ограничений. Полный контроль.',
    pt: 'Junte-se a milhares de traders no UNBOUND. Sem KYC. Sem limites. Controle total.',
    ar: 'انضم إلى آلاف المتداولين على UNBOUND. لا KYC. لا حدود. سيطرة كاملة.',
    tr: 'UNBOUND\'taki binlerce traderla birleşin. KYC yok. Sınır yok. Tam kontrol.',
    ko: '이미 UNBOUND에 있는 수천 명의 트레이더와 함께하세요. KYC 없음. 제한 없음. 완전한 통제.',
  },
  'landing.footer.product': { en: 'Product', zh: '产品', es: 'Producto', ru: 'Продукт', pt: 'Produto', ar: 'المنتج', tr: 'Ürün', ko: '제품' },
  'landing.footer.learn':   { en: 'Learn', zh: '学习', es: 'Aprender', ru: 'Обучение', pt: 'Aprender', ar: 'تعلم', tr: 'Öğren', ko: '학습' },
  'landing.footer.chain':   { en: 'Chain', zh: '链', es: 'Cadena', ru: 'Цепь', pt: 'Chain', ar: 'السلسلة', tr: 'Zincir', ko: '체인' },
  'landing.footer.company': { en: 'Company', zh: '公司', es: 'Empresa', ru: 'Компания', pt: 'Empresa', ar: 'الشركة', tr: 'Şirket', ko: '회사' },
  'landing.footer.tagline': {
    en: 'The frontier of on-chain trading. Built for everyone.',
    zh: '链上交易的前沿，为所有人而建。',
    es: 'La frontera del trading on-chain. Construido para todos.',
    ru: 'Рубеж торговли на блокчейне. Создано для всех.',
    pt: 'A fronteira do trading on-chain. Construído para todos.',
    ar: 'حدود التداول على السلسلة. مبني للجميع.',
    tr: 'Zincir üstü ticaretin sınırı. Herkes için inşa edildi.',
    ko: '온체인 트레이딩의 프론티어. 모두를 위해 만들어졌습니다.',
  },
  'landing.footer.copyright': {
    en: '© 2025 UNBOUND Foundation. All rights reserved.',
    zh: '© 2025 UNBOUND 基金会。保留所有权利。',
    es: '© 2025 UNBOUND Foundation. Todos los derechos reservados.',
    ru: '© 2025 UNBOUND Foundation. Все права защищены.',
    pt: '© 2025 UNBOUND Foundation. Todos os direitos reservados.',
    ar: '© 2025 مؤسسة UNBOUND. جميع الحقوق محفوظة.',
    tr: '© 2025 UNBOUND Foundation. Tüm hakları saklıdır.',
    ko: '© 2025 UNBOUND Foundation. 모든 권리 보유.',
  },
  'landing.footer.terms': { en: 'Terms', zh: '条款', es: 'Términos', ru: 'Условия', pt: 'Termos', ar: 'الشروط', tr: 'Koşullar', ko: '이용 약관' },
  'landing.footer.privacyPolicy': { en: 'Privacy Policy', zh: '隐私政策', es: 'Política de privacidad', ru: 'Политика конфиденциальности', pt: 'Política de privacidade', ar: 'سياسة الخصوصية', tr: 'Gizlilik Politikası', ko: '개인정보 처리방침' },
  'landing.footer.risk': { en: 'Risk Disclaimer', zh: '风险声明', es: 'Aviso de riesgo', ru: 'Отказ от ответственности', pt: 'Aviso de risco', ar: 'إخلاء مسؤولية المخاطر', tr: 'Risk Bildirimi', ko: '위험 고지' },

  /* ── Other reference keys used in landing/desktop ── */
  'trade.heading': {
    en: 'Markets', zh: '市场', es: 'Mercados', ru: 'Рынки', pt: 'Mercados', ar: 'الأسواق', tr: 'Piyasalar', ko: '마켓',
  },
  'orders.detail.price': {
    en: 'Price', zh: '价格', es: 'Precio', ru: 'Цена', pt: 'Preço', ar: 'السعر', tr: 'Fiyat', ko: '가격',
  },
  'orders.detail.amount': {
    en: 'Amount', zh: '数量', es: 'Cantidad', ru: 'Количество', pt: 'Quantidade', ar: 'الكمية', tr: 'Miktar', ko: '수량',
  },
  'orders.detail.total': {
    en: 'Total', zh: '总计', es: 'Total', ru: 'Всего', pt: 'Total', ar: 'الإجمالي', tr: 'Toplam', ko: '총액',
  },
  'orders.tab.open_ref': {
    en: 'Open Orders', zh: '未成交订单', es: 'Órdenes abiertas', ru: 'Открытые заказы', pt: 'Ordens abertas', ar: 'الأوامر المفتوحة', tr: 'Açık Emirler', ko: '미체결 주문',
  },
};

/* ── Context ── */
interface TranslationContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

/* ── Provider ── */
export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && ['en', 'zh', 'es', 'ru', 'pt', 'ar', 'tr', 'ko'].includes(saved)) {
        return saved;
      }
    } catch {}
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  };

  const t = useMemo(() => (key: string, vars?: Record<string, string | number>): string => {
    const entry = translations[key];
    let str = entry ? (entry[language] ?? entry['en'] ?? key) : key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [language]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [language]);

  return React.createElement(
    TranslationContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
}

/* ── Hook ── */
export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used inside TranslationProvider');
  return ctx;
}
