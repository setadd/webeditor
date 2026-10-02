import type { SymbolName, VisualStyle } from "./visual";

/** Built-in trusted vector artwork; uploaded images continue through the raster asset validator. */
export function symbolUrl(
  name: SymbolName,
  color: string,
  visual: VisualStyle = {},
) {
  const fill = visual.fill || "none";
  const stroke = visual.stroke || color;
  const width = visual.strokeWidth ?? 2;
  const electric: Partial<Record<SymbolName, string>> = {
    breaker:
      '<path d="M50 0V32M50 68V100"/><rect x="37" y="32" width="26" height="36"/><path d="M38 64L62 36"/>',
    isolator:
      '<path d="M50 0V30M50 70V100M50 70L78 35"/><circle cx="50" cy="30" r="3"/>',
    transformer:
      '<path d="M50 0V24M50 76V100"/><circle cx="50" cy="41" r="18"/><circle cx="50" cy="59" r="18"/>',
    ground: '<path d="M50 0V55M20 55H80M30 68H70M40 81H60"/>',
    fuse: '<path d="M50 0V100"/><rect x="40" y="26" width="20" height="48"/>',
    motor:
      '<path d="M50 0V22M50 78V100"/><circle cx="50" cy="50" r="28"/><path d="M35 64V36L50 52 65 36V64"/>',
  };
  const primitives: Partial<Record<SymbolName, string>> = {
    rectangle: `<rect x="2" y="2" width="96" height="96" fill="${fill}"/>`,
    ellipse: `<ellipse cx="50" cy="50" rx="47" ry="47" fill="${fill}"/>`,
    button: `<rect x="2" y="2" width="96" height="96" rx="12" fill="${fill}"/>`,
    panel: `<rect x="2" y="2" width="96" height="96" rx="3" fill="${fill}"/><path d="M2 18V2H18M82 2H98V18M98 82V98H82M18 98H2V82" stroke-width="4"/>`,
  };
  const equipment: Record<string, string> = {
    pump: '<path d="M10 76H92V91H10Z" fill="url(#metal)"/><path d="M18 90V97H85V90" fill="#17375e"/><circle cx="51" cy="51" r="29" fill="url(#metal)"/><circle cx="51" cy="51" r="19" fill="#0b4369"/><path d="M51 34L60 53 42 64Z" fill="url(#metal)"/><path d="M74 43H96V59H74" fill="url(#metal)"/><rect x="30" y="13" width="42" height="14" rx="4" fill="url(#metal)"/>',
    valve:
      '<path d="M5 35L50 60 5 85ZM95 35L50 60 95 85Z" fill="url(#metal)"/><path d="M50 60V15M27 15H73"/><ellipse cx="50" cy="15" rx="27" ry="8" fill="url(#metal)"/><path d="M5 30V90M95 30V90" stroke-width="5"/>',
    tank: '<path d="M18 22H82V78H18Z" fill="url(#metal)"/><ellipse cx="18" cy="50" rx="13" ry="28" fill="url(#metal)"/><ellipse cx="82" cy="50" rx="13" ry="28" fill="url(#metal)"/><path d="M30 22V8H40V22M60 22V8H70V22M30 78V91M70 78V91" stroke-width="7"/><path d="M19 92H43M57 92H81" stroke="#193a5c" stroke-width="7"/>',
    chiller:
      '<rect x="9" y="56" width="82" height="30" rx="14" fill="url(#metal)"/><rect x="19" y="15" width="65" height="43" rx="3" fill="url(#metal)"/><rect x="24" y="19" width="27" height="34" rx="5" fill="#b9dce9"/><rect x="55" y="19" width="24" height="34" fill="#edf6fa"/><path d="M59 24H74M59 30H74M59 36H74M24 85V95M79 85V95"/><circle cx="13" cy="70" r="10" fill="#074676"/>',
  };
  const iso = name.endsWith("Iso");
  const base = name.replace("Iso", "");
  const artwork = electric[name] || primitives[name] || equipment[base] || "";
  const transform = iso ? "translate(6 15) skewY(-12) scale(.88 .85)" : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d5f4ff"/><stop offset=".35" stop-color="${color}"/><stop offset=".75" stop-color="#1875ac"/><stop offset="1" stop-color="#063b66"/></linearGradient></defs><g transform="${transform}" stroke="${stroke}" stroke-width="${width}" fill="none" stroke-linejoin="round">${artwork}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
