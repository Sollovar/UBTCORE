/* Inline SVG chain logo components — no external deps */

export function BscIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      {/* BNB diamond pattern */}
      <path
        fill="#FFFFFF"
        d="M12.116 14.404L16 10.52l3.884 3.884 2.26-2.26L16 6 9.856 12.144l2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.884-3.884 2.26 2.26L16 26l-6.144-6.144 2.26-2.26zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.144 0L16 13.664 13.664 16 16 18.336 18.336 16z"
      />
    </svg>
  );
}

export function BaseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      {/* Base "b" wordmark arc */}
      <path
        fill="#FFFFFF"
        d="M16.076 6.4C10.754 6.4 6.4 10.754 6.4 16.076c0 5.322 4.354 9.676 9.676 9.676 5.002 0 9.133-3.604 9.648-8.297h-9.634v-2.758h12.51C28.19 10.185 22.601 6.4 16.076 6.4z"
      />
    </svg>
  );
}

export function SolanaIcon({ size = 20 }: { size?: number }) {
  const id = `sol-g-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#1A1A2E" />
      <defs>
        <linearGradient id={id} x1="7" y1="25" x2="25" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#9945FF" />
          <stop offset="50%"  stopColor="#7B2FBE" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      {/* Three Solana diagonal stripes */}
      <path
        fill={`url(#${id})`}
        d="M8.5 20.5h14l-1.5 2H7l1.5-2zm0-5.5h14l-1.5 2H7l1.5-2zm1.5-5.5h14L22.5 12H8.5l1.5-2.5z"
      />
    </svg>
  );
}

/* Generic lookup by network id */
export function ChainIcon({ id, size = 20 }: { id: "bsc" | "base" | "solana"; size?: number }) {
  if (id === "bsc")    return <BscIcon size={size} />;
  if (id === "base")   return <BaseIcon size={size} />;
  if (id === "solana") return <SolanaIcon size={size} />;
  return null;
}
