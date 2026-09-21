<template>
  <div class="grid grid-cols-[1fr_400px] gap-6 w-[1400px] max-w-full">
    <!-- Drawing Area -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold">
        {{ title }}
      </h2>
      <ModelSegmenter
        :imageBase64String="imageBase64String"
        :sections="[]"
        :drawingState="drawingState"
      />
    </div>

    <!-- Form Area -->
    <div class="space-y-4 border-s ps-6">
      <h2 class="text-xl font-bold">
        {{ formTitle }}
      </h2>
      <div class="space-y-4">
        <MultiLanguageNameForm ref="namesForm" v-model="localEntity" />
        <div class="space-y-1.5">
          <InputLabel for="alterations">
            {{ $t("common.inputs.alterations.label") }}
          </InputLabel>
          <SelectMenu
            v-model="localEntity.alterations"
            multiple
            :options="alterationsOptions"
            :placeholder="$t('common.inputs.alterations.placeholder')"
          />
        </div>
        <div class="text-sm">
          <div
            v-if="modelValue.coordinates.length < 3"
            class="flex items-center gap-2"
            :class="{
              'text-muted-foreground': !isCoordinatesValidated,
              'text-red-500': isCoordinatesValidated,
            }"
          >
            <PenTool class="h-4 w-4" />
            <p>
              {{ $t("models.sections.createSection.coordinatesPlaceholder") }}
            </p>
          </div>
          <div v-else class="flex items-center gap-2 text-primary">
            <CheckCircle class="h-4 w-4" />
            <p>
              {{ $t("models.sections.createSection.coordinatesValidated") }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-4 pt-6">
        <Button variant="outline" @click="emit('cancel')">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="handleSave">
          {{ $t("common.buttons.save") }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Button,
  MultiLanguageNameForm,
  SelectMenu,
  InputLabel,
} from "@/components";
import { type DisplayAlterationDTO, apiClient } from "@/integration";
import { computed, onMounted, ref, watch } from "vue";
import { type CanvasDrawingComposable } from "./useCanvasDrawing.composable";
import { CheckCircle, PenTool } from "lucide-vue-next";
import ModelSegmenter from "./ModelSegmenter.vue";
import { useOptions } from "@/composables/useOptions.composable";
import { can } from "@/auth";

interface SectionData {
  englishName: string;
  arabicName: string;
  hindiName: string;
  urduName: string;
  bengaliName: string;
  coordinates: any[];
  alterations: string[];
}

const props = defineProps<{
  modelValue: SectionData;
  imageBase64String: string;
  drawingState: CanvasDrawingComposable;
  title: string;
  formTitle: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: SectionData): void;
  (e: "save"): void;
  (e: "cancel"): void;
}>();

const localEntity = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();
const isCoordinatesValidated = ref<boolean>(true);

const alterations = ref<DisplayAlterationDTO[]>([]);
const { options: alterationsOptions } = useOptions(alterations as any);

async function getAlterations() {
  if (!can("alterations.read")) return;
  alterations.value = (
    await apiClient.alterationsControllerGetAlterations()
  ).data;
}

function validateCoordinates() {
  if (
    localEntity.value.coordinates.length < 3 &&
    props.drawingState.currentPolygon.value.length < 3
  ) {
    isCoordinatesValidated.value = false;
    return false;
  }
  isCoordinatesValidated.value = true;
  return true;
}

async function handleSave() {
  if (!namesForm.value) return;

  if (props.drawingState.isCanvasFocused.value) {
    const coords = props.drawingState.completePolygon();
    if (coords.length >= 3) {
      const updated = { ...localEntity.value, coordinates: coords };
      emit("update:modelValue", updated);
    }
  }

  if (namesForm.value.validateForm() && validateCoordinates()) {
    emit("save");
  }
}

onMounted(() => {
  if (can("alterations.read")) getAlterations();
});

watch(
  () => props.drawingState.isCanvasFocused.value,
  (newFocusState) => {
    if (!newFocusState) {
      const coords = props.drawingState.completePolygon();
      if (coords.length >= 3) {
        const updated = { ...localEntity.value, coordinates: coords };
        emit("update:modelValue", updated);
      }
    }
  },
);

defineExpose({
  validateForm: () => namesForm.value?.validateForm() && validateCoordinates(),
});
</script>
