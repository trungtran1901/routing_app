<template>
    <div class="gis-toolbar">
        <div class="toolbar-section map-type-section">
            <q-btn-toggle v-model="mapTypeLocal" unelevated no-caps class="ios-segmented" toggle-color="white" size="sm"
                text-color="grey-5" toggle-text-color="dark" :options="[
                    { label: 'Bản đồ', value: 'roadmap' },
                    { label: 'Vệ tinh', value: 'satellite' }
                ]" @update:model-value="$emit('update:mapType', $event)" />
        </div>

        <div class="toolbar-divider" />

        <q-btn round flat dense icon="refresh" class="ios-icon-btn" title="Làm mới" @click="$emit('refresh')">
            <q-tooltip>Làm mới</q-tooltip>
        </q-btn>

        <q-btn flat dense no-caps class="ios-action-btn" :class="{ active: pointsDraggable }"
            @click="$emit('update:pointsDraggable', !pointsDraggable)">
            <q-icon name="open_with" size="18px" />
            <span>
                {{ pointsDraggable ? 'Đang chỉnh điểm' : 'Chỉnh vị trí' }}
            </span>

            <q-tooltip>
                {{ pointsDraggable ? 'Tắt chỉnh vị trí điểm' : 'Chỉnh vị trí điểm' }}
            </q-tooltip>
        </q-btn>

        <template v-if="hasRoute && !routeMode">
            <div class="toolbar-divider" />

            <q-btn round flat dense icon="center_focus_strong" class="ios-icon-btn" title="Vừa khung tuyến"
                @click="$emit('fit-route')">
                <q-tooltip>Vừa khung tuyến</q-tooltip>
            </q-btn>

            <q-btn round flat dense icon="close" class="ios-icon-btn danger" title="Đóng tuyến"
                @click="$emit('close-route')">
                <q-tooltip>Đóng tuyến</q-tooltip>
            </q-btn>
        </template>

        <template v-if="routeMode">
            <div class="route-mode">
                <q-icon name="route" size="16px" />
                <span>
                    Tuyến {{ routeModeLabel }}
                </span>
            </div>

            <q-btn flat dense no-caps class="exit-route-btn" @click="$emit('exit-route-mode')">
                <q-icon name="close" size="17px" />
                <span>Thoát</span>
            </q-btn>
        </template>

        <div class="toolbar-spacer" />

        <div class="sid-search">
            <q-icon name="search" size="19px" class="sid-search-icon" />

            <q-input v-model="sidValue" borderless dense dark placeholder="Xem SID..." class="sid-input"
                @keyup.enter="onSidGo" />

            <q-btn round flat dense icon="arrow_forward" class="sid-go-btn" @click="onSidGo">
                <q-tooltip>Xem SID trên bản đồ</q-tooltip>
            </q-btn>
        </div>

        <transition name="fade">
            <div v-if="loading" class="loading-pill">
                <q-spinner-ios size="16px" />
                <span>Đang tải</span>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    mapType: {
        type: String,
        default: 'roadmap'
    },

    loading: {
        type: Boolean,
        default: false
    },

    hasRoute: {
        type: Boolean,
        default: false
    },

    pointsDraggable: {
        type: Boolean,
        default: false
    },

    routeMode: {
        type: Boolean,
        default: false
    },

    routeModeLabel: {
        type: String,
        default: ''
    }
})

const emit = defineEmits([
    'update:mapType',
    'refresh',
    'fit-route',
    'close-route',
    'update:pointsDraggable',
    'exit-route-mode',
    'go-sid'
])

const mapTypeLocal = ref(props.mapType)

watch(
    () => props.mapType,
    value => {
        mapTypeLocal.value = value
    }
)

const sidValue = ref('')

function onSidGo() {
    const value = sidValue.value?.trim()

    if (!value) return

    emit('go-sid', value)
}
</script>

<style>
.gis-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;

    padding: 5px 5px;

    color: #f5f5f7;

    background:
        linear-gradient(180deg,
            rgba(42, 42, 45, 0.96),
            rgba(27, 27, 29, 0.96));

    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;

    box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);

    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);

    overflow: hidden;
}

.map-type-section {
    display: flex;
    align-items: center;
}

.ios-segmented {
    height: 30px;
    padding: 3px;

    background: rgba(118, 118, 128, 0.22);

    border-radius: 11px;
}

