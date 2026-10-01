<script setup lang="ts">
import type { DiagramElement } from "../domain/document";
import type { DisplayRule, RuleCondition } from "../domain/rules";
import { mockDataProvider } from "../data/useMockData";
import type { ImageAsset } from "../domain/assets";
const props = defineProps<{
  selected?: DiagramElement;
  assets?: Record<string, ImageAsset>;
}>();
const emit = defineEmits<{ change: [id: string, rules: DisplayRule[]] }>();
const points = mockDataProvider.catalog();
const operators = {
  eq: "等于",
  ne: "不等于",
  gt: "大于",
  gte: "大于等于",
  lt: "小于",
  lte: "小于等于",
};
function edit(change: (rules: DisplayRule[]) => void) {
  if (!props.selected) return;
  const rules: DisplayRule[] = JSON.parse(
    JSON.stringify(props.selected.rules || []),
  );
  change(rules);
  emit("change", props.selected.id, rules);
}
function add() {
  edit((rules) =>
    rules.push({
      id: crypto.randomUUID(),
      mode: "all",
      conditions: [{ pointId: "temperature", operator: "gt", value: 80 }],
      effects: { color: "#ef4444" },
    }),
  );
}
function condition(i: number, j: number, patch: Partial<RuleCondition>) {
  edit((rules) => Object.assign(rules[i]!.conditions[j]!, patch));
}
function color(i: number, value: string) {
  if (/^#[\da-f]{6}$/i.test(value))
    edit((rules) => (rules[i]!.effects.color = value));
}
function move(i: number, delta: number) {
  edit((rules) => {
    const [rule] = rules.splice(i, 1);
    rules.splice(i + delta, 0, rule!);
  });
}
</script>
<template>
  <section v-if="selected" class="rules-panel">
    <h3>显示规则</h3>
    <p>按顺序匹配；条件恢复时使用基础外观。</p>
    <div v-for="(rule, i) in selected.rules || []" :key="rule.id" class="rule">
      <strong>规则 {{ i + 1 }}</strong>
      <button
        :aria-label="`上移规则${i + 1}`"
        :disabled="i === 0"
        @click="move(i, -1)"
      >
        ↑
      </button>
      <button
        :aria-label="`下移规则${i + 1}`"
        :disabled="i === (selected.rules?.length || 0) - 1"
        @click="move(i, 1)"
      >
        ↓
      </button>
      <button
        :aria-label="`删除规则${i + 1}`"
        @click="edit((r) => r.splice(i, 1))"
      >
        删除
      </button>
      <select
        :aria-label="`规则${i + 1}条件组合`"
        :value="rule.mode"
        @change="
          edit(
            (r) =>
              (r[i]!.mode = ($event.target as HTMLSelectElement).value as
                'all' | 'any'),
          )
        "
      >
        <option value="all">全部满足（且）</option>
        <option value="any">任一满足（或）</option>
      </select>
      <div v-for="(c, j) in rule.conditions" :key="j" class="condition">
        <select
          :aria-label="`规则${i + 1}条件${j + 1}点位`"
          :value="c.pointId"
          @change="
            condition(i, j, {
              pointId: ($event.target as HTMLSelectElement).value,
            })
          "
        >
          <option v-for="point in points" :key="point.id" :value="point.id">
            {{ point.name }}
          </option>
        </select>
        <select
          :aria-label="`规则${i + 1}条件${j + 1}比较`"
          :value="c.operator"
          @change="
            condition(i, j, {
              operator: ($event.target as HTMLSelectElement)
                .value as RuleCondition['operator'],
            })
          "
        >
          <option v-for="(title, key) in operators" :key="key" :value="key">
            {{ title }}
          </option>
        </select>
        <input
          type="number"
          :aria-label="`规则${i + 1}条件${j + 1}阈值`"
          :value="c.value"
          @change="
            Number.isFinite(
              ($event.target as HTMLInputElement).valueAsNumber,
            ) &&
            condition(i, j, {
              value: ($event.target as HTMLInputElement).valueAsNumber,
            })
          "
        />
        <button
          :aria-label="`删除规则${i + 1}条件${j + 1}`"
          :disabled="rule.conditions.length === 1"
          @click="edit((r) => r[i]!.conditions.splice(j, 1))"
        >
          ×
        </button>
      </div>
      <button
        :aria-label="`规则${i + 1}添加条件`"
        @click="
          edit((r) =>
            r[i]!.conditions.push({
              pointId: 'running',
              operator: 'eq',
              value: 1,
            }),
          )
        "
      >
        添加条件
      </button>
      <label v-if="selected.kind === 'device'"
        >状态图片<select
          :aria-label="`规则${i + 1}状态图片`"
          :disabled="!selected.defaultImageId"
          :value="rule.effects.imageId || ''"
          @change="
            edit((r) => {
              const value = ($event.target as HTMLSelectElement).value;
              if (value) r[i]!.effects.imageId = value;
              else delete r[i]!.effects.imageId;
            })
          "
        >
          <option value="">不改变图片</option>
          <option v-for="asset in assets" :key="asset.id" :value="asset.id">
            {{ asset.name }}
          </option>
        </select></label
      >
      <label
        >颜色
        <input
          :aria-label="`规则${i + 1}颜色`"
          :value="rule.effects.color || ''"
          maxlength="7"
          @change="color(i, ($event.target as HTMLInputElement).value)"
      /></label>
    </div>
    <el-button @click="add">添加显示规则</el-button>
  </section>
</template>
<style scoped>
.rules-panel {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
}
.rules-panel p {
  color: #64748b;
}
.rule {
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 8px;
}
.rule select,
.rule input {
  max-width: 100%;
  padding: 5px;
  margin: 3px 0;
}
.condition {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.condition input {
  width: 70px;
}
button {
  margin: 2px;
  padding: 3px 6px;
}
label {
  display: block;
}
h3 {
  font-size: 13px;
}
</style>
