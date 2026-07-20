// Mobile-specific component for token pair display
import React from 'react';
import getTokenIcon from '../utils/tokenIcons';

interface MobileTokenPairDisplayProps {
  baseToken: {
    symbol: string;
    logo?: string;
  };
  quoteToken: {
    symbol: string;
    logo?: string;
  };
  size?: number;
}

const MobileTokenPairDisplay: React.FC<MobileTokenPairDisplayProps> = ({
  baseToken,
  quoteToken,
  size = 20
}) => {
  const baseTokenIcon = getTokenIcon(baseToken.symbol, baseToken.logo);
  const quoteTokenIcon = getTokenIcon(quoteToken.symbol, quoteToken.logo);

  return (
    <div className="flex items-center justify-center">
      <div className="relative flex-shrink-0">
        <img
          src={baseTokenIcon}
          alt={`${baseToken.symbol} logo`}
          width={size}
          height={size}
          onError={(e) => {
            // Fallback to generic token icon if the image fails to load
            e.currentTarget.src = '/icons/default-token.svg';
          }}
          className="rounded-full"
        />
        <img
          src={quoteTokenIcon}
          alt={`${quoteToken.symbol} logo`}
          width={size}
          height={size}
          onError={(e) => {
            // Fallback to generic token icon if the image fails to load
            e.currentTarget.src = '/icons/default-token.svg';
          }}
          className="absolute rounded-full border border-white -ml-2"
          style={{ left: `${size / 2}px` }}
        />
      </div>
    </div>
  );
};

export default MobileTokenPairDisplay;
