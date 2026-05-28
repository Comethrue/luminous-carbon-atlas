export function ScanlineOverlay() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,136,255,1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Scan line */}
      <div className="absolute inset-0 scanline" />
      {/* Vignette */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(6,11,20,0.75) 100%)',
        }}
      />
      {/* Top glow orb */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, rgba(0,180,255,1) 0%, transparent 70%)' }}
      />
    </div>
  );
}
