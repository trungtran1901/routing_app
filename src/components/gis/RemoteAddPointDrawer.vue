<template>
    <component :is="RemoteComp" v-if="RemoteComp" :drawerRight="modelValue" :view="view" :data="prefillData"
        :action="actionConfig" :callback="callback" :widthScreen="40" @addSuccess="onAddSuccess"
        @drawerRightMenu="onDrawerToggle" />
</template>

<script setup>
import { ref, watch, shallowRef, provide, onBeforeUnmount } from 'vue'
window.appid = '1f6000858ae34a709d471db1bca40db6'
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    view: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' },
    maTuyen: { type: String, default: '' },
    parentId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'created'])

const RemoteComp = shallowRef(null)
const remoteStore = shallowRef(null)
const prefillData = ref({})

const actionConfig = [
    {
        function_name: 'BindDataToField',
        config_set: [
            { field: 'vi_do', value: '@@selected_row[0].vi_do' },
            { field: 'kinh_do', value: '@@selected_row[0].kinh_do' },
            { field: 'ma_tuyen', value: '@@selected_row[0].ma_tuyen' },
            { field: 'parent_id', value: '@@selected_row[0].parent_id' }
        ]
    }
]

let cachedStyleContent = null
let injectedStyleNodes = []

provide('mixinFunctionsReturn', {
    getDrawerStyles() {
    }
})

function getCurrentUserFromChildApp() {
    return {
    }
}

function getStyleAndLinkNodes() {
    return Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
}

async function loadRemoteStyles() {
    if (!cachedStyleContent) {
        const before = new Set(getStyleAndLinkNodes())
        await import('appweb/styles')
        const after = getStyleAndLinkNodes()
        const newNodes = after.filter(node => !before.has(node))

        cachedStyleContent = newNodes
            .map(n => n.tagName === 'STYLE' ? n.textContent : `@import url("${n.href}");`)
            .join('\n')

        newNodes.forEach(n => n.remove())
    }

    const styleTag = document.createElement('style')
    styleTag.setAttribute('data-remote-style', 'appweb')
    styleTag.textContent = cachedStyleContent
    document.head.appendChild(styleTag)
    injectedStyleNodes.push(styleTag)
}

function removeRemoteStyles() {
    injectedStyleNodes.forEach(node => node.remove())
    injectedStyleNodes = []
}

watch(() => props.modelValue, async (open) => {
    if (open) {
        try {
            if (!RemoteComp.value) {
                await loadRemoteStyles()

                const storeMod = await import('appweb/store')
                remoteStore.value = storeMod.default

                remoteStore.value.dispatch('updateProfile', getCurrentUserFromChildApp())
                await remoteStore.value.dispatch('getConfig')

                const mod = await import('appweb/MenuAddRightDrawerProV1.vue')
                RemoteComp.value = mod.default
            } else if (injectedStyleNodes.length === 0) {
                await loadRemoteStyles()
            }
        } catch (e) {
            console.error('[RemoteAddPointDrawer] Không tải được component từ master app', e)
            emit('update:modelValue', false)
            return
        }

        prefillData.value = {
            lat: props.lat,
            lng: props.lng,
            vi_do: props.lat,
            kinh_do: props.lng,
            ma_tuyen: props.maTuyen || '',
            parent_id: props.parentId || '',
            geometry: { type: 'Point', coordinates: [props.lng, props.lat] },
            dia_chi: props.address || ''
        }
    } else {
        removeRemoteStyles()
        RemoteComp.value = null
        prefillData.value = {}
    }
}, { immediate: true })

watch(() => props.maTuyen, val => {
    if (props.modelValue) {
        prefillData.value = { ...prefillData.value, ma_tuyen: val || '' }
    }
})

watch(() => props.parentId, val => {
    if (props.modelValue) {
        prefillData.value = { ...prefillData.value, parent_id: val || '' }
    }
})

onBeforeUnmount(() => {
    removeRemoteStyles()
    RemoteComp.value = null
    remoteStore.value = null
    prefillData.value = {}
})

function onDrawerToggle(val) {
    emit('update:modelValue', val)
}

function onAddSuccess(success, _cfg, record) {
    if (success) emit('created', record)
    emit('update:modelValue', false)
}
</script>