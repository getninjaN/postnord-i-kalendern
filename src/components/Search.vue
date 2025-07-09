<script setup>
import { computed, onMounted, ref } from "vue";

const THINKING_EMOJI = "🤔";
const INITIAL = "Sök på postnummer nedan";

const message = ref(INITIAL);
const isLoading = ref(false);
const copied = ref(false)
const postalCode = ref("");
const selectedIcon = ref("postbox");
const found = ref(null)

const calendarUrl = computed(() => {
  if (!found.value) return "#";
  return `webcal://postnord-i-kalendern.se/api/cal/postnord.ics?postalCode=${found.value?.postalCode}&icon=${selectedIcon.value}`
})

function setMessage(text) {
  message.value = text;
  isLoading.value = false;
}

async function search(code = null) {
  const query = (code || postalCode.value?.trim()) ?? "";

  isLoading.value = true;
  found.value = null

  const formData = new FormData();
  formData.append("postalCode", query);

  try {
    const res = await fetch("/api/utdelningar.json", {
      method: "POST",
      body: formData
    });

    const json = await res.json();

    if (!res.ok) {
      setMessage(`${THINKING_EMOJI} ${json.error ?? res.statusText}`);
      return;
    }

    found.value = json
    setMessage(`🏡 ${json.postalCode}, ${json.city}`);
  } catch (e) {
    setMessage(`${THINKING_EMOJI} Ett oväntat fel uppstod`);
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(calendarUrl.value);
    copied.value = true
  } catch (error) {
    console.error(error.message);
  }

  setTimeout(() => copied.value = false, 3000)
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get("postalCode")?.replace(/\s/g, "");

  if (codeFromUrl) {
    postalCode.value = codeFromUrl;
    search(codeFromUrl);
  } else {
    message.value = INITIAL;
  }
});
</script>

<template>
  <section class="g-col-12 g-col-md-6 align-self-stretch justify-self-stretch">
    <div class="content d-flex flex-column align-items-center justify-content-center h-100">
      <div class="card mb-3 w-100 bg-light-subtle">
        <div class="card-body">
          <span v-if="!isLoading" class="d-block fs-4 font-weight-normal m-0 text-center">
            {{ message }}
          </span>

          <div v-if="isLoading" class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Laddar...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="d-grid gap-2 mb-3 w-100">
        <input
          type="text"
          v-model="postalCode"
          id="postalCode"
          class="form-control form-control-lg"
          placeholder="Fyll i postnummer"
          @blur="search()"
          :disabled="isLoading"
        />
      </div>

      <div class="d-flex flex-column text-center">
        <b class="d-block mb-2">Välj ikon:</b>

        <div class="d-flex">
          <input type="radio" v-model="selectedIcon" value="postbox" class="btn-check" id="icon" autocomplete="off" />
          <label class="btn btn-text fs-3" for="icon">📬</label>

          <input type="radio" v-model="selectedIcon" value="package" class="btn-check" id="icon-2" autocomplete="off" />
          <label class="btn btn-text fs-3" for="icon-2">📦</label>

          <input type="radio" v-model="selectedIcon" value="letter" class="btn-check" id="icon-3" autocomplete="off" />
          <label class="btn btn-text fs-3" for="icon-3">✉️</label>
        </div>
      </div>

      <div class="mt-4">
        <a :href="calendarUrl" class="btn btn-lg btn-primary text-white w-100" role="button" :disabled="!found" :class="{ 'disabled': !found }">Lägg till i kalendern</a>

        <div class="card mt-3 w-100 bg-light-subtle" v-if="found">
          <div class="card-body w-100 d-flex align-items-center">
            <code class="flex-grow-1 text-break">{{ calendarUrl }}</code>
            
            <a href="#" class="btn btn-light text-nowrap" style="width: 200px" @click="copy" :data-clipboard-text="calendarUrl">
              <span :class="{ 'd-block': !copied, 'd-none': copied }">Kopiera</span>
              <span :class="{ 'd-block': copied, 'd-none': !copied }">👍🏻 Kopierad</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
