import React from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { ShowcaseSection } from './ShowcaseSection';
import { StatsSection } from './StatsSection';
import { CtaSection } from './CtaSection';
import { LandingFooter } from './LandingFooter';

// Mobile optimized components
import { MobileHero } from '../mobile/MobileHero';
import { MobileFeatures } from './MobileFeatures';
import { MobileHowItWorks } from './MobileHowItWorks';
import { MobileShowcase } from './MobileShowcase';
import { MobileStats } from './MobileStats';
import { MobileCta } from './MobileCta';
import { MobileFooter } from '../mobile/MobileFooter';

export function LandingPage() {
  const breakpoint = useBreakpoint();
  const navigate = useNavigate();
  const isMobile = breakpoint === 'mobile';

  const handleLaunchApp = () => navigate('/trade');

  if (isMobile) {
    return (
      <>
        <MobileHero onLaunchApp={handleLaunchApp} />
        <MobileFeatures />
        <MobileHowItWorks />
        <MobileShowcase />
        <MobileStats />
        <MobileCta />
        <MobileFooter />
      </>
    );
  }

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ShowcaseSection />
      <StatsSection />
      <CtaSection />
      <LandingFooter />
    </>
  );
}
