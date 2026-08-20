<template>
    <q-card dark class="segment-info-panel">
        <q-card-section class="row items-center q-pb-none">
            <div class="text-subtitle2">Thông tin đoạn cáp</div>
            <q-space />
            <q-btn dense flat round icon="close" size="sm" @click="$emit('close')" />
        </q-card-section>

        <q-inner-loading :showing="loading" dark />

        <template v-if="detail">
            <q-card-section class="q-gutter-xs text-caption">
                <div><b>Mã:</b> {{ detail.segment.source_id }}</div>
                <div><b>Tuyến:</b> {{ detail.segment.ma_tuyen }}</div>
                <div><b>Điểm đầu:</b> {{ detail.start_point?.ten_diem || detail.segment.start_point_id }}</div>
                <div><b>Điểm cuối:</b> {{ detail.end_point?.ten_diem || detail.segment.end_point_id }}</div>
                <div v-if="detail.segment.length_m != null"><b>Chiều dài:</b> {{ formatLength(detail.segment.length_m)
                    }}</div>
                <div><b>Nguồn geometry:</b> {{ detail.segment.geometry_source }}</div>
                <div><b>Version:</b> {{ detail.segment.geometry_version }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <div class="row items-center q-gutter-xs q-mb-xs">
                    <q-icon name="cable" size="14px" color="amber" />
                    <span class="text-caption text-weight-bold">SID trên đoạn này</span>
                    <q-badge color="amber-9" text-color="dark">{{ detail.sid_count ?? (detail.sid_list || []).length
                    }}</q-badge>
                </div>
                <div v-if="!detail.sid_list || !detail.sid_list.length" class="text-caption text-grey-6">
                    Không có SID nào đang hoạt động trên đoạn này.
                </div>
                <q-list v-else dense bordered dark class="sid-mini-list">
                    <q-item v-for="s in detail.sid_list" :key="s.sid_cable_id">
                        <q-item-section>
                            <q-item-label class="text-amber-4">{{ s.sid }}</q-item-label>
                            <q-item-label caption>{{ s.ten_khach_hang }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-badge color="grey-8">Sợi {{ s.cable_number }}</q-badge>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>

            <q-card-section v-if="!editing" class="q-pt-none q-gutter-sm row">
                <q-btn v-if="detail.editable" dense no-caps color="primary" icon="edit" label="Edit geometry"
                    @click="$emit('start-edit')" />
                <q-btn dense flat no-caps color="grey-4" icon="center_focus_strong" label="Fit" @click="$emit('fit')" />
                <q-btn dense flat no-caps color="grey-4" icon="route" label="Xem tuyến"
                    @click="$emit('view-route', detail.segment.parent_id)" />
            </q-card-section>

            <q-card-section v-else class="q-pt-none q-gutter-sm">
                <div class="text-caption text-orange">Đang chỉnh sửa {{ detail.segment.source_id }}</div>
                <div v-if="conflict" class="text-caption text-negative">
                    {{ saveError }}
                    <q-btn dense flat no-caps color="negative" label="Tải lại dữ liệu mới nhất"
                        @click="$emit('reload-conflict')" />
                </div>
                <div v-else-if="saveError" class="text-caption text-negative">{{ saveError }}</div>
                <div class="row q-gutter-sm">
                    <q-btn dense no-caps color="positive" icon="save" label="Save" :loading="saving" :disable="!isDirty"
                        @click="$emit('save')" />
                    <q-btn dense no-caps flat color="grey-4" icon="close" label="Cancel" :disable="saving"
                        @click="$emit('cancel')" />
                </div>
            </q-card-section>
        </template>

        <q-card-section v-else-if="error" class="text-negative text-caption">{{ error }}</q-card-section>
    </q-card>
</template>

<script setup>
import { formatLength } from '../../utils/geo'

defineProps({
    detail: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    editing: { type: Boolean, default: false },
    isDirty: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    saveError: { type: String, default: '' },
    conflict: { type: Boolean, default: false }
})
defineEmits(['close', 'start-edit', 'save', 'cancel', 'fit', 'view-route', 'reload-conflict'])
</script>

<style scoped>
.segment-info-panel {
    position: absolute;
    right: 12px;
    top: 60px;
    width: 320px;
    z-index: 25;
    background: rgba(10, 18, 35, .95);
    max-height: 80vh;
    overflow-y: auto;
}

.sid-mini-list {
    max-height: 220px;
    overflow-y: auto;
    background: rgba(15, 23, 42, .5);
}
</style>