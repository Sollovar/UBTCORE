// Create a utility function to get token icons with fallback handling
const getTokenIcon = (tokenSymbol: string, logoUrl?: string): string => {
  if (logoUrl) {
    return logoUrl;
  }

  // Fallback to common icon mapping if no logo URL provided
  const iconMap: Record<string, string> = {
    ETH: '/icons/eth.svg',
    BTC: '/icons/btc.svg',
    USDC: '/icons/usdc.svg',
    USDT: '/icons/usdt.svg',
    STO: '/icons/sto.svg', // Adding the specific token from your logs
    // Add more as needed
  };

  return iconMap[tokenSymbol.toUpperCase()] || '/icons/default-token.svg';
};

export default getTokenIcon;
