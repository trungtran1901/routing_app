<template>
    <div class="gis-search">

        <!-- Search box -->
        <div class="search-box" :class="{ 'is-loading': loading }">
            <q-icon name="search" size="20px" class="search-icon" />

            <q-input dense borderless dark :model-value="modelValue" placeholder="Tìm mã điểm, tên điểm, mã tuyến..."
                class="search-input" @update:model-value="onInput" @clear="$emit('clear')">
                <template #append>
                    <q-spinner-ios v-if="loading" size="18px" color="primary" class="loading-spinner" />

                    <q-btn v-else-if="modelValue" flat round dense icon="close" class="clear-btn"
                        @click="$emit('clear')" />
                </template>
            </q-input>
        </div>

        <!-- Search results -->
        <transition name="search-results">
            <div v-if="results.length" class="gis-search-results">
                <div class="results-header">
                    <span>Kết quả tìm kiếm</span>
                    <span class="result-count">
                        {{ results.length }}
                    </span>
                </div>

                <div v-for="r in results" :key="`${r.type}-${r.source_id}`" class="search-result" :class="{
                    'route-result': r.type === 'route'
                }" @click="$emit('select', r)">
                    <!-- Icon -->
                    <div class="result-icon" :class="{
                        route: r.type === 'route',
                        point: r.type !== 'route'
                    }">
                        <q-icon :name="r.type === 'route' ? 'route' : 'place'" size="19px" />
                    </div>

                    <!-- Content -->
                    <div class="result-content">
                        <div class="result-title">
                            {{ r.label }}
                        </div>

                        <div class="result-meta">
                            <template v-if="r.type === 'route'">
                                Tuyến · {{ r.ma_tuyen }}
                            </template>

                            <template v-else>
                                <span>{{ r.source_id }}</span>
                                <span class="dot">•</span>
                                <span>Tuyến {{ r.ma_tuyen }}</span>

                                <span v-if="r.lat == null" class="no-coordinate">
                                    • Chưa có tọa độ
                                </span>
                            </template>
                        </div>
                    </div>

                    <!-- Route badge / arrow -->
                    <div v-if="r.type === 'route'" class="route-action">
                        <span>Xem tuyến</span>
                        <q-icon name="chevron_right" size="18px" />
                    </div>

                    <q-icon v-else name="chevron_right" size="18px" class="result-arrow" />
                </div>
            </div>
        </transition>

        <!-- Error -->
        <transition name="fade">
            <div v-if="!results.length && error" class="search-error">
                <q-icon name="error_outline" size="18px" />

                <span>{{ error }}</span>
            </div>
        </transition>

    </div>
</template>


<script setup>
defineProps({
    modelValue: {
        type: String,
        default: ''
    },

    results: {
        type: Array,
        default: () => []
    },

    loading: {
        type: Boolean,
        default: false
    },

    error: {
        type: String,
        default: ''
    }
})

const emit = defineEmits([
    'search',
    'select',
    'clear'
])

function onInput(val) {
    emit('search', val)
}
</script>


<style>
/* =========================================================
   Main
   ========================================================= */

.gis-search {
    position: relative;
    width: 360px;
    z-index: 100;
}


/* =========================================================
   iOS Search Box
   ========================================================= */

.search-box {
    display: flex;
    align-items: center;

    width: 100%;
    height: 46px;

    padding: 0 7px 0 14px;

    background:
        linear-gradient(180deg,
            rgba(48, 48, 51, 0.96),
            rgba(35, 35, 38, 0.96));

    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;

    box-shadow:
        0 7px 24px rgba(0, 0, 0, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);

    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);

    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.search-box:hover {
    background:
        linear-gradient(180deg,
            rgba(55, 55, 58, 0.97),
            rgba(39, 39, 42, 0.97));
}

.search-box:focus-within {
    border-color: rgba(10, 132, 255, 0.65);

    box-shadow:
        0 7px 24px rgba(0, 0, 0, 0.25),
        0 0 0 3px rgba(10, 132, 255, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.07);
}


/* =========================================================
   Search icon
   ========================================================= */

.search-icon {
    flex: 0 0 auto;
    color: #98989d;

    transition:
        color 0.2s ease,
        transform 0.2s ease;
}

.search-box:focus-within .search-icon {
    color: #0a84ff;
    transform: scale(1.05);
}


/* =========================================================
   Input
   ========================================================= */

.search-input {
    flex: 1;
    min-width: 0;

    margin-left: 8px;
}

.search-input :deep(.q-field__control) {
    min-height: 44px;
    padding: 0;
}

.search-input :deep(.q-field__native) {
    padding: 0;

    color: #f5f5f7;

    font-size: 14px;
    font-weight: 400;
}

.search-input :deep(.q-field__native::placeholder) {
    color: #8e8e93;
    opacity: 1;
}


/* =========================================================
   Clear button
   ========================================================= */

