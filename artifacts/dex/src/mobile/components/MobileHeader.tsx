import { Menu, Search } from "lucide-react";

export function MobileHeader() {
  return (
    <div className="flex flex-col shrink-0">
      <div className="flex items-center justify-between h-12 px-4 border-b border-[#1e1e1e] bg-[#111111]">
        <div className="flex items-center gap-2 font-bold tracking-wider text-primary">
          <div className="w-4 h-4 bg-primary rotate-45 rounded-[2px]" />
          UNBOUND
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Search className="w-5 h-5" />
          <Menu className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-center justify-between p-4 bg-[#111111] border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#f7931a]/20">
            <div className="w-5 h-5 rounded-full bg-[#f7931a] flex items-center justify-center text-white text-[10px] font-bold">₿</div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">BTC/USDT</span>
              <span className="text-[10px] bg-[#f5c518]/10 text-[#f5c518] px-1 py-0.5 rounded font-medium">BSC</span>
            </div>
            <a href="#" className="text-xs text-muted-foreground underline decoration-dotted">Bitcoin</a>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#ff1744]">61,203.6</div>
          <div className="text-xs text-[#ff1744]">-0.70%</div>
        </div>
      </div>
    </div>
  );
}