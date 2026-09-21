<template>
  <div>
    <Button v-if="can('models.update') && can('alterations.read')"
      variant="outline"
      class="w-full"
      @click="startCreatingNewSection"
      :disabled="isCreatingNewSection"
    >
      {{ $t("models.sections.createSection.addNewSection") }}
    </Button>
    <Modal v-model="isCreatingNewSection" @close-modal="resetNewSection">
      <SectionEditor v-if="isCreatingNewSection"
        v-model="newSection"
        :imageBase64String="imageBase64String"
        :drawingState="drawingState"
        :title="$t('models.sections.createSection.drawTitle')"
        :formTitle="$t('models.sections.createSection.formTitle')"
        @save="addSection"
        @cancel="resetNewSection"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Button, useToast, Modal } from "@/components";
import { type AddSectionDTO, apiClient } from "@/integration";
import { ref, watch } from "vue";
import { useCanvasDrawing } from "./useCanvasDrawing.composable";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";
import SectionEditor from "./SectionEditor.vue";

const { t } = useI18n();
const { openToast } = useToast();

const props = defineProps<{
  modelImageId: string;
  imageBase64String: string;
}>();

const drawingState = useCanvasDrawing();
const {
  startDrawing,
  stopDrawing,
  removeLastPolygon,
} = drawingState;

const emit = defineEmits<{
  (e: "created:section"): void;
}>();

const newSection = ref<AddSectionDTO>({
  englishName: "",
  arabicName: "",
  hindiName: "",
  urduName: "",
  bengaliName: "",
  coordinates: [],
  alterations: [],
});

const isCreatingNewSection = ref<boolean>(false);
function resetNewSection() {
  isCreatingNewSection.value = false;
  if (newSection.value.coordinates.length > 0) {
    removeLastPolygon();
  }
  newSection.value = {
    englishName: "",
    arabicName: "",
    hindiName: "",
    urduName: "",
    bengaliName: "",
    coordinates: [],
    alterations: [],
  };
  stopDrawing();
}

function startCreatingNewSection() {
  resetNewSection();
  isCreatingNewSection.value = true;
  setTimeout(() => {
    startDrawing();
  }, 100);
}

async function addSection() {
  if (!can("models.update")) return;
  try {
    await apiClient.modelsControllerAddSection(
      props.modelImageId,
      newSection.value
    );
    resetNewSection();
    openToast(t("models.sections.createSection.success"));
    emit("created:section");
  } catch (error: any) {
    openToast(
      t("models.sections.createSection.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  } finally {
    isCreatingNewSection.value = false;
  }
}

watch(
  () => props.modelImageId,
  () => {
    resetNewSection();
  }
);
</script>
