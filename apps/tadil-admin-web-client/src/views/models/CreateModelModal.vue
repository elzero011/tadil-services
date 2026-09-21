<template>
  <Button v-if="can('models.create')" variant="outline" class="w-full" @click="isOpen = true">
    {{ $t("models.addNewModelModal.title") }}
  </Button>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="max-w-[80vw] min-w-[300px] space-y-4">
      <h1 class="text-xl font-bold">
        {{ $t("models.addNewModelModal.title") }}
      </h1>
      <div class="space-y-2">
        <MultiLanguageNameForm ref="namesForm" v-model="newModel" />
        <div>
          <InputLabel for="category">{{
            $t("common.inputs.category.label")
          }}</InputLabel>
          <SelectMenu
            v-model="newModel.category"
            :options="categoryOptions"
            :placeholder="$t('common.inputs.category.placeholder')"
            :validationErrorMessage="categortErrorMessage"
            @update:model-value="validateCategory"
          />
        </div>
        <div class="space-y-1.5 flex flex-col">
          <InputLabel for="imageFile">
            {{ $t("common.inputs.imageFile.label") }}
          </InputLabel>
          <FileInput
            id="imageFile"
            v-model="newModel.files"
            accept=".jpg,.jpeg,.png,.svg"
            multiple
            :placeholder="$t('common.inputs.imageFile.placeholder')"
          />
        </div>
      </div>
      <div class="mt-2 flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" @click="closeModal">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="createModel">
          {{ $t("common.buttons.save") }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import {
  Button,
  Modal,
  useToast,
  InputLabel,
  FileInput,
  MultiLanguageNameForm,
  SelectMenu,
} from "@/components";
import { apiClient, type CreateModelDTO } from "@/integration";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "created:model"): void;
}>();

const isOpen = ref<boolean>();

const categoryOptions = computed(() => {
  return [
    { key: "all", label: t("common.inputs.category.options.all") },
    { key: "men", label: t("common.inputs.category.options.men") },
    { key: "women", label: t("common.inputs.category.options.women") },
    { key: "kids", label: t("common.inputs.category.options.kids") },
  ];
});

const newModel = ref<CreateModelDTO>({
  englishName: "",
  arabicName: "",
  hindiName: "",
  urduName: "",
  bengaliName: "",
  category: "all",
  files: [],
});
const categortErrorMessage = ref<string>("");
function validateCategory() {
  if (!newModel.value.category) {
    categortErrorMessage.value = t(
      "common.inputs.category.validation.required"
    );
    return false;
  }
  categortErrorMessage.value = "";
  return true;
}
const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();

async function createModel() {
  if (!can("models.create")) return;
  if (!namesForm.value) return;
  try {
    if (namesForm.value.validateForm() && validateCategory()) {
      await apiClient.modelsControllerCreateModel({
        ...newModel.value,
      });
      openToast(t("models.addNewModelModal.success"));
      emit("created:model");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t("models.addNewModelModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

function resetForm() {
  newModel.value = {
    englishName: "",
    arabicName: "",
    hindiName: "",
    urduName: "",
    bengaliName: "",
    category: "",
    files: [],
  };
}

function closeModal() {
  resetForm();
  isOpen.value = false;
}
</script>
