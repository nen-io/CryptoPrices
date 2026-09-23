<script setup lang="ts">
import { computed, ref } from 'vue';
const props = defineProps<{ values: number[]; label: string; sample?: boolean }>();
const selected = ref<number | null>(null);
const values = computed(() => props.values.filter(value => Number.isFinite(value) && value >= 0));
const bounds = computed(() => { const min = Math.min(...values.value); const max = Math.max(...values.value); const padding = Math.max((max - min) * .15, max * .002, .000001); return { min: min - padding, max: max + padding }; });
const points = computed(() => values.value.map((value, index) => ({ x: index / Math.max(values.value.length - 1, 1) * 640, y: 172 - (value - bounds.value.min) / (bounds.value.max - bounds.value.min) * 150 })));
const path = computed(() => points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '));
const point = computed(() => selected.value === null ? null : points.value[Math.min(selected.value, points.value.length - 1)]);
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 }).format(n);
function move(event: PointerEvent) { const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); selected.value = Math.max(0, Math.min(values.value.length - 1, Math.round((event.clientX - rect.left) / rect.width * (values.value.length - 1)))); }
function key(event: KeyboardEvent) { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selected.value = Math.max(0, Math.min(values.value.length - 1, (selected.value ?? values.value.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))); } }
</script>
<template>
  <div v-if="values.length > 1" class="price-chart">
    <div class="plot" role="img" :aria-label="`${label}. ${sample ? 'Illustrative sample. ' : ''}Prices range from ${money(Math.min(...values))} to ${money(Math.max(...values))}. Use left and right arrows to explore.`" tabindex="0" @pointermove="move" @pointerleave="selected = null" @keydown="key" @blur="selected = null">
      <svg viewBox="0 0 640 190" preserveAspectRatio="none" aria-hidden="true"><path class="chart-grid" d="M0 25H640M0 95H640M0 165H640"/><path class="chart-area" :d="`${path} L640 190 L0 190Z`"/><path class="chart-line" :d="path" vector-effect="non-scaling-stroke"/><template v-if="point"><path class="chart-cursor" :d="`M${point.x} 0V190`"/><circle :cx="point.x" :cy="point.y" r="4" class="chart-point"/></template></svg>
      <output v-if="selected !== null" class="chart-tooltip" aria-live="polite">{{ money(values[Math.min(selected, values.length - 1)]) }}<span>Point {{ Math.min(selected, values.length - 1) + 1 }} of {{ values.length }}</span></output>
    </div>
    <div class="chart-price-axis" aria-hidden="true"><span>{{ money(bounds.max) }}</span><span>{{ money((bounds.max + bounds.min) / 2) }}</span><span>{{ money(Math.max(0, bounds.min)) }}</span></div>
  </div>
  <div v-else class="chart-empty"><span class="empty-line"></span><p>A little perspective is on its way.</p><span>Refresh markets to cache the price trend.<br>Your portfolio history is never invented.</span></div>
</template>
