import {
  createDocument,
  type DiagramDocument,
  type DiagramElement,
} from "./document";
import { createComponent, type ComponentId } from "./componentCatalog";
import { lineBounds, type Point } from "./lines";

export function createIndustrialExamples() {
  const electrical = createDocument("电气一次图", 1800, 1000);
  const hvac = createDocument("暖通工艺图", 1800, 1000);
  const iso = createDocument("斜向管网图", 1800, 1000);
  for (const doc of [electrical, hvac, iso])
    doc.page.background = { color: "#171f43", mode: "contain", opacity: 1 };
  function add(
    doc: DiagramDocument,
    presetId: ComponentId,
    x: number,
    y: number,
    patch: Partial<DiagramElement> = {},
  ) {
    const item = { ...createComponent(presetId, doc), x, y, ...patch };
    doc.elements.push(item);
    return item;
  }
  function text(
    doc: DiagramDocument,
    name: string,
    x: number,
    y: number,
    width = 180,
    size = 18,
    color = "#edf3ff",
  ) {
    return add(doc, "text", x, y, {
      name,
      text: name,
      width,
      height: size * 1.8,
      color,
      visual: { mode: "plain", fontSize: size, align: "left" },
    });
  }
  function value(
    doc: DiagramDocument,
    prefix: string,
    binding: string,
    x: number,
    y: number,
    color = "#00dd88",
    width = 210,
  ) {
    return add(doc, "dataText", x, y, {
      name: prefix,
      binding,
      width,
      height: 28,
      color,
      visual: {
        mode: "plain",
        fontSize: 17,
        align: "left",
        prefix: prefix + ":",
        decimals: 2,
      },
    });
  }
  function pipe(
    doc: DiagramDocument,
    points: Point[],
    color: string,
    flowing = false,
    width = 4,
  ) {
    const b = lineBounds(points);
    const item: DiagramElement = {
      id: crypto.randomUUID(),
      kind: "line",
      name: flowing ? "流动管线" : "连接线",
      text: "",
      ...b,
      color,
      line: {
        type: "polyline",
        points: b.points,
        strokeWidth: width,
        dash: "solid",
        lineCap: "round",
        lineJoin: "round",
        startArrow: false,
        endArrow: false,
        flowColor: color === "#03dbcf" ? "#ff5555" : "#ffffff",
        flowWidth: 0.5,
      },
      ...(flowing
        ? { flow: { enabled: true, direction: "forward" as const, speed: 1 } }
        : {}),
    };
    doc.elements.unshift(item);
  }
  function panel(doc: DiagramDocument, title: string, x: number, y: number) {
    const groupId = crypto.randomUUID();
    const p = add(doc, "panel", x, y, {
      name: title + "面板",
      text: "",
      width: 220,
      height: 110,
      visual: {
        fill: "#082753",
        stroke: "#157ebe",
        strokeWidth: 1.5,
        mode: "plain",
      },
      groupId,
    });
    const titleItem = text(doc, title, x + 10, y + 4, 200, 15);
    const current = value(doc, "Ia", "current", x + 10, y + 34, "#ffff55", 100);
    const power = value(doc, "P", "power", x + 115, y + 34, "#ffff55", 95);
    const frequency = value(
      doc,
      "频率",
      "frequency",
      x + 10,
      y + 68,
      "#00dd88",
      195,
    );
    for (const e of [titleItem, current, power, frequency]) e.groupId = groupId;
    p.interaction = { action: "details" };
  }
  text(electrical, "6 段母线 · 变压器一次图", 510, 35, 900, 36);
  pipe(
    electrical,
    [
      { x: 90, y: 155 },
      { x: 1700, y: 155 },
    ],
    "#cc9f31",
    false,
    5,
  );
  text(electrical, "6# 母线", 90, 110);
  for (let i = 0; i < 6; i++) {
    const x = 100 + (i % 3) * 550,
      y = i < 3 ? 220 : 630;
    text(electrical, `${i + 1}# 配电室 / 进线柜`, x, y - 40, 350, 20);
    pipe(
      electrical,
      [
        { x: x + 55, y: i < 3 ? 155 : 580 },
        { x: x + 55, y: y + 15 },
      ],
      "#cc9f31",
    );
    add(electrical, "isolator", x + 30, y + 15, { color: "#19dd73" });
    add(electrical, "breaker", x + 30, y + 105, {
      color: "#19dd73",
      rules: [
        {
          id: crypto.randomUUID(),
          mode: "all",
          conditions: [{ pointId: "running", operator: "eq", value: 0 }],
          effects: { color: "#ff5555" },
        },
      ],
    });
    add(electrical, "transformer", x + 30, y + 195);
    pipe(
      electrical,
      [
        { x: x + 55, y: y + 285 },
        { x: x + 180, y: y + 285 },
        { x: x + 180, y: y + 70 },
        { x: x + 330, y: y + 70 },
      ],
      "#cc9f31",
      false,
      2,
    );
    add(electrical, "fuse", x + 310, y + 70, { width: 30, height: 55 });
    add(electrical, "ground", x + 310, y + 125, { width: 30, height: 45 });
    value(electrical, "Ua", "voltage", x + 210, y + 170, "#edf3ff");
    value(electrical, "Ia", "current", x + 210, y + 202, "#edf3ff");
    value(electrical, "P", "power", x + 210, y + 234, "#edf3ff");
    value(electrical, "PF", "powerFactor", x + 210, y + 266, "#edf3ff");
  }
  pipe(
    electrical,
    [
      { x: 90, y: 580 },
      { x: 1700, y: 580 },
    ],
    "#cc9f31",
    false,
    5,
  );
  text(hvac, "冷站设备与水系统", 650, 25, 600, 34);
  for (let i = 0; i < 3; i++) {
    const y = 170 + i * 200;
    text(hvac, `${i + 1}号冷却水泵`, 115, y - 25);
    add(hvac, "pump", 130, y, { width: 140, height: 140 });
    value(hvac, "频率", "frequency", 290, y + 15, "#ff5555");
    value(hvac, "P", "power", 290, y + 48, "#ffb000");
    value(hvac, "EPI", "energy", 290, y + 80);
    pipe(
      hvac,
      [
        { x: 85, y: y + 115 },
        { x: 200, y: y + 115 },
        { x: 470, y: y + 115 },
      ],
      "#03dbcf",
      true,
      10,
    );
    add(hvac, "pump", 1210, y, { width: 140, height: 140 });
    text(hvac, `${i + 1}号冷冻水泵`, 1200, y - 25);
    value(hvac, "频率", "frequency", 1370, y + 25, "#ff5555");
    value(hvac, "P", "power", 1370, y + 60, "#ffb000");
    pipe(
      hvac,
      [
        { x: 1100, y: y + 115 },
        { x: 1490, y: y + 115 },
      ],
      "#03dbcf",
      true,
      10,
    );
  }
  for (let i = 0; i < 2; i++) {
    const y = 220 + i * 350;
    add(hvac, "chiller", 650, y, { width: 300, height: 200 });
    text(hvac, `${i + 1}号冷水主机`, 690, y - 45, 300, 22);
    add(hvac, "valve", 530, y + 65, { width: 70, height: 70 });
    pipe(
      hvac,
      [
        { x: 470, y: y + 100 },
        { x: 1100, y: y + 100 },
      ],
      "#03dbcf",
      true,
      10,
    );
  }
  for (const x of [85, 470, 1100, 1490])
    pipe(
      hvac,
      [
        { x, y: 285 },
        { x, y: 850 },
      ],
      "#03dbcf",
      true,
      10,
    );
  add(hvac, "tank", 180, 770, { width: 180, height: 120 });
  add(hvac, "tank", 1180, 770, { width: 180, height: 120 });
  value(hvac, "供水温度", "temperature", 570, 850, "#ffb000");
  value(hvac, "供水压力", "pressure", 570, 888);
  value(hvac, "阀门开度", "opening", 1500, 220, "#edf3ff");

  text(iso, "能源站 · 斜向管网", 640, 25, 600, 34);
  const blue = "#298dff",
    orange = "#ffac3b";
  pipe(
    iso,
    [
      { x: 140, y: 610 },
      { x: 750, y: 300 },
      { x: 1420, y: 610 },
      { x: 820, y: 910 },
      { x: 140, y: 610 },
    ],
    blue,
    true,
    7,
  );
  pipe(
    iso,
    [
      { x: 690, y: 560 },
      { x: 1260, y: 270 },
      { x: 1670, y: 470 },
      { x: 1060, y: 780 },
      { x: 690, y: 560 },
    ],
    orange,
    true,
    7,
  );
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4;
    const start = { x: 140 + 680 * t, y: 610 + 300 * t };
    const end = { x: 750 + 670 * t, y: 300 + 310 * t };
    pipe(iso, [start, end], blue, true, 7);
    const x = start.x + (end.x - start.x) * 0.28 - 60,
      y = start.y + (end.y - start.y) * 0.28 - 60;
    add(iso, "pumpIso", x, y, { width: 120, height: 100 });
    add(iso, "valveIso", x - 65, y + 35, { width: 45, height: 45 });
    panel(iso, `${i + 1}# 空调侧循环泵`, 220 + i * 245, 920);
    const rightStart = { x: 690 + 370 * t, y: 560 + 220 * t };
    const rightEnd = { x: 1260 + 410 * t, y: 270 + 200 * t };
    pipe(iso, [rightStart, rightEnd], orange, true, 7);
    const rx = rightStart.x + (rightEnd.x - rightStart.x) * 0.73 - 57,
      ry = rightStart.y + (rightEnd.y - rightStart.y) * 0.73 - 57;
    add(iso, "pumpIso", rx, ry, { width: 115, height: 95 });
    panel(iso, `${i + 1}# 地源侧循环泵`, 1030 + i * 245, 115);
  }
  add(iso, "chillerIso", 730, 465, { width: 220, height: 150 });
  add(iso, "chillerIso", 910, 655, { width: 220, height: 150 });
  add(iso, "tankIso", 410, 385, { width: 140, height: 110 });
  add(iso, "tankIso", 1370, 640, { width: 140, height: 110 });
  panel(iso, "主机监测", 630, 145);
  value(iso, "供水压力", "pressure", 110, 300, "#ffff55");
  value(iso, "供水温度", "temperature", 110, 338, "#ffff55");
  for (const doc of [electrical, hvac, iso]) {
    const target = doc === electrical ? hvac : doc === hvac ? iso : electrical;
    add(doc, "button", 1480, 35, {
      name: "查看" + target.name,
      text: "查看" + target.name,
      width: 240,
      height: 55,
      color: "#ffffff",
      visual: {
        mode: "plain",
        fill: "#198fff",
        stroke: "#198fff",
        fontSize: 20,
      },
      interaction: { action: "navigate", pageId: target.page.id },
    });
  }
  electrical.name = "工业组态绘制示例";
  electrical.otherPages = [hvac, iso].map((doc) => ({
    name: doc.name,
    page: doc.page,
    elements: doc.elements,
  }));
  return electrical;
}
