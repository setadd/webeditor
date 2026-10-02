import { rulePointIds } from "../domain/rules";
import { shallowRef, watch, onScopeDispose, type Ref } from "vue";
import type { DiagramDocument } from "../domain/document";
export interface Point {
  id: string;
  name: string;
  unit: string;
}
export interface Sample {
  pointId: string;
  value: number | null;
  timestamp: number;
  quality: "good" | "unavailable";
}
export interface HistorySample {
  timestamp: number;
  value: number;
}
export interface DataProvider {
  catalog(): Point[];
  snapshot(): Record<string, Sample>;
  subscribe(ids: string[], listener: (sample: Sample) => void): () => void;
  history(id: string, from: number, to: number): HistorySample[];
}
const points: Point[] = [
  { id: "voltage", name: "电压", unit: "V" },
  { id: "current", name: "电流", unit: "A" },
  { id: "power", name: "功率", unit: "kW" },
  { id: "energy", name: "累计电量", unit: "kW·h" },
  { id: "frequency", name: "频率", unit: "Hz" },
  { id: "pressure", name: "压力", unit: "MPa" },
  { id: "opening", name: "阀门开度", unit: "%" },
  { id: "powerFactor", name: "功率因数", unit: "" },
  { id: "temperature", name: "温度", unit: "°C" },
  { id: "running", name: "运行状态", unit: "" },
  { id: "fault", name: "故障状态", unit: "" },
  { id: "flow", name: "流量", unit: "m³/h" },
];
const values: Record<string, number> = {
  voltage: 380,
  current: 12.5,
  power: 8.2,
  energy: 41104.27,
  frequency: 50,
  pressure: 0.22,
  opening: 100,
  powerFactor: 0.98,
  temperature: 25,
  running: 1,
  fault: 0,
  flow: 12,
};
const samples: Record<string, Sample> = {};
const histories: Record<string, HistorySample[]> = {};
const listeners = new Set<{
  ids: Set<string>;
  callback: (s: Sample) => void;
}>();
for (const point of points) {
  const now = Date.now();
  samples[point.id] = {
    pointId: point.id,
    value: values[point.id]!,
    timestamp: now,
    quality: "good",
  };
  histories[point.id] = Array.from({ length: 31 }, (_, i) => ({
    timestamp: now - (30 - i) * 60000,
    value:
      values[point.id]! +
      (point.id === "temperature" || point.id === "flow"
        ? Math.round(Math.sin(i / 4) * 30) / 10
        : 0),
  }));
}
export const mockDataProvider: DataProvider = {
  catalog: () => points,
  snapshot: () => structuredClone(samples),
  subscribe(ids, callback) {
    const entry = { ids: new Set(ids), callback };
    listeners.add(entry);
    ids.forEach((id) =>
      callback(
        samples[id] || {
          pointId: id,
          value: null,
          timestamp: Date.now(),
          quality: "unavailable",
        },
      ),
    );
    return () => {
      listeners.delete(entry);
    };
  },
  history: (id, from, to) =>
    (histories[id] || []).filter(
      (s) => s.timestamp >= from && s.timestamp <= to,
    ),
};
export function setMockPoint(id: string, value: number, available = true) {
  if (!Number.isFinite(value) || !points.some((p) => p.id === id)) return;
  values[id] = value;
  const sample: Sample = {
    pointId: id,
    value: available ? value : null,
    quality: available ? "good" : "unavailable",
    timestamp: Date.now(),
  };
  samples[id] = sample;
  if (available) {
    histories[id]!.push({ timestamp: sample.timestamp, value });
    histories[id] = histories[id]!.slice(-500);
  }
  for (const entry of listeners) if (entry.ids.has(id)) entry.callback(sample);
}
export function useMockData(
  document: Ref<DiagramDocument>,
  provider: DataProvider = mockDataProvider,
  enabled?: Ref<boolean>,
) {
  const current = shallowRef<Record<string, Sample>>({});
  const history = shallowRef<Record<string, HistorySample[]>>({});
  let unsubscribe = () => {};
  watch(
    () => [
      enabled?.value,
      document.value.page.id,
      ...document.value.elements.flatMap((e) => rulePointIds(e.rules)),
      ...document.value.elements.map((e) => e.binding || ""),
    ],
    () => {
      unsubscribe();
      current.value = {};
      history.value = {};
      if (enabled && !enabled.value) return;
      const ids = [
        ...new Set(
          document.value.elements
            .flatMap((e) => [e.binding, ...rulePointIds(e.rules)])
            .filter((id): id is string => !!id),
        ),
      ];
      unsubscribe = provider.subscribe(ids, (sample) => {
        current.value = { ...current.value, [sample.pointId]: sample };
        history.value = {
          ...history.value,
          [sample.pointId]: provider.history(
            sample.pointId,
            Date.now() - 3600000,
            Date.now(),
          ),
        };
      });
    },
    { immediate: true },
  );
  onScopeDispose(() => unsubscribe());
  return { samples: current, history, provider };
}
