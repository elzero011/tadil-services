<template>
  <div class="grid grid-rows-[auto_1fr] space-y-2">
    <EditModelNamesForm
      :model="model"
      @updated:model="emit('updated:model')"
      @deleted:model="emit('deleted:model')"
    />
    <div
      class="grid grid-rows-[1fr_auto] gap-2 p-2 border border-border rounded-lg"
    >
      <div
        v-if="selectedModelImage && modelImageSections"
        class="grid grid-cols-[1fr_auto] gap-2 overflow-auto"
      >
        <ModelSegmenter
          :imageBase64String="selectedModelImage?.imageBase64String"
          :sections="modelImageSections"
          :drawingState="drawingState"
        />
        <div class="grid grid-rows-[1fr_auto] h-fit space-y-2">
          <div
            class="w-70 space-y-2 p-2 border border-border rounded-lg overflow-auto"
          >
            <p class="text-xl font-semibold">
              {{ $t("models.sections.title") }}
            </p>
            <AddSectionForm
              :modelImageId="selectedModelImage.id"
              :imageBase64String="selectedModelImage.imageBase64String"
              @created:section="getModelImages"
            />
            <div class="max-h-[500px] space-y-2 overflow-auto">
              <div
                v-for="(section, index) of selectedModelImage.sections"
                :key="section.id"
                :draggable="can('models.update')"
                @dragstart="onSectionDragStart(index)"
                @dragover.prevent
                @drop="onSectionDrop(index)"
              >
                <SectionListItem
                  :section="section"
                  :imageBase64String="selectedModelImage.imageBase64String"
                  :drawingState="drawingState"
                  @deleted:section="getModelImages"
                  @updated:section="getModelImages"
                />
              </div>
            </div>
          </div>
          <DestructiveActionAlert
            :title="$t('models.images.deleteImage.confirmMessage')"
            @confirmed="deleteModelImage"
          >
            <template #trigger="{ openAlert }">
              <Button v-if="can('models.update')" variant="destructive" class="w-full" @click="openAlert">
                <Trash2 class="h-6 w-6" />
                {{ $t("models.images.deleteImage.deleteButton") }}
              </Button>
            </template>
          </DestructiveActionAlert>
        </div>
      </div>
      <div v-else class="w-full h-full flex flex-col items-center">
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
      <div class="flex gap-2 w-full overflow-x-auto">
        <SkeletonItem
          v-if="isLoadingImages"
          v-for="index in 3"
          :key="index"
          variant="card"
          class="max-h-40 max-w-40"
        />
        <div v-else class="flex gap-2">
          <button
            v-for="image in modelImages"
            :key="image.id"
            class="relative w-40 h-40 flex justify-center items-center border border-border rounded-md overflow-hidden"
            @click="selectedModelImage = image"
          >
            <div class="absolute inset-0 opacity-0 hover:opacity-40 bg-muted">
              <Edit class="absolute top-1 right-1 h-6 w-6" />
            </div>
            <img
              :src="image.imageBase64String"
              class="max-w-40 max-h-40 h-auto"
            />
          </button>
        </div>
        <AddModelImageButton v-if="can('models.update')"
          :modelId="model.id"
          @updated:model-images="getModelImages(), emit('updated:model-images')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  apiClient,
  type DisplayModelDTO,
  type DisplayModelImageDTO,
} from "@/integration";
import { Image, Edit, Trash2 } from "lucide-vue-next";
import AddSectionForm from "./sections/AddSectionForm.vue";
import SectionListItem from "./sections/SectionListItem.vue";
import ModelSegmenter from "./sections/ModelSegmenter.vue";
import {
  Button,
  DestructiveActionAlert,
  SkeletonItem,
  useToast,
} from "@/components";
import AddModelImageButton from "./AddModelImageButton.vue";
import { useI18n } from "vue-i18n";
import EditModelNamesForm from "./EditModelNamesForm.vue";
import { can } from "@/auth";
import { useCanvasDrawing } from "./sections/useCanvasDrawing.composable";

const { t } = useI18n();
const { openToast } = useToast();

const drawingState = useCanvasDrawing();

const emit = defineEmits<{
  (e: "updated:model"): void;
  (e: "deleted:model"): void;
  (e: "updated:model-images"): void;
}>();
const props = defineProps<{
  model: DisplayModelDTO;
}>();

const modelImages = ref<DisplayModelImageDTO[]>([]);
const selectedModelImage = ref<DisplayModelImageDTO>();
const modelImageSections = computed(() =>
  selectedModelImage.value?.sections.map((section) => section.coordinates)
);

const isLoadingImages = ref<boolean>(false);
async function getModelImages() {
  if (!can("models.read")) return;
  try {
    isLoadingImages.value = true;
    modelImages.value = [];
    modelImages.value = (
      await apiClient.modelsControllerGetModelImages(props.model.id)
    ).data;
    if (modelImages.value.length === 0) {
      selectedModelImage.value = undefined;
      return;
    }
    const selectedModelImageIndex = modelImages.value.findIndex(
      (image) => image.id === selectedModelImage.value?.id
    );
    if (selectedModelImageIndex === -1) {
      selectedModelImage.value = modelImages.value[0];
      return;
    } else {
      selectedModelImage.value = modelImages.value[selectedModelImageIndex];
      return;
    }
  } finally {
    isLoadingImages.value = false;
  }
}

async function deleteModelImage() {
  if (!can("models.update")) return;
  try {
    await apiClient.modelsControllerDeleteModelImage(
      selectedModelImage.value!.id
    );
    openToast(t("models.images.deleteImage.success"));
    emit("updated:model-images");
    getModelImages();
  } catch (error: any) {
    openToast(
      t("models.images.deleteImage.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

const draggedSectionIndex = ref<number | null>(null);

function onSectionDragStart(index: number) {
  draggedSectionIndex.value = index;
}

async function onSectionDrop(targetIndex: number) {
  if (!can("models.update")) return;
  const image = selectedModelImage.value;
  if (!image || draggedSectionIndex.value === null) return;
  const from = draggedSectionIndex.value;
  draggedSectionIndex.value = null;
  if (from === targetIndex) return;

  const sections = [...image.sections];
  const [moved] = sections.splice(from, 1);
  if (!moved) return;
  sections.splice(targetIndex, 0, moved);
  image.sections = sections;

  try {
    await apiClient.modelsControllerReorderSections(image.id, {
      sectionIds: sections.map((s) => s.id),
    });
  } catch (error: any) {
    openToast(
      t("models.sections.reorder.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
    getModelImages();
  }
}

watch(
  () => props.model.id,
  async () => {
    await getModelImages();
  },
  { immediate: true }
);
</script>
