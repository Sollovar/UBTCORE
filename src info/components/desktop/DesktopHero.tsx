import React from 'react';
import { ArrowRight, Zap, Shield, Clock, TrendingUp, Users, Globe } from 'lucide-react';
import { Button } from '../common/Button';

interface DesktopHeroProps {
  onLaunchApp?: () => void;
}

export function DesktopHero({ onLaunchApp }: DesktopHeroProps) {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/10 via-transparent to-[#22d3ee]/10" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#6366f1]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#22d3ee]/20 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a1a25] border border-[#2e2e3a] mb-6">
            <Zap size={14} className="text-[#22d3ee]" />
            <span className="text-sm text-[#94a3b8]">Trade trending tokens before CEX listing</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-[#f8fafc] mb-6 leading-tight">
            Trade Trending Tokens
            <span className="block gradient-text">Before They Go Mainstream</span>
          </h1>
          
          <p className="text-xl text-[#94a3b8] mb-8 max-w-2xl mx-auto">
            Unbound is a decentralized exchange that indexes trending pairs from DEX aggregators. 
            Trade early with our orderbook system before tokens hit centralized exchanges.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={onLaunchApp}>
              Launch App
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button variant="secondary" size="lg">
              Read More
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#1a1a25] border border-[#2e2e3a] mx-auto mb-3">
              <TrendingUp size={24} className="text-[#22d3ee]" />
            </div>
            <p className="text-2xl font-bold text-[#f8fafc]">50+</p>
            <p className="text-sm text-[#64748b]">Trending Pairs</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#1a1a25] border border-[#2e2e3a] mx-auto mb-3">
              <Shield size={24} className="text-[#10b981]" />
            </div>
            <p className="text-2xl font-bold text-[#f8fafc]">$0</p>
            <p className="text-sm text-[#64748b]">Listing Fees</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#1a1a25] border border-[#2e2e3a] mx-auto mb-3">
              <Clock size={24} className="text-[#6366f1]" />
            </div>
            <p className="text-2xl font-bold text-[#f8fafc]">24/7</p>
            <p className="text-sm text-[#64748b]">Trading</p>
          </div>
        </div>

        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#f8fafc] text-center mb-8">Why Choose Unbound?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-[#6366f1]/20 flex items-center justify-center mb-4">
                <Zap size={20} className="text-[#6366f1]" />
              </div>
              <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">Early Access</h3>
              <p className="text-sm text-[#64748b]">
                Get access to trending tokens before they list on centralized exchanges. Be ahead of the market.
              </p>
            </div>
            <div className="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center mb-4">
                <Users size={20} className="text-[#22d3ee]" />
              </div>
              <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">Decentralized Orderbook</h3>
              <p className="text-sm text-[#64748b]">
                Our innovative orderbook system provides better prices and deeper liquidity for traders.
              </p>
            </div>
            <div className="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center mb-4">
                <Globe size={20} className="text-[#10b981]" />
              </div>
              <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">Multi-DEX Indexing</h3>
              <p className="text-sm text-[#64748b]">
                We aggregate liquidity from Uniswap, PancakeSwap, Raydium and more DEXes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
