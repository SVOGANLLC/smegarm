import { useRef, useState } from "react";

export function ProductImageZoom({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setPos({ x, y });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos(null)}
      className="relative aspect-square overflow-hidden rounded-sm bg-white cursor-zoom-in"
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain p-10 transition-opacity duration-200"
        style={{ opacity: pos ? 0 : 1 }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
        style={{
          opacity: pos ? 1 : 0,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "220%",
          backgroundPosition: pos ? `${pos.x}% ${pos.y}%` : "center",
        }}
      />
    </div>
  );
}