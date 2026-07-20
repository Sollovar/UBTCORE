import React from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/i18n';


export function LandingFooter() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const NAV_COLUMNS = [
    {
      heading: t('footer.platformHeading'),
      links: [t('footer.link.trade'), t('footer.link.pairs')],
    },
    {
      heading: t('footer.resourcesHeading'),
      links: [t('footer.link.documentation'), t('footer.link.status'), t('footer.link.support')],
    },
    {
      heading: t('footer.communityHeading'),
      links: [t('footer.link.twitter'), t('footer.link.discord'), t('footer.link.telegram')],
    },
  ];

  const SOCIALS = [
    { icon: X,             label: t('footer.social.twitter') },
    { icon: MessageCircle, label: t('footer.social.discord') },
    { icon: Send,          label: t('footer.social.telegram') },
  ];

  return (
    <footer className="border-t border-(--border) bg-(--background)">
      {/* CTA stripe */}
      <div
        className="border-b border-(--border) py-8"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(34,211,238,0.03) 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-(--text-secondary) text-sm">
            {t('footer.cta.line1')}{' '}
            <span className="text-(--text-primary) font-medium">{t('footer.cta.line2')}</span>
          </p>
          <button
            className="btn-cta-primary text-sm"
            style={{ padding: '10px 24px', fontSize: 14 }}
            onClick={() => navigate('/trade')}
          >
            {t('footer.cta.launchApp')} →
          </button>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 mb-4 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-9 h-9 rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)' }}
              >
                <img
                  src="https://zhzihlfavquifmccvhqz.supabase.co/storage/v1/object/public/my%20logos/6a0498ca-2aed-405d-b537-da6df81dfdf9.png"
                  alt="Unbound"
                  className="w-9 h-9 object-cover"
                />
              </div>
              <span className="text-xl font-bold text-(--text-primary)">Unbound</span>
            </button>
            <p className="text-sm text-(--text-dim) leading-relaxed mb-6 max-w-xs">
              {t('footer.description')}
            </p>
            {/* Socials */}
            <div className="flex items-center gap-2.5">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-(--border) text-(--text-dim) transition-all duration-200 hover:text-(--text-primary) hover:border-[#6366f1] hover:bg-(--surface-elevated)"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-(--text-primary) mb-4 tracking-wide">
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors duration-150"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-(--border) mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-(--text-dim)">{t('footer.copyright')}</p>
          <div className="flex items-center gap-5">
            {[t('footer.terms'), t('footer.privacy')].map((item) => (
              <a key={item} href="#" className="text-xs text-(--text-dim) hover:text-(--text-primary) transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
