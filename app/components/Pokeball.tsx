// Pokeball SVG — gebruikt in nav (30x30) en als card-art watermark
export default function Pokeball({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 2px 3px rgba(11,42,74,.25))" }}
    >
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#0B2A4A" strokeWidth="5" />
      <path d="M5 50a45 45 0 0 1 90 0z" fill="#EE1515" />
      <path d="M4 50h92" stroke="#0B2A4A" strokeWidth="6" />
      <circle cx="50" cy="50" r="13" fill="#fff" stroke="#0B2A4A" strokeWidth="6" />
    </svg>
  );
}
