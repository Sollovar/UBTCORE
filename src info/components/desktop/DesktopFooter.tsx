import React from 'react';
import { Send, GitBranch, MessageCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';

export function DesktopFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-(--border) bg-(--background)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img
                  src="https://zhzihlfavquifmccvhqz.supabase.co/storage/v1/object/public/my%20logos/6a0498ca-2aed-405d-b537-da6df81dfdf9.png"
                  alt={t('footer.brand')}
                  className="w-8 h-8 object-cover"
                />
              </div>
              <span className="text-xl font-bold text-(--text-primary)">{t('footer.brand')}</span>
            </div>
            <p className="text-sm text-(--text-dim)">
              {t('footer.description')}
            </p>
          </div>

            <div>
            <h4 className="font-semibold text-(--text-primary) mb-4">{t('footer.platformHeading')}</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors">{t('footer.link.trade')}</a></li>
              <li><a href="#" className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors">{t('footer.link.pairs')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-(--text-primary) mb-4">{t('footer.resourcesHeading')}</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors">{t('footer.link.documentation')}</a></li>
              <li><a href="#" className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors">{t('footer.link.support')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-(--text-primary) mb-4">{t('footer.connectHeading')}</h4>
            <div className="flex items-center gap-3">
              <a href="#" className="p-2 rounded-lg bg-(--surface-elevated) border border-(--border) text-(--text-dim) hover:text-(--text-primary) hover:border-[#6366f1] transition-colors">
                <Send size={18} />
              </a>
              <a href="#" className="p-2 rounded-lg bg-(--surface-elevated) border border-(--border) text-(--text-dim) hover:text-(--text-primary) hover:border-[#6366f1] transition-colors">
                <GitBranch size={18} />
              </a>
              <a href="#" className="p-2 rounded-lg bg-(--surface-elevated) border border-(--border) text-(--text-dim) hover:text-(--text-primary) hover:border-[#6366f1] transition-colors">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-(--border) mt-8 pt-8 flex items-center justify-between">
          <p className="text-sm text-(--text-dim)">{t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors">{t('footer.terms')}</a>
            <a href="#" className="text-sm text-(--text-dim) hover:text-(--text-primary) transition-colors">{t('footer.privacy')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
