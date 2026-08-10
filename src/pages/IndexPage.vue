<template>
  <q-page class="q-pr-md q-pl-md q-pt-md bg-slate-900">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-tabs v-model="tab" dense class="text-white" active-color="primary" indicator-color="primary" align="left">
          <q-tab name="diagram" label="Sơ đồ tuyến" no-caps />
          <q-tab name="cable" label="Sơ đồ sợi" no-caps />
        </q-tabs>

        <q-tab-panels v-model="tab" animated class="bg-slate-900">
          <q-tab-panel name="diagram" class="q-pa-none">
            <CableDiagramComponent :tuyen-id="currentId" :ma-tuyen="currentMa" />
          </q-tab-panel>

          <q-tab-panel name="cable" class="q-pa-none">
            <DiagramCableComponent :tuyen-id="currentId" :ma-tuyen="currentMa" />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import CableDiagramComponent from 'components/DiagramComponent.vue'
import DiagramCableComponent from 'components/DiagramCable.vue'

const route = useRoute()
const tab = ref('diagram')

const currentId = computed(() => route.params.tuyenId || '')
const currentMa = ref('')
</script>

<style scoped>
.bg-slate-900 {
  background: #0f172a;
  /* min-height: 100vh; */
}
</style>