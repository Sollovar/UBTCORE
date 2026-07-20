// Component to display token pair logos
import React from 'react';
import getTokenIcon from '../utils/tokenIcons';

interface TokenPairDisplayProps {
  baseToken: {
    symbol: string;
    logo?: string;
  };
  quoteToken: {
    symbol: string;
    logo?: string;
  };
  size?: number; // Size of the logo in pixels
}

const TokenPairDisplay: React.FC<TokenPairDisplayProps> = ({
  baseToken,
  quoteToken,
  size = 24
}) => {
  const baseTokenIcon = getTokenIcon(baseToken.symbol, baseToken.logo);
  const quoteTokenIcon = getTokenIcon(quoteToken.symbol, quoteToken.logo);

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
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
        {/* Position the second token overlapping the first */}
        <img
          src={quoteTokenIcon}
          alt={`${quoteToken.symbol} logo`}
          width={size}
          height={size}
          onError={(e) => {
            // Fallback to generic token icon if the image fails to load
            e.currentTarget.src = '/icons/default-token.svg';
          }}
          className="absolute rounded-full border border-white -ml-3"
          style={{ left: `${size / 2}px` }}
        />
      </div>
    </div>
  );
};

export default TokenPairDisplay;