.clear-btn {
    width: 30px;
    height: 30px;

    color: #98989d;

    background: rgba(255, 255, 255, 0.07);

    transition:
        color 0.15s ease,
        background 0.15s ease,
        transform 0.15s ease;
}

.clear-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.13);
}

.clear-btn:active {
    transform: scale(0.88);
}


/* =========================================================
   Loading
   ========================================================= */

.loading-spinner {
    margin-right: 5px;
}


/* =========================================================
   Results panel
   ========================================================= */

.gis-search-results {
    position: absolute;

    top: calc(100% + 8px);
    left: 0;
    right: 0;

    max-height: 360px;

    overflow-y: auto;

    padding: 7px;

    background:
        linear-gradient(180deg,
            rgba(40, 40, 43, 0.98),
            rgba(29, 29, 31, 0.98));

    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 16px;

    box-shadow:
        0 18px 45px rgba(0, 0, 0, 0.38),
        0 4px 12px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);

    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);

    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}


/* =========================================================
   Header
   ========================================================= */

.results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    height: 30px;
    padding: 0 9px;

    color: #8e8e93;

    font-size: 11px;
    font-weight: 600;

    text-transform: uppercase;
    letter-spacing: 0.35px;
}

.result-count {
    display: flex;
    align-items: center;
    justify-content: center;

    min-width: 22px;
    height: 20px;
    padding: 0 6px;

    color: #b8b8bd;

    background: rgba(255, 255, 255, 0.07);

    border-radius: 10px;

    font-size: 11px;
}


/* =========================================================
   Result item
   ========================================================= */

.search-result {
    display: flex;
    align-items: center;

    min-height: 62px;

    padding: 8px 9px;

    border-radius: 12px;

    cursor: pointer;

    transition:
        background 0.16s ease,
        transform 0.12s ease;
}

.search-result:hover {
    background: rgba(255, 255, 255, 0.07);
}

.search-result:active {
    background: rgba(255, 255, 255, 0.11);
    transform: scale(0.985);
}


/* =========================================================
   Result icon
   ========================================================= */

.result-icon {
    display: flex;
    align-items: center;
    justify-content: center;

    flex: 0 0 auto;

    width: 38px;
    height: 38px;

    margin-right: 10px;

    border-radius: 11px;
}

.result-icon.point {
    color: #0a84ff;
    background: rgba(10, 132, 255, 0.13);
}

.result-icon.route {
    color: #ffcc00;
    background: rgba(255, 204, 0, 0.13);
}


/* =========================================================
   Result content
   ========================================================= */

.result-content {
    flex: 1;
    min-width: 0;
}

.result-title {
    overflow: hidden;

    color: #f5f5f7;

    font-size: 14px;
    font-weight: 500;

    line-height: 20px;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.result-meta {
    overflow: hidden;

    margin-top: 2px;

    color: #8e8e93;

    font-size: 11px;
    line-height: 17px;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.dot {
    margin: 0 4px;
    color: #636366;
}

.no-coordinate {
    color: #ff453a;
}


/* =========================================================
   Route action
   ========================================================= */

.route-action {
    display: flex;
    align-items: center;
    gap: 2px;

    flex: 0 0 auto;

    margin-left: 8px;

    color: #ffcc00;

    font-size: 11px;
    font-weight: 500;

    white-space: nowrap;
}

.route-result {
    background: rgba(255, 204, 0, 0.025);
}


/* =========================================================
   Arrow
   ========================================================= */

.result-arrow {
    flex: 0 0 auto;

    margin-left: 8px;

    color: #636366;

    transition:
        color 0.15s ease,
        transform 0.15s ease;
}

.search-result:hover .result-arrow {
    color: #98989d;
    transform: translateX(2px);
}


/* =========================================================
   Error
   ========================================================= */

.search-error {
    position: absolute;

    top: calc(100% + 8px);
    left: 0;
    right: 0;

    display: flex;
    align-items: center;
    gap: 8px;

    min-height: 42px;

    padding: 0 13px;

    color: #ff453a;

    background: rgba(50, 28, 29, 0.97);

    border: 1px solid rgba(255, 69, 58, 0.18);
    border-radius: 12px;

    box-shadow:
        0 12px 30px rgba(0, 0, 0, 0.28);

    font-size: 12px;
}


/* =========================================================
   Animations
   ========================================================= */

.search-results-enter-active,
.search-results-leave-active {
    transition:
        opacity 0.18s ease,
        transform 0.18s ease;
}

.search-results-enter-from,
.search-results-leave-to {
    opacity: 0;
    transform: translateY(-5px) scale(0.98);
}

.fade-enter-active,
.fade-leave-active {
    transition:
        opacity 0.18s ease,
        transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}


/* =========================================================
   Responsive
   ========================================================= */

@media (max-width: 600px) {
    .gis-search {
        width: calc(100vw - 24px);
        max-width: 360px;
    }

    .search-box {
        height: 44px;
        border-radius: 14px;
    }

    .gis-search-results {
        max-height: 55vh;
    }

    .route-action span {
        display: none;
    }
}
</style>