<template>
    <div class="place-search">
        <div class="place-search-box" :class="{ 'is-loading': loading }">
            <q-icon name="travel_explore" size="20px" class="place-search-icon" />
            <q-input v-model="query" dense borderless dark placeholder="Tìm địa điểm trên Google Maps..."
                class="place-search-input" @update:model-value="onInput">
                <template #append>
                    <q-spinner-ios v-if="loading" size="18px" color="primary" />
                    <q-btn v-else-if="query" flat round dense icon="close" class="clear-btn" @click="clear" />
                </template>
            </q-input>
        </div>

        <transition name="place-results">
            <div v-if="predictions.length" class="place-results">
                <div v-for="p in predictions" :key="p.placePrediction.placeId" class="place-result"
                    @click="selectPrediction(p)">
                    <q-icon name="place" size="18px" class="place-result-icon" />
                    <div class="place-result-body">
                        <div class="place-result-main">{{ p.placePrediction.structuredFormat?.mainText?.text ||
                            p.placePrediction.text.text }}</div>
                        <div class="place-result-sub">{{ p.placePrediction.structuredFormat?.secondaryText?.text || ''
                        }}</div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps({
    // apiKey: { type: String, required: true },
    regionCodes: { type: Array, default: () => ['vn'] }
})

const emit = defineEmits(['select'])

const query = ref('')
const predictions = ref([])
const loading = ref(false)

let sessionToken = null
let debounceTimer = null
let abortController = null

function newSessionToken() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ensureSessionToken() {
    if (!sessionToken) sessionToken = newSessionToken()
    return sessionToken
}

function onInput(val) {
    query.value = val
    if (debounceTimer) clearTimeout(debounceTimer)
    if (!val || !val.trim()) {
        predictions.value = []
        return
    }
    debounceTimer = setTimeout(() => runSearch(val.trim()), 300)
}

async function runSearch(text) {
    if (abortController) abortController.abort()
    abortController = new AbortController()
    loading.value = true
    try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            signal: abortController.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
            },
            body: JSON.stringify({
                input: text,
                sessionToken: ensureSessionToken(),
                includedRegionCodes: props.regionCodes
            })
        })
        if (!res.ok) {
            predictions.value = []
            return
        }
        const data = await res.json()
        predictions.value = (data.suggestions || []).filter(s => !!s.placePrediction)
    } catch (e) {
        if (e.name !== 'AbortError') predictions.value = []
    } finally {
        loading.value = false
    }
}

async function selectPrediction(p) {
    const placeId = p.placePrediction.placeId
    loading.value = true
    try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
            headers: {
                'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
            }
        })
        predictions.value = []
        if (!res.ok) return
        const place = await res.json()
        if (!place.location) return
        emit('select', {
            lat: place.location.latitude,
            lng: place.location.longitude,
            name: place.displayName?.text || '',
            address: place.formattedAddress || '',
            placeId: place.id
        })
        query.value = place.displayName?.text || place.formattedAddress || ''
        sessionToken = null
    } catch (e) {
        console.error('Error fetching place details:', e)
        predictions.value = []
    } finally {
        loading.value = false
    }
}

function clear() {
    query.value = ''
    predictions.value = []
    if (abortController) abortController.abort()
}

onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (abortController) abortController.abort()
})

defineExpose({ clear })
</script>

<style>
.place-search {
    position: relative;
    width: 100%;
    max-width: 340px;
    z-index: 100;
}

.place-search-box {
    display: flex;
    align-items: center;
    width: 100%;
    height: 46px;
    padding: 0 7px 0 14px;
    background: linear-gradient(180deg, rgba(48, 48, 51, 0.96), rgba(35, 35, 38, 0.96));
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;
    box-shadow: 0 7px 24px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(24px);
}

.place-search-box:focus-within {
    border-color: rgba(10, 132, 255, 0.65);
    box-shadow: 0 7px 24px rgba(0, 0, 0, 0.25), 0 0 0 3px rgba(10, 132, 255, 0.14);
}

.place-search-icon {
    color: #98989d;
}

.place-search-input {
    flex: 1;
    min-width: 0;
    margin-left: 8px;
}

.place-search-input :deep(.q-field__control) {
    min-height: 44px;
    padding: 0;
}

.place-search-input :deep(.q-field__native) {
    padding: 0;
    color: #f5f5f7;
    font-size: 14px;
}

.clear-btn {
    width: 28px;
    height: 28px;
    color: #98989d;
}

.place-results {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    max-height: 340px;
    overflow-y: auto;
    padding: 6px;
    background: linear-gradient(180deg, rgba(40, 40, 43, 0.98), rgba(29, 29, 31, 0.98));
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.38);
    backdrop-filter: blur(24px);
}

.place-result {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 10px;
    cursor: pointer;
}

.place-result:hover {
    background: rgba(255, 255, 255, 0.07);
}

.place-result-icon {
    color: #0a84ff;
    margin-top: 2px;
    flex-shrink: 0;
}

.place-result-main {
    color: #f5f5f7;
    font-size: 13px;
    font-weight: 500;
}

.place-result-sub {
    color: #8e8e93;
    font-size: 11px;
    margin-top: 2px;
}

.place-results-enter-active,
.place-results-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.place-results-enter-from,
.place-results-leave-to {
    opacity: 0;
    transform: translateY(-5px);
}

@media (max-width: 600px) {
    .place-search {
        width: 100%;
    }
}
</style>