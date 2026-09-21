<template>
  <Button v-if="can('extras.create')" @click="isOpen = true">
    {{ $t("extras.addNewExtraModal.title") }}
  </Button>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="w-[560px] max-w-full space-y-5">
      <h1 class="text-xl font-bold">
        {{ $t("extras.addNewExtraModal.title") }}
      </h1>
      <MultiLanguageNameForm ref="namesForm" v-model="newExtra" is-inline />
      <div class="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div class="space-y-1.5">
          <InputLabel for="price">
            {{ $t("common.inputs.price.label") }}
          </InputLabel>
          <div class="grid grid-cols-[1fr_auto] items-center gap-2">
            <TextInput
              id="price"
              v-model="newExtra.price"
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
      </div>
      <div class="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" @click="closeModal">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="createExtra">
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
  InputLabel,
} from "@/components";
import TextInput from "@/components/ui/inputs/TextInput.vue";
import { apiClient, type CreateExtraDTO } from "@/integration";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "created:extra"): void;
}>();

const isOpen = ref<boolean>(false);

const newExtra = ref<CreateExtraDTO>({
  englishName: "",
  arabicName: "",
  hindiName: "",
  urduName: "",
  bengaliName: "",
  price: 0,
  sorting: undefined,
});
const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();

const priceValidationError = ref<string>("");
function validatePrice() {
  if (!newExtra.value.price) {
    priceValidationError.value = "common.inputs.price.errorMessage";
    return false;
  }
  priceValidationError.value = "";
  return true;
}

async function createExtra() {
  if (!namesForm.value) return;
  try {
    if (namesForm.value.validateForm() && validatePrice()) {
      await apiClient.extrasControllerCreateExtra(
        newExtra.value
      );
      openToast(t("extras.addNewExtraModal.success"));
      emit("created:extra");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t("extras.addNewExtraModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

function closeModal() {
  newExtra.value = {
    englishName: "",
    arabicName: "",
    hindiName: "",
    urduName: "",
    bengaliName: "",
    price: 0,
    sorting: undefined,
  };
  priceValidationError.value = "";
  isOpen.value = false;
}
</script>
