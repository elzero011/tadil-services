<template>
  <div
    class="flex justify-between items-center p-2 border border-border rounded-lg overflow-hidden hover:bg-muted cursor-grab"
    @mouseenter="drawingState.highlightPolygon(section.coordinates)"
    @mouseleave="drawingState.unhighlightPolygon"
  >
    <p class="text-xl font-semibold">{{ translatedName }}</p>
    <div class="flex gap-2">
      <EditSectionModal
        :section="section"
        :imageBase64String="imageBase64String"
        @updated:section="emit('updated:section')"
      />
      <Button v-if="can('models.delete')" variant="destructive" size="icon-sm" @click="deleteSection()">
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiClient, type DisplaySectionDTO } from "@/integration";
import { type CanvasDrawingComposable } from "./useCanvasDrawing.composable";
import { Button, useToast } from "@/components";
import { Trash2 } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { useTranslatedNamesComposable } from "@/composables";
import EditSectionModal from "./EditSectionModal.vue";
import { can } from "@/auth";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "deleted:section"): void;
  (e: "updated:section"): void;
}>();
const props = defineProps<{
  section: DisplaySectionDTO;
  imageBase64String: string;
  drawingState: CanvasDrawingComposable;
}>();
const { translatedName } = useTranslatedNamesComposable(props.section);

async function deleteSection() {
  if (!can("models.delete")) return;
  try {
    await apiClient.modelsControllerDeleteSection(props.section.id);
    props.drawingState.unhighlightPolygon();
    openToast(t("models.sections.deleteSection.success"));
    emit("deleted:section");
  } catch (error: any) {
    openToast(
      t("models.sections.deleteSection.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}
</script>
