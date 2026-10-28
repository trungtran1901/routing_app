<template>
    <div class="mdb-wrap">
        <div class="mdb-slide" :class="{ 'mdb-slide--hidden': !open }" :style="{ zoom: uiScale }">
            <!-- Nút ẩn/hiện, luôn nhìn thấy kể cả khi thanh bar đã trượt xuống -->
            <button type="button" class="mdb-handle" :title="open ? 'Ẩn thanh hiển thị' : 'Hiện thanh hiển thị'"
                @click="open = !open">
                <q-icon :name="open ? 'keyboard_arrow_down' : 'keyboard_arrow_up'" size="18px" />
            </button>

            <div class="mdb-root" :style="{ maxWidth: `calc((100vw - 160px) / ${uiScale})` }">
                <div class="mdb-scroll">
                    <button v-for="g in groups" :key="g.key" type="button" class="mdb-chip"
                        :class="{ 'mdb-chip--off': state.visibility[g.key] === false }" :title="g.label"
                        @click="toggleGroup(g.key)">
                        <q-icon :name="g.icon" size="15px" />
                        <span>{{ g.label }}</span>
                    </button>
                </div>

                <div class="mdb-divider" />

                <q-btn flat round dense icon="tune" class="mdb-settings" title="Tuỳ chọn hiển thị">
                    <q-menu anchor="top right" self="bottom right" :offset="[0, 10]" class="mdb-menu">
                        <div class="mdb-panel">
                            <div class="mdb-panel-title">Kích thước điểm</div>
                            <q-toggle v-model="state.autoScale" dense color="primary"
                                label="Tự co giãn theo mức zoom" />
                            <div class="mdb-slider-row">
                                <span>Hệ số</span>
                                <q-slider :model-value="state.scaleMultiplier" :min="0.5" :max="2" :step="0.1" label
                                    :label-value="state.scaleMultiplier.toFixed(1) + '×'" color="primary"
                                    @change="value => state.scaleMultiplier = value" />
                            </div>

                            <div class="mdb-panel-title">Lớp bản đồ</div>
                            <q-toggle v-model="state.traffic" dense color="primary" label="Tình trạng giao thông" />
                            <q-toggle v-model="state.transit" dense color="primary"
                                label="Tuyến giao thông công cộng" />

                            <div class="mdb-panel-actions">
                                <q-btn flat dense no-caps color="grey-4" icon="visibility" label="Hiện tất cả"
                                    @click="showAll" />
                                <q-btn flat dense no-caps color="grey-4" icon="restart_alt" label="Đặt lại"
                                    @click="reset" />
                            </div>
                        </div>
                    </q-menu>
                </q-btn>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { MAP_FEATURE_GROUPS } from '../../utils/mapStyles'
import { useMapDisplay } from '../../composables/useMapDisplay'
import { useUiScale } from '../../composables/useUiScale'

// Hệ số scale theo độ phân giải / scale màn hình (dùng chung với các thanh khác)
const { uiScale } = useUiScale()

const groups = MAP_FEATURE_GROUPS
const { state, toggleGroup, showAll, reset } = useMapDisplay()

// true = thanh bar đang hiện, false = đã trượt xuống ẩn
const open = ref(true)
</script>

<style>
/* Lớp bọc: không zoom, chỉ lo căn giữa + cắt phần thanh bar trượt ra ngoài đáy */
.mdb-wrap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 21;
    display: flex;
    justify-content: center;
    padding: 30px 0 12px;
    overflow: hidden;
    pointer-events: none;
}

/* Khối trượt (có zoom): gồm nút tab + thanh bar */
.mdb-slide {
    position: relative;
    pointer-events: auto;
    transform: translateY(0);
    transition: transform .35s cubic-bezier(.4, 0, .2, 1);
}

.mdb-slide--hidden {
    transform: translateY(calc(100% + 16px));
}

/* Tab nhỏ nằm trên đỉnh thanh bar */
.mdb-handle {
    position: absolute;
    left: 50%;
    top: -24px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 22px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, .08);
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    background: linear-gradient(180deg, rgba(42, 42, 45, .96), rgba(32, 32, 35, .96));
    color: #d1d1d6;
    cursor: pointer;
    transition: color .15s, background .15s;
}

.mdb-handle:hover {
    color: #fff;
    background: rgba(60, 60, 64, .98);
}

.mdb-root {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px 5px 8px;
    background: linear-gradient(180deg, rgba(42, 42, 45, .96), rgba(27, 27, 29, .96));
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .28);
    backdrop-filter: blur(24px);
}

.mdb-scroll {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    min-width: 0;
    scrollbar-width: none;
}

.mdb-scroll::-webkit-scrollbar {
    display: none;
}

.mdb-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(96, 165, 250, .35);
    border-radius: 9px;
    background: rgba(10, 132, 255, .16);
    color: #93c5fd;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background .15s, color .15s, border-color .15s, opacity .15s;
}

.mdb-chip:hover {
    background: rgba(10, 132, 255, .26);
}

.mdb-chip--off {
    border-color: rgba(255, 255, 255, .08);
    background: rgba(118, 118, 128, .18);
    color: #8e8e93;
    text-decoration: line-through;
}

.mdb-chip--off:hover {
    background: rgba(118, 118, 128, .3);
    color: #d1d1d6;
}

.mdb-divider {
    flex: 0 0 auto;
    width: 1px;
    height: 22px;
    background: rgba(255, 255, 255, .12);
}

.mdb-settings {
    flex: 0 0 auto;
    color: #d1d1d6;
}

.mdb-menu {
    background: rgba(20, 24, 36, .98);
    border: 1px solid #1e293b;
    border-radius: 12px;
}

.mdb-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 260px;
    padding: 12px 14px;
    color: #e2e8f0;
    font-size: 12px;
}

.mdb-panel-title {
    margin-top: 4px;
    color: #475569;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .6px;
    text-transform: uppercase;
}

.mdb-slider-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 6px 8px 2px;
}

.mdb-slider-row span {
    color: #94a3b8;
}

.mdb-panel-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
}

@media (max-width: 768px) {

    /* chừa chỗ cho nút bật/tắt chú thích bên trái */
    .mdb-wrap {
        left: 52px;
        right: 6px;
        padding-bottom: 6px;
    }
}
</style>