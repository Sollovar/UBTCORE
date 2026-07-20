import React from 'react';
import { Send, GitBranch, MessageCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';

export function MobileFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-[#2e2e3a] bg-[#0a0a0f] py-8 px-4">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center">
          <span className="text-white font-bold">C</span>
        </div>
        <span className="text-xl font-bold text-[#f8fafc]">Unbound</span>
      </div>
      
      <p className="text-xs text-[#64748b] text-center mb-6">
        {t('footer.description')}
      </p>
      
      <div className="flex items-center justify-center gap-3">
        <a href="#" className="p-2 rounded-lg bg-[#1a1a25] border border-[#2e2e3a] text-[#64748b] hover:text-[#f8fafc]">
          <Send size={18} />
        </a>
        <a href="#" className="p-2 rounded-lg bg-[#1a1a25] border border-[#2e2e3a] text-[#64748b] hover:text-[#f8fafc]">
          <GitBranch size={18} />
        </a>
        <a href="#" className="p-2 rounded-lg bg-[#1a1a25] border border-[#2e2e3a] text-[#64748b] hover:text-[#f8fafc]">
          <MessageCircle size={18} />
        </a>
      </div>
      
      <p className="text-xs text-[#64748b] text-center mt-6">{t('footer.copyright')}</p>
    </footer>
  );
}
