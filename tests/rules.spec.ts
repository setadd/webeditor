import { test, expect } from "@playwright/test";
import { evaluateRules, type DisplayRule } from "../src/domain/rules";
const rule: DisplayRule = {
  id: "hot",
  mode: "all",
  conditions: [{ pointId: "temperature", operator: "gt", value: 80 }],
  effects: { color: "#ff0000" },
};
test("规则温度边界与恢复默认不改变基础输入", () => {
  const base = { color: "#00ff00" };
  for (const [value, color] of [
    [79, "#00ff00"],
    [80, "#00ff00"],
    [81, "#ff0000"],
    [79, "#00ff00"],
  ] as const) {
    expect(
      evaluateRules(base, [rule], { temperature: { value, quality: "good" } }),
    ).toEqual({ color, abnormal: false });
  }
  expect(base.color).toBe("#00ff00");
});

test("六种比较、多点位且或和逐属性优先匹配", () => {
  const samples = {
    temperature: { value: 80, quality: "good" },
    running: { value: 1, quality: "good" },
  };
  for (const [operator, hit] of [
    ["eq", true],
    ["ne", false],
    ["gt", false],
    ["gte", true],
    ["lt", false],
    ["lte", true],
  ] as const) {
    expect(
      evaluateRules(
        { color: "#00ff00" },
        [
          {
            ...rule,
            conditions: [{ pointId: "temperature", operator, value: 80 }],
          },
        ],
        samples,
      ).color,
    ).toBe(hit ? "#ff0000" : "#00ff00");
  }
  const compound: DisplayRule = {
    ...rule,
    conditions: [
      ...rule.conditions,
      { pointId: "running", operator: "eq", value: 1 },
    ],
  };
  expect(evaluateRules({ color: "#00ff00" }, [compound], samples).color).toBe(
    "#00ff00",
  );
  expect(
    evaluateRules({ color: "#00ff00" }, [{ ...compound, mode: "any" }], samples)
      .color,
  ).toBe("#ff0000");
  const high: DisplayRule = {
    ...compound,
    mode: "any",
    effects: { imageId: "fault" },
  };
  const low: DisplayRule = {
    ...compound,
    mode: "any",
    effects: {
      color: "#0000ff",
      imageId: "running",
      flow: { enabled: true, direction: "reverse", speed: 2 },
    },
  };
  expect(
    evaluateRules(
      { color: "#00ff00", imageId: "default" },
      [high, low],
      samples,
    ),
  ).toEqual({
    color: "#0000ff",
    imageId: "fault",
    flow: { enabled: true, direction: "reverse", speed: 2 },
    abnormal: false,
  });
  expect(
    evaluateRules({ imageId: "default" }, [low, high], samples).imageId,
  ).toBe("running");
});

test("缺失、空值、NaN、不可用及未命中规则依赖都保守回退并停止流动", () => {
  const base = {
    color: "#00ff00",
    imageId: "default",
    flow: { enabled: true, direction: "forward" as const, speed: 2 },
  };
  const rules: DisplayRule[] = [
    rule,
    {
      id: "fault",
      mode: "all",
      conditions: [{ pointId: "fault", operator: "eq", value: 1 }],
      effects: { imageId: "fault" },
    },
  ];
  for (const bad of [
    undefined,
    { value: null, quality: "good" },
    { value: NaN, quality: "good" },
    { value: 1, quality: "unavailable" },
  ]) {
    const samples: Record<string, { value: number | null; quality: string }> = {
      temperature: { value: 81, quality: "good" },
    };
    if (bad) samples.fault = bad;
    expect(evaluateRules(base, rules, samples)).toEqual({
      ...base,
      flow: { ...base.flow, direction: "stopped" },
      abnormal: true,
    });
  }
  expect(base.flow.direction).toBe("forward");
  expect(evaluateRules(base, [], {}, "temperature").abnormal).toBe(true);
});
test("流动规则按优先级、异常恢复与条件解除返回基础速度", () => {
  const base = {
    color: "#00ff00",
    flow: { enabled: true, direction: "forward" as const, speed: 1 },
  };
  const rules: DisplayRule[] = [
    {
      id: "stop",
      mode: "all",
      conditions: [{ pointId: "running", operator: "eq", value: 0 }],
      effects: { flow: { enabled: true, direction: "stopped", speed: 1 } },
    },
    {
      id: "reverse",
      mode: "all",
      conditions: [{ pointId: "flow", operator: "lt", value: 0 }],
      effects: { flow: { enabled: true, direction: "reverse", speed: 3 } },
    },
    {
      id: "color",
      mode: "all",
      conditions: [{ pointId: "flow", operator: "lt", value: 0 }],
      effects: { color: "#ff0000" },
    },
  ];
  const samples = {
    running: { value: 1, quality: "good" },
    flow: { value: -5, quality: "good" },
  };
  expect(evaluateRules(base, rules, samples)).toEqual({
    color: "#ff0000",
    flow: { enabled: true, direction: "reverse", speed: 3 },
    abnormal: false,
  });
  expect(
    evaluateRules(base, rules, {
      ...samples,
      running: { value: 0, quality: "good" },
    }).flow?.direction,
  ).toBe("stopped");
  expect(
    evaluateRules(base, rules, {
      ...samples,
      flow: { value: -5, quality: "unavailable" },
    }),
  ).toEqual({
    ...base,
    flow: { ...base.flow, direction: "stopped" },
    abnormal: true,
  });
  expect(evaluateRules(base, rules, samples).flow).toEqual({
    enabled: true,
    direction: "reverse",
    speed: 3,
  });
  expect(
    evaluateRules(base, rules, {
      ...samples,
      flow: { value: 5, quality: "good" },
    }),
  ).toEqual({ ...base, abnormal: false });
  expect(base.flow).toEqual({ enabled: true, direction: "forward", speed: 1 });
});
