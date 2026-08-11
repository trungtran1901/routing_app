<template>
  <div class="gis-search">
    <q-input
      dense filled dark color="primary"
      :model-value="modelValue"
      placeholder="Tìm mã điểm / tên điểm / mã tuyến..."
      clearable bg-color="dark"
      @update:model-value="onInput"
      @clear="$emit('clear')"
    >
      <template #prepend><q-icon name="search" /></template>
      <template #append><q-spinner v-if="loading" size="16px" color="primary" /></template>
    </q-input>

    <q-list v-if="results.length" bordered dark class="gis-search-results">
      <q-item v-for="r in results" :key="r.source_id" clickable @click="$emit('select', r)">
        <q-item-section>
          <q-item-label>{{ r.label }}</q-item-label>
          <q-item-label caption>
            {{ r.source_id }} · Tuyến {{ r.ma_tuyen }}
            <span v-if="r.lat == null" class="text-negative"> · Chưa có toạ độ</span>
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else-if="error" class="text-negative text-caption q-pa-xs bg-dark">{{ error }}</div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['search', 'select', 'clear'])
function onInput(val) {
  emit('search', val)
}
</script>

<style scoped>
.gis-search { position: relative; width: 320px; }
.gis-search-results {
  position: absolute; top: 100%; left: 0; right: 0;
  max-height: 320px; overflow-y: auto; z-index: 30;
}
</style>
