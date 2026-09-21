<template>
  <div>
    <Button v-if="can('models.update') && can('alterations.read')" variant="outline" size="icon-sm" @click="openEditModal">
      <Edit class="h-4 w-4" />
    </Button>
    <Modal v-model="isOpen" @close-modal="closeModal">
      <SectionEditor v-if="isOpen"
        v-model="localSection"
        :imageBase64String="imageBase64String"
        :drawingState="drawingState"
        :title="$t('models.sections.editSection.drawTitle')"
        :formTitle="$t('models.sections.editSection.formTitle')"
        @save="updateSection"
        @cancel="closeModal"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { Button, useToast, Modal } from "@/components";
import {
  apiClient,
  type DisplaySectionDTO,
  type UpdateSectionDTO,
} from "@/integration";
import { ref } from "vue";
import { useCanvasDrawing } from "./useCanvasDrawing.composable";
import { Edit } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";
import SectionEditor from "./SectionEditor.vue";

const { t } = useI18n();
const { openToast } = useToast();

const props = defineProps<{
  section: DisplaySectionDTO;
  imageBase64String: string;
}>();

const emit = defineEmits<{
  (e: "updated:section"): void;
}>();

const drawingState = useCanvasDrawing();
const { startDrawing, stopDrawing, highlightPolygon, unhighlightPolygon } =
  drawingState;

const isOpen = ref<boolean>(false);
const localSection = ref<UpdateSectionDTO>({
  englishName: props.section.englishName,
  arabicName: props.section.arabicName,
  hindiName: props.section.hindiName,
  urduName: props.section.urduName,
  bengaliName: props.section.bengaliName,
  coordinates: [...props.section.coordinates],
  alterations: [...props.section.alterations],
});

function openEditModal() {
  localSection.value = {
    englishName: props.section.englishName,
    arabicName: props.section.arabicName,
    hindiName: props.section.hindiName,
    urduName: props.section.urduName,
    bengaliName: props.section.bengaliName,
    coordinates: [...props.section.coordinates],
    alterations: [...props.section.alterations],
  };
  isOpen.value = true;
  setTimeout(() => {
    highlightPolygon(localSection.value.coordinates);
    startDrawing();
  }, 100);
}

function closeModal() {
  isOpen.value = false;
  unhighlightPolygon();
  stopDrawing();
}

async function updateSection() {
  if (!can("models.update")) return;
  try {
    await apiClient.modelsControllerUpdateSection(
      props.section.id,
      localSection.value,
    );
    openToast(t("models.sections.editSection.success"));
    emit("updated:section");
    closeModal();
  } catch (error: any) {
    openToast(
      t("models.sections.editSection.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive",
    );
  }
}
</script>
