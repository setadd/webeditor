export type Comparison = "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
export interface RuleCondition {
  pointId: string;
  operator: Comparison;
  value: number;
}
export interface FlowEffect {
  enabled: boolean;
  direction: "forward" | "reverse" | "stopped";
  speed: number;
}
export interface DisplayEffects {
  color?: string;
  imageId?: string;
  flow?: FlowEffect;
}
export interface DisplayRule {
  id: string;
  mode: "all" | "any";
  conditions: RuleCondition[];
  effects: DisplayEffects;
}
export interface RuleSample {
  value: number | null;
  quality: string;
}
export interface EffectiveDisplay extends DisplayEffects {
  abnormal: boolean;
}
export function rulePointIds(rules: DisplayRule[] = []): string[] {
  return [
    ...new Set(
      rules.flatMap((rule) =>
        rule.conditions.map((condition) => condition.pointId),
      ),
    ),
  ];
}
export function evaluateRules(
  base: DisplayEffects,
  rules: DisplayRule[] = [],
  samples: Record<string, RuleSample> = {},
  binding?: string,
): EffectiveDisplay {
  const result: EffectiveDisplay = { ...base, abnormal: false };
  const dependencies = [...rulePointIds(rules), ...(binding ? [binding] : [])];
  if (
    dependencies.some(
      (id) =>
        samples[id]?.quality !== "good" ||
        typeof samples[id]?.value !== "number" ||
        !Number.isFinite(samples[id]?.value),
    )
  ) {
    result.abnormal = true;
    if (result.flow) result.flow = { ...result.flow, direction: "stopped" };
    return result;
  }
  const matched = new Set<keyof DisplayEffects>();
  for (const rule of rules) {
    const matches = rule.conditions.map((c) => {
      const value = samples[c.pointId]!.value!;
      switch (c.operator) {
        case "eq":
          return value === c.value;
        case "ne":
          return value !== c.value;
        case "gt":
          return value > c.value;
        case "gte":
          return value >= c.value;
        case "lt":
          return value < c.value;
        case "lte":
          return value <= c.value;
      }
    });
    if (
      !matches.length ||
      !(rule.mode === "all" ? matches.every(Boolean) : matches.some(Boolean))
    )
      continue;
    if (rule.effects.color !== undefined && !matched.has("color")) {
      result.color = rule.effects.color;
      matched.add("color");
    }
    if (rule.effects.imageId !== undefined && !matched.has("imageId")) {
      result.imageId = rule.effects.imageId;
      matched.add("imageId");
    }
    if (rule.effects.flow !== undefined && !matched.has("flow")) {
      result.flow = { ...rule.effects.flow };
      matched.add("flow");
    }
  }
  return result;
}

export function isValidRules(value: unknown): value is DisplayRule[] {
  const record = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const rule of value) {
    if (
      !record(rule) ||
      typeof rule.id !== "string" ||
      !rule.id ||
      ids.has(rule.id) ||
      !["all", "any"].includes(String(rule.mode)) ||
      !Array.isArray(rule.conditions) ||
      !rule.conditions.length ||
      !record(rule.effects)
    )
      return false;
    ids.add(rule.id);
    if (
      !rule.conditions.every(
        (c) =>
          record(c) &&
          typeof c.pointId === "string" &&
          c.pointId.length > 0 &&
          ["eq", "ne", "gt", "gte", "lt", "lte"].includes(String(c.operator)) &&
          typeof c.value === "number" &&
          Number.isFinite(c.value),
      )
    )
      return false;
    const e = rule.effects;
    if (
      e.color !== undefined &&
      (typeof e.color !== "string" || !/^#[\da-f]{6}$/i.test(e.color))
    )
      return false;
    if (
      e.imageId !== undefined &&
      (typeof e.imageId !== "string" || !e.imageId)
    )
      return false;
    if (
      e.flow !== undefined &&
      (!record(e.flow) ||
        typeof e.flow.enabled !== "boolean" ||
        !["forward", "reverse", "stopped"].includes(String(e.flow.direction)) ||
        typeof e.flow.speed !== "number" ||
        !Number.isFinite(e.flow.speed) ||
        e.flow.speed <= 0)
    )
      return false;
  }
  return true;
}
