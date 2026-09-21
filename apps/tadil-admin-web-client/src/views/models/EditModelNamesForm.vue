<template>
  <div class="space-y-2 p-2 border border-border rounded-lg overflow-hidden">
    <p class="text-xl font-semibold">{{ $t("models.editModel.title") }}</p>
    <div class="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-2">
      <TogglableTextInput
        key="englishName"
        :label="$t('common.inputs.englishName.label')"
        :originalValue="modelEdit.englishName"
        isRequired
        :validationErrorMessage="$t('common.inputs.englishName.errorMessage')"
        @save="(newValue: string)=> modelEdit.englishName = newValue"
      />
      <TogglableTextInput
        key="arabicName"
        :label="$t('common.inputs.arabicName.label')"
        :originalValue="modelEdit.arabicName"
        isRequired
        :validationErrorMessage="$t('common.inputs.arabicName.errorMessage')"
        @save="(newValue: string)=> modelEdit.arabicName = newValue"
      />
      <TogglableTextInput
        key="hindiName"
        :label="$t('common.inputs.hindiName.label')"
        :originalValue="modelEdit.hindiName"
        isRequired
        :validationErrorMessage="$t('common.inputs.hindiName.errorMessage')"
        @save="(newValue: string)=> modelEdit.hindiName = newValue"
      />
      <TogglableTextInput
        key="urduName"
        :label="$t('common.inputs.urduName.label')"
        :originalValue="modelEdit.urduName"
        isRequired
        :validationErrorMessage="$t('common.inputs.urduName.errorMessage')"
        @save="(newValue: string)=> modelEdit.urduName = newValue"
      />
      <TogglableTextInput
        key="bengaliName"
        :label="$t('common.inputs.bengaliName.label')"
        :originalValue="modelEdit.bengaliName"
        isRequired
        :validationErrorMessage="$t('common.inputs.bengaliName.errorMessage')"
        @save="(newValue: string)=> modelEdit.bengaliName = newValue"
      />
      <div class="">
        <InputLabel for="category">{{
          $t("common.inputs.category.label")
        }}</InputLabel>
        <SelectMenu
          v-model="modelEdit.category"
          :options="categoryOptions"
          :placeholder="$t('common.inputs.category.placeholder')"
          :validationErrorMessage="categortErrorMessage"
          @update:model-value="validateCategory"
        />
      </div>
    </div>
    <div class="flex justify-end gap-4">
      <Button v-if="can('models.update')"
        variant="outline"
        @click="resetLocalModel"
        :disabled="!editsNotSaved"
      >
        {{ $t("common.buttons.cancel") }}
      </Button>
      <Button @click="updateModel" :disabled="!editsNotSaved">
        <Save class="h-4 w-4 mr-2" />
        {{ $t("common.buttons.save") }}
      </Button>
      <DestructiveActionAlert
        :title="$t('models.deleteModel.confirmMessage')"
        @confirmed="() => deleteModel()"
      >
        <template #trigger="{ openAlert }">
          <Button v-if="can('models.delete')" variant="destructive" class="w-full" @click="openAlert">
            <Trash2 class="h-4 w-4" />
            <p>{{ $t("models.deleteModel.deleteButton") }}</p>
          </Button>
        </template>
      </DestructiveActionAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Button,
  DestructiveActionAlert,
  TogglableTextInput,
  useToast,
  InputLabel,
  SelectMenu,
} from "@/components";
import {
  apiClient,
  type DisplayModelDTO,
  type UpdateModelDTO,
} from "@/integration";
import { useI18n } from "vue-i18n";
import { Save, Trash2 } from "lucide-vue-next";
import { can } from "@/auth";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "updated:model"): void;
  (e: "deleted:model"): void;
}>();
const props = defineProps<{
  model: DisplayModelDTO;
}>();

const categoryOptions = computed(() => {
  return [
    { key: "all", label: t("common.inputs.category.options.all") },
    { key: "men", label: t("common.inputs.category.options.men") },
    { key: "women", label: t("common.inputs.category.options.women") },
    { key: "kids", label: t("common.inputs.category.options.kids") },
  ];
});

const modelEdit = ref<UpdateModelDTO>({
  englishName: props.model.englishName,
  arabicName: props.model.arabicName,
  hindiName: props.model.hindiName,
  urduName: props.model.urduName,
  bengaliName: props.model.bengaliName,
  category: props.model.category,
});
const categortErrorMessage = ref<string>("");
function validateCategory() {
  if (!modelEdit.value.category) {
    categortErrorMessage.value = t(
      "common.inputs.category.validation.required"
    );
    return false;
  }
  categortErrorMessage.value = "";
  return true;
}

const editsNotSaved = computed(() => {
  return (
    modelEdit.value.englishName !== props.model.englishName ||
    modelEdit.value.arabicName !== props.model.arabicName ||
    modelEdit.value.hindiName !== props.model.hindiName ||
    modelEdit.value.urduName !== props.model.urduName ||
    modelEdit.value.bengaliName !== props.model.bengaliName ||
    modelEdit.value.category !== props.model.category
  );
});

async function updateModel() {
  if (!can("models.update")) return;
  try {
    if (validateCategory())
      await apiClient.modelsControllerUpdateModel(
        props.model.id,
        modelEdit.value
      );
    openToast(t("models.editModel.success"));
    emit("updated:model");
  } catch (error: any) {
    openToast(
      t("models.editModel.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

async function deleteModel() {
  if (!can("models.delete")) return;
  try {
    await apiClient.modelsControllerDeleteModel(props.model.id);
    openToast(t("models.deleteModel.success"));
    emit("deleted:model");
  } catch (error: any) {
    openToast(
      t("models.deleteModel.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

function resetLocalModel() {
  modelEdit.value = {
    englishName: props.model.englishName,
    arabicName: props.model.arabicName,
    hindiName: props.model.hindiName,
    urduName: props.model.urduName,
    bengaliName: props.model.bengaliName,
    category: props.model.category ?? "",
  };
}
watch(
  () => props.model,
  () => {
    resetLocalModel();
  }
);
</script>
