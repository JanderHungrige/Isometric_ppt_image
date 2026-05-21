import { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { Download, Upload, Layers } from "lucide-react";
import defaultScreenshot from "@/imports/image-1.png";

const CARD_WIDTH = 580;

const RATIOS = [
  { label: "Auto", value: "auto" },
  { label: "16:9", value: "16:9" },
  { label: "4:3",  value: "4:3"  },
  { label: "1:1",  value: "1:1"  },
  { label: "3:2",  value: "3:2"  },
] as const;
type RatioValue = typeof RATIOS[number]["value"];

function calcHeight(r: RatioValue, naturalH: number) {
  switch (r) {
    case "16:9": return Math.round(CARD_WIDTH * 9 / 16);
    case "4:3":  return Math.round(CARD_WIDTH * 3 / 4);
    case "1:1":  return CARD_WIDTH;
    case "3:2":  return Math.round(CARD_WIDTH * 2 / 3);
    case "auto": return naturalH;
  }
}

const BG_PRESETS = [
  { label: "White",  from: "#ffffff", to: "#e2e8f0" },
  { label: "Dark",   from: "#020617", to: "#1e293b" },
  { label: "Indigo", from: "#1e1b4b", to: "#312e81" },
  { label: "Teal",   from: "#042f2e", to: "#134e4a" },
  { label: "Rose",   from: "#4c0519", to: "#881337" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to measure an image from a data-url
// ─────────────────────────────────────────────────────────────────────────────
function measureImage(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(Math.round(CARD_WIDTH * img.naturalHeight / img.naturalWidth));
    img.src = src;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target!.result as string);
    r.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const uiRef     = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // ── current image ──────────────────────────────────────────────────────────
  const [src,      setSrc]      = useState(defaultScreenshot);
  const [natH,     setNatH]     = useState(Math.round(CARD_WIDTH * 9 / 16));
  const [ratio,    setRatio]    = useState<RatioValue>("auto");

  // ── compare: ghost is ALWAYS set when compare mode is active ──────────────
  // compareOn=true  → ghost is shown, next upload replaces main card only
  // compareOn=false → no ghost; toggling ON freezes current image into ghost
  const [compareOn,    setCompareOn]    = useState(false);
  const [ghostSrc,     setGhostSrc]     = useState<string | null>(null);
  const [ghostNatH,    setGhostNatH]    = useState(Math.round(CARD_WIDTH * 9 / 16));
  const [ghostOpacity, setGhostOpacity] = useState(0.4);

  // ── 3-D rotation ──────────────────────────────────────────────────────────
  const [rotX, setRotX] = useState(45);
  const [rotZ, setRotZ] = useState(50);

  // ── card position ─────────────────────────────────────────────────────────
  const [cardPos,    setCardPos]    = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  // ── background ────────────────────────────────────────────────────────────
  const [bgIdx,       setBgIdx]       = useState(0);
  const [customFrom,  setCustomFrom]  = useState("#ffffff");
  const [customTo,    setCustomTo]    = useState("#e2e8f0");
  const [showCustom,  setShowCustom]  = useState(false);

  const activeBg = showCustom
    ? { from: customFrom, to: customTo }
    : BG_PRESETS[bgIdx];

  // ── card edge/depth colour (the layered box-shadow "thickness") ───────────
  const [edgeColor, setEdgeColor] = useState("#000000");

  // ── file drop ─────────────────────────────────────────────────────────────
  const [isFileDrop, setIsFileDrop] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARE TOGGLE
  // Press button → freeze current image as ghost, enable compare mode.
  // Press again  → disable compare mode (ghost stays in memory for next time).
  // ─────────────────────────────────────────────────────────────────────────
  function handleToggleCompare() {
    if (!compareOn) {
      // Freeze NOW — src/natH are plain state values, always fresh here
      setGhostSrc(src);
      setGhostNatH(natH);
      setCompareOn(true);
    } else {
      setCompareOn(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD NEW IMAGE
  // This is called AFTER the user picks a file. Compare state is already
  // committed at this point — no closure issues because we use the setter
  // pattern with no captured values.
  // ─────────────────────────────────────────────────────────────────────────
  async function handleNewImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    const newSrc  = await readFile(file);
    const newNatH = await measureImage(newSrc);
    // Always just update the main card — ghost is only updated by toggleCompare
    setSrc(newSrc);
    setNatH(newNatH);
    setRatio("auto");
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleNewImage(file);
    e.target.value = "";
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDrop(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleNewImage(file);
  };

  // ── mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: cardPos.x, py: cardPos.y };
    setIsDragging(true);
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setCardPos({
        x: dragRef.current.px + e.clientX - dragRef.current.sx,
        y: dragRef.current.py + e.clientY - dragRef.current.sy,
      });
    };
    const up = () => { dragRef.current = null; setIsDragging(false); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  // ── download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    if (uiRef.current) uiRef.current.style.visibility = "hidden";
    const prev = el.style.cssText;
    el.style.cssText = prev + "; background: transparent !important;";
    const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2, backgroundColor: "transparent" });
    el.style.cssText = prev;
    if (uiRef.current) uiRef.current.style.visibility = "";
    const link = document.createElement("a");
    link.download = "isometric-preview.png";
    link.href = dataUrl;
    link.click();
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const height      = calcHeight(ratio, natH);
  const ghostHeight = calcHeight("auto", ghostNatH);
  const tx  = `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
  const txH = `rotateX(${rotX}deg) rotateZ(${rotZ}deg) translateZ(12px)`;
  const bgStyle = `linear-gradient(135deg, ${activeBg.from}, ${activeBg.to})`;

  // Build the layered box-shadow from edgeColor (hex → use at various opacities)
  const ec = edgeColor;
  function hexOpacity(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const cardBoxShadow = `
    0 2px 0 rgba(255,255,255,0.08) inset,
    0 -1px 0 ${hexOpacity(ec,0.6)} inset,
    4px 4px 0 ${hexOpacity(ec,0.35)},
    8px 8px 0 ${hexOpacity(ec,0.28)},
    12px 12px 0 ${hexOpacity(ec,0.20)},
    16px 16px 0 ${hexOpacity(ec,0.14)},
    20px 20px 0 ${hexOpacity(ec,0.08)},
    24px 48px 80px ${hexOpacity(ec,0.9)},
    0 0 0 1px rgba(255,255,255,0.06)
  `;

  const cardLeft = `calc(50% + ${cardPos.x}px)`;
  const cardTop  = `calc(50% + ${cardPos.y}px)`;

  // ── button style helpers ──────────────────────────────────────────────────
  const btn = "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-gray-800 border border-black/10 bg-white/80 backdrop-blur-md hover:bg-white hover:border-black/20 transition-all duration-200 cursor-pointer shadow-sm";
  const pill = "flex items-center gap-1 px-2 py-1.5 rounded-full border border-black/10 bg-white/80 backdrop-blur-md shadow-sm";
  const pillBtn = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${active ? "bg-indigo-500 text-white" : "text-gray-600 hover:text-gray-900"}`;

  return (
    <div
      ref={canvasRef}
      className="size-full flex items-center justify-center overflow-hidden"
      style={{ background: bgStyle }}
      onDrop={handleFileDrop}
      onDragOver={(e) => { e.preventDefault(); setIsFileDrop(true); }}
      onDragLeave={() => setIsFileDrop(false)}
    >
      {isFileDrop && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/20 border-2 border-dashed border-indigo-400 rounded-xl pointer-events-none">
          <p className="text-indigo-700 text-lg font-medium">Drop image here</p>
        </div>
      )}

      {/* ── Ghost ── */}
      {compareOn && ghostSrc && (
        <div style={{
          position: "absolute", left: cardLeft, top: cardTop,
          transform: "translate(-50%,-50%)",
          perspective: "1200px", perspectiveOrigin: "50% 30%",
          pointerEvents: "none", opacity: ghostOpacity, zIndex: 0,
        }}>
          <div style={{
            position: "relative", width: CARD_WIDTH, height: ghostHeight,
            borderRadius: 14, overflow: "hidden",
            transform: tx, transformStyle: "preserve-3d",
          }}>
            <img src={ghostSrc} alt="ghost" className="w-full h-full object-cover" draggable={false} />
          </div>
        </div>
      )}

      {/* ── Main card ── */}
      <div
        style={{
          position: "absolute", left: cardLeft, top: cardTop,
          transform: "translate(-50%,-50%)", zIndex: 1,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={onMouseDown}
      >
        <div style={{ perspective: "1200px", perspectiveOrigin: "50% 30%" }}>
          <div
            className="isometric-card"
            style={{ height, "--tx": tx, "--txh": txH, boxShadow: cardBoxShadow } as React.CSSProperties}
          >
            <div className="screen-glare" />
            <img src={src} alt="preview" className="w-full h-full object-cover"
              style={{ display: "block", pointerEvents: "none", userSelect: "none" }}
              draggable={false}
            />
          </div>
          <div className="ground-shadow" />
        </div>
      </div>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* ── Toolbar ── */}
      <div ref={uiRef} className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-8 left-8 flex flex-col gap-2 pointer-events-auto">

          {/* Row 1: Upload + Ratio + Compare */}
          <div className="flex items-center gap-2 flex-wrap">
            <button className={btn} onClick={() => uploadRef.current?.click()}>
              <Upload size={15} /> Upload Image
            </button>

            <div className={pill}>
              {RATIOS.map(r => (
                <button key={r.value} className={pillBtn(ratio === r.value)} onClick={() => setRatio(r.value)}>
                  {r.label}
                </button>
              ))}
            </div>

            <div className={pill + " gap-2"}>
              <button
                onClick={handleToggleCompare}
                className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-all ${compareOn ? "text-indigo-600 font-semibold" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Layers size={13} /> Compare
              </button>
              {compareOn && (
                <input type="range" min={0.05} max={0.95} step={0.05} value={ghostOpacity}
                  onChange={e => setGhostOpacity(Number(e.target.value))}
                  className="w-20 accent-indigo-500 cursor-pointer" title="Ghost opacity" />
              )}
            </div>
          </div>

          {/* Row 2: 3D rotation */}
          <div className={pill + " gap-3 px-4 py-2.5 rounded-2xl"}>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">3D</span>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <span className="w-9">rotX</span>
              <input type="range" min={0} max={90} step={1} value={rotX}
                onChange={e => setRotX(Number(e.target.value))}
                className="w-28 accent-indigo-500 cursor-pointer" />
              <span className="w-7 tabular-nums text-right">{rotX}°</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <span className="w-9">rotZ</span>
              <input type="range" min={0} max={90} step={1} value={rotZ}
                onChange={e => setRotZ(Number(e.target.value))}
                className="w-28 accent-indigo-500 cursor-pointer" />
              <span className="w-7 tabular-nums text-right">{rotZ}°</span>
            </label>
            <button onClick={() => { setRotX(45); setRotZ(50); }}
              className="text-[10px] text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">
              reset
            </button>
          </div>

          {/* Row 3: Background + Shadow colour */}
          <div className={pill + " gap-1.5"}>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">BG</span>
            {BG_PRESETS.map((p, i) => (
              <button key={p.label}
                onClick={() => { setBgIdx(i); setShowCustom(false); }}
                title={p.label}
                className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${!showCustom && bgIdx === i ? "border-indigo-500 scale-110" : "border-transparent hover:scale-105"}`}
                style={{ background: `linear-gradient(135deg,${p.from},${p.to})` }}
              />
            ))}
            <button
              onClick={() => setShowCustom(v => !v)}
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${showCustom ? "text-indigo-600 font-semibold" : "text-gray-500 hover:text-gray-800"}`}
            >
              Custom
            </button>
            {showCustom && (
              <>
                <input type="color" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-black/10" title="From" />
                <input type="color" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-black/10" title="To" />
              </>
            )}
            <div className="w-px h-4 bg-black/10 mx-1" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Depth</span>
            <input type="color" value={edgeColor} onChange={e => setEdgeColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-black/10" title="Card depth/edge colour" />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleDownload}
          className={"absolute bottom-8 right-8 pointer-events-auto " + btn}
        >
          <Download size={15} /> Save PNG
        </button>
      </div>

      <style>{`
        .isometric-card {
          position: relative;
          width: ${CARD_WIDTH}px;
          max-width: 90vw;
          border-radius: 14px;
          overflow: hidden;
          transform: var(--tx);
          transform-style: preserve-3d;
          transition: height 0.3s ease;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.08) inset,
            0 -1px 0 rgba(0,0,0,0.6) inset,
            4px 4px 0 rgba(0,0,0,0.35),
            8px 8px 0 rgba(0,0,0,0.28),
            12px 12px 0 rgba(0,0,0,0.20),
            16px 16px 0 rgba(0,0,0,0.14),
            20px 20px 0 rgba(0,0,0,0.08),
            24px 48px 80px rgba(0,0,0,0.9),
            0 0 0 1px rgba(255,255,255,0.06);
          animation: iso-float 5s ease-in-out infinite;
        }
        .isometric-card:hover {
          animation-play-state: paused;
          transform: var(--txh);
          transition: transform 0.4s ease, box-shadow 0.4s ease, height 0.3s ease;
        }
        .screen-glare {
          position: absolute; inset: 0; z-index: 1;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 30%, transparent 60%);
          pointer-events: none;
        }
        .ground-shadow {
          position: absolute; bottom: -60px; left: 50%;
          transform: translateX(-50%);
          width: 380px; height: 60px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%);
          filter: blur(16px);
          animation: shadow-pulse 5s ease-in-out infinite;
        }
        @keyframes iso-float {
          0%,100% { transform: var(--tx) translateY(0px); }
          50%      { transform: var(--tx) translateY(-14px); }
        }
        @keyframes shadow-pulse {
          0%,100% { opacity:0.7; transform:translateX(-50%) scaleX(1); }
          50%      { opacity:0.4; transform:translateX(-50%) scaleX(0.88); }
        }
      `}</style>
    </div>
  );
}
