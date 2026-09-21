<template>
  <Button v-if="can('alterations.create')" @click="isOpen = true">
    {{ $t("alterations.addNewAlterationModal.title") }}
  </Button>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="w-[620px] max-w-full space-y-5">
      <h1 class="text-xl font-bold">
        {{ $t("alterations.addNewAlterationModal.title") }}
      </h1>
      <MultiLanguageNameForm ref="namesForm" v-model="newAlteration" is-inline />
      <div class="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div class="space-y-1.5">
          <InputLabel for="price">
            {{ $t("common.inputs.price.label") }}
          </InputLabel>
          <div class="grid grid-cols-[1fr_auto] items-center gap-2">
            <TextInput
              id="price"
              v-model="newAlteration.price"
              type="number"
              placeholder="0.00"
              :validation-error-message="$t(priceValidationError)"
              @update:model-value="validatePrice"
            />
            <p class="text-sm text-muted-foreground">
              {{ $t("common.currencies.ras") }}
            </p>
          </div>
        </div>
        <div class="space-y-1.5">
          <InputLabel for="sections">
            {{ $t("common.inputs.sections.label") }}
          </InputLabel>
          <SelectMenu
            v-model="newAlteration.sections"
            :options="sectionsOptions"
            :placeholder="$t('common.inputs.sections.placeholder')"
            multiple
          />
        </div>
        <div class="col-span-2 space-y-1.5">
          <InputLabel for="informations">
            {{ $t("common.inputs.informations.label") }}
          </InputLabel>
          <SelectMenu
            v-model="newAlteration.informations"
            :options="informationsOptions"
            :placeholder="$t('common.inputs.informations.placeholder')"
            multiple
          />
        </div>
      </div>
      <div class="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" @click="closeModal">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="createAlteration">
          {{ $t("common.buttons.save") }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import {
  Button,
  useToast,
  Modal,
  MultiLanguageNameForm,
  SelectMenu,
  InputLabel,
} from "@/components";
import TextInput from "@/components/ui/inputs/TextInput.vue";
import { apiClient, type CreateAlterationDTO } from "@/integration";
import { can } from "@/auth";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "created:alteration"): void;
}>();
defineProps<{
  sectionsOptions: { key: string; label: string }[];
  informationsOptions: { key: string; label: string }[];
}>();

const isOpen = ref<boolean>(false);

const newAlteration = ref<CreateAlterationDTO>({
  englishName: "",
  arabicName: "",
  hindiName: "",
  urduName: "",
  bengaliName: "",
  price: 0,
  sections: [],
  informations: [],
  sorting: undefined,
});
const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();

const priceValidationError = ref<string>("");
function validatePrice() {
  if (!newAlteration.value.price) {
    priceValidationError.value = "common.inputs.price.errorMessage";
    return false;
  }
  priceValidationError.value = "";
  return true;
}

async function createAlteration() {
  if (!namesForm.value) return;
  try {
    if (namesForm.value.validateForm() && validatePrice()) {
      await apiClient.alterationsControllerCreateAlteration(
        newAlteration.value
      );
      openToast(t("alterations.addNewAlterationModal.success"));
      emit("created:alteration");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t("alterations.addNewAlterationModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

function closeModal() {
  newAlteration.value = {
    englishName: "",
    arabicName: "",
    hindiName: "",
    urduName: "",
    bengaliName: "",
    price: 0,
    sections: [],
    informations: [],
    sorting: undefined,
  };
  priceValidationError.value = "";
  isOpen.value = false;
}
</script>
