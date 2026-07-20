import { LiveMarketState } from "@/hooks/useLiveMarket";

interface Props {
  market: LiveMarketState;
}

const ITEMS = [
  { text: "Welcome to UNBOUND — Your Professional Decentralized Exchange", highlight: true },
  { text: "Trade across BSC, Base, and Solana with protected orders", highlight: false },
  { text: "Front-running protection with commit-reveal technology", highlight: false },
  { text: "Advanced order types: limit, market, stop-loss, take-profit, ladder", highlight: false },
  { text: "Real-time market data and trending pairs discovery", highlight: true },
  { text: "Your assets stay in your wallet — full custody control", highlight: false },
  { text: "Professional-grade trading tools for serious traders", highlight: false },
];

export function TickerBar({ market }: Props) {
  const items = [...ITEMS, ...ITEMS];

  return (
    <div className="h-[28px] bg-[#080808] border-t border-[#1a1a1a] shrink-0 flex items-center overflow-hidden text-[11px] text-[#555]">
      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <style>{`
          @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track {
            display: flex;
            width: max-content;
            animation: marquee-scroll 40s linear infinite;
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="marquee-track gap-0">
          {items.map((item, i) => (
            <span
              key={i}
              className={`px-5 cursor-pointer hover:text-white transition-colors whitespace-nowrap border-r border-[#151515] ${
                item.highlight ? "text-[#f5c518] hover:text-[#ffe066]" : "hover:text-[#ccc]"
              }`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* Right icons */}
      <div className="px-3 flex items-center gap-2 border-l border-[#1a1a1a] h-full shrink-0 text-[#555]">
        <button className="hover:text-white transition-colors">𝕏</button>
        <button className="hover:text-white transition-colors">✉</button>
      </div>
    </div>
  );
}