.ios-segmented :deep(.q-btn) {
    min-height: 32px;
    padding: 0 13px;

    font-size: 13px;
    font-weight: 600;

    border-radius: 8px;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        box-shadow 0.2s ease;
}

.ios-segmented :deep(.q-btn--active) {
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.18);
}

.toolbar-divider {
    width: 1px;
    height: 24px;
    margin: 0 3px;

    background: rgba(255, 255, 255, 0.12);
}

.ios-icon-btn {
    width: 38px;
    height: 38px;

    color: #d1d1d6;

    border-radius: 11px;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        transform 0.15s ease;
}

.ios-icon-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.09);
}

.ios-icon-btn:active {
    transform: scale(0.94);
}

.ios-icon-btn.danger:hover {
    color: #ff453a;
    background: rgba(255, 69, 58, 0.10);
}

.ios-action-btn {
    min-height: 38px;
    padding: 0 11px;

    gap: 7px;

    color: #d1d1d6;

    border-radius: 11px;

    font-size: 13px;
    font-weight: 500;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        transform 0.15s ease;
}

.ios-action-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
}

.ios-action-btn:active {
    transform: scale(0.97);
}

.ios-action-btn.active {
    color: #ffcc00;
    background: rgba(255, 204, 0, 0.12);
}

.route-mode {
    display: flex;
    align-items: center;
    gap: 7px;

    height: 34px;
    padding: 0 11px;

    color: #ffcc00;

    background: rgba(255, 204, 0, 0.12);

    border: 1px solid rgba(255, 204, 0, 0.18);
    border-radius: 10px;

    font-size: 12px;
    font-weight: 600;

    white-space: nowrap;
}

.exit-route-btn {
    height: 34px;
    padding: 0 10px;

    color: #d1d1d6;

    border-radius: 10px;

    font-size: 12px;
}

.exit-route-btn:hover {
    color: #ff453a;
    background: rgba(255, 69, 58, 0.1);
}

.toolbar-spacer {
    flex: 1 1 auto;
}

.sid-search {
    display: flex;
    align-items: center;

    width: 205px;
    height: 40px;

    padding: 0 4px 0 11px;

    background: rgba(118, 118, 128, 0.18);

    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;

    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease;
}

.sid-search:focus-within {
    background: rgba(118, 118, 128, 0.25);

    border-color: rgba(10, 132, 255, 0.55);

    box-shadow:
        0 0 0 3px rgba(10, 132, 255, 0.12);
}

.sid-search-icon {
    flex: 0 0 auto;
    color: #98989d;
}

.sid-input {
    flex: 1;
    min-width: 0;

    margin-left: 7px;
}

.sid-input :deep(input) {
    color: #f5f5f7;

    font-size: 13px;
}

.sid-input :deep(input::placeholder) {
    color: #8e8e93;
}

.sid-go-btn {
    width: 32px;
    height: 32px;

    color: #0a84ff;

    transition:
        background 0.2s ease,
        transform 0.15s ease;
}

.sid-go-btn:hover {
    background: rgba(10, 132, 255, 0.12);
}

.sid-go-btn:active {
    transform: scale(0.9);
}

.loading-pill {
    display: flex;
    align-items: center;
    gap: 7px;

    height: 32px;
    padding: 0 11px;

    color: #64d2ff;

    background: rgba(100, 210, 255, 0.10);

    border: 1px solid rgba(100, 210, 255, 0.15);
    border-radius: 10px;

    font-size: 12px;
    font-weight: 500;

    white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

@media (max-width: 900px) {
    .gis-toolbar {
        gap: 4px;
        padding: 6px;
    }

    .ios-action-btn span {
        display: none;
    }

    .ios-action-btn {
        width: 38px;
        padding: 0;
        justify-content: center;
    }

    .sid-search {
        width: 170px;
    }
}

@media (max-width: 650px) {
    .gis-toolbar {
        border-radius: 15px;
        flex-wrap: wrap;
    }

    .map-type-section {
        flex-shrink: 0;
    }

    .ios-segmented :deep(.q-btn) {
        padding: 0 9px;
        font-size: 12px;
    }

    .sid-search {
        width: 42px;
        padding: 0;

        justify-content: center;
    }

    .sid-search-icon {
        display: none;
    }

    .sid-input {
        display: none;
    }

    .sid-go-btn {
        width: 36px;
        height: 36px;
    }

    .loading-pill span {
        display: none;
    }
}
</style>