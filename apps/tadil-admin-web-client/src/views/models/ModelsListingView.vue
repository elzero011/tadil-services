<template>
  <div class="grid grid-rows-[auto_1fr] gap-2">
    <h1 class="text-2xl font-bold">{{ $t("nav.models") }}</h1>
    <div class="grid grid-cols-[auto_1fr] gap-4 h-full w-full">
      <div class="w-60 space-y-2 h-full overflow-y-auto">
        <CreateModelModal v-if="can('models.create')" @created:model="getModels" />
        <SkeletonItem
          v-if="isLoading"
          v-for="index in 3"
          :key="index"
          variant="card"
          class="max-h-40 w-auto"
        />
        <ModelListCard
          v-for="model in models"
          :key="model.id"
          :model="model"
          @select:model="selectedModel = model"
        />
        <div v-if="!isLoading && models.length === 0" class="text-center">
          <p class="text-xl font-semibold text-foreground/40">
            {{ $t("models.noModels.title") }}
          </p>
          <p class="text-lg font-semibold text-foreground/40">
            {{ $t("models.noModels.subTitle") }}
          </p>
        </div>
      </div>
      <ModelDetails
        v-if="selectedModel"
        :model="selectedModel"
        @updated:model="getModels"
        @updated:model-images="getModels"
        @deleted:model="getModels"
      />
      <div
        v-else
        class="w-full h-full grid grid-rows-[auto_1fr] space-y-2 border border-border rounded-lg"
      >
        <div class="w-full h-full flex flex-col justify-center items-center">
          <div>
            <Image class="h-30 w-30 opacity-30" />
          </div>
          <p class="text-4xl font-bold text-foreground/40">
            {{ $t("models.noModelSelected.title") }}
          </p>
          <p class="text-xl font-semibold text-foreground/40">
            {{ $t("models.noModelSelected.subTitle") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Image } from "lucide-vue-next";
import { onBeforeMount, ref } from "vue";
import ModelDetails from "./ModelDetails.vue";
import { apiClient, type DisplayModelDTO } from "@/integration";
import CreateModelModal from "./CreateModelModal.vue";
import ModelListCard from "./ModelListCard.vue";
import { SkeletonItem } from "@/components";
import { can } from "@/auth";

const models = ref<DisplayModelDTO[]>([]);
const isLoading = ref<boolean>(false);
const selectedModel = ref<DisplayModelDTO>();

async function getModels() {
  if (!can("models.read")) return;
  isLoading.value = true;
  models.value = (await apiClient.modelsControllerGetModels()).data;

  const selectedModelNewIndex = models.value.findIndex(
    (model) => model.id === selectedModel.value?.id
  );
  selectedModel.value = undefined;
  if (selectedModelNewIndex !== -1)
    selectedModel.value = models.value[selectedModelNewIndex];
  isLoading.value = false;
}

onBeforeMount(() => {
  getModels();
});
</script>
