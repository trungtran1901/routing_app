<!-- src/components/gis/RemoteAddPointDrawer.vue -->
<template>
    <component :is="RemoteComp" v-if="RemoteComp" :drawerRight="modelValue" :view="view" :data="prefillData"
        :callback="callback" :widthScreen="40" @addSuccess="onAddSuccess" @drawerRightMenu="onDrawerToggle" />
</template>

<script setup>
import { ref, watch, shallowRef } from 'vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    view: { type: String, required: true },   // tên view metadata điểm mạng
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'created'])

const RemoteComp = shallowRef(null)

const prefillData = ref({})

watch(() => props.modelValue, async (open) => {
    if (open && !RemoteComp.value) {
        try {
            // remote module expose trong quasar_config.js bước 1
            const mod = await import('appweb/MenuAddRightDrawerProV1.vue')
            RemoteComp.value = mod.default
        } catch (e) {
            console.error('[RemoteAddPointDrawer] Không tải được component từ master app', e)
            emit('update:modelValue', false)
        }
    }
    if (open) {
        // Prefill toạ độ + địa chỉ vào model của form remote
        prefillData.value = {
            lat: props.lat,
            lng: props.lng,
            geometry: { type: 'Point', coordinates: [props.lng, props.lat] },
            dia_chi: props.address || ''
        }
    }
}, { immediate: true })

function onDrawerToggle(val) {
    emit('update:modelValue', val)
}

function onAddSuccess(success, _cfg, record) {
    if (success) emit('created', record)
    emit('update:modelValue', false)
}
</script>