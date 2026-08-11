<template>
  <div class="gis-toolbar row items-center q-gutter-xs q-pa-xs bg-dark rounded-borders">
    <q-btn-toggle
      v-model="mapTypeLocal"
      dense no-caps toggle-color="primary"
      :options="[
        { label: 'Bản đồ', value: 'roadmap' },
        { label: 'Vệ tinh', value: 'satellite' }
      ]"
      @update:model-value="$emit('update:mapType', $event)"
    />
    <q-btn dense flat icon="refresh" color="grey-4" title="Làm mới" @click="$emit('refresh')" />
    <template v-if="hasRoute">
      <q-btn dense flat icon="center_focus_strong" color="grey-4" title="Vừa khung tuyến"
        @click="$emit('fit-route')" />
      <q-btn dense flat icon="close" color="grey-4" title="Đóng tuyến"
        @click="$emit('close-route')" />
    </template>
    <q-space />
    <q-badge v-if="loading" color="primary" label="Đang tải..." />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  mapType: { type: String, default: 'roadmap' },
  loading: { type: Boolean, default: false },
  hasRoute: { type: Boolean, default: false }
})
defineEmits(['update:mapType', 'refresh', 'fit-route', 'close-route'])
const mapTypeLocal = ref(props.mapType)
watch(() => props.mapType, v => { mapTypeLocal.value = v })
</script>
