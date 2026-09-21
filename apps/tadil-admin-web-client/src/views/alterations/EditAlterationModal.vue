<template>
  <Button v-if="can('alterations.update')" variant="outline" size="sm" @click="openModal">
    <Edit />
  </Button>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="w-[620px] max-w-full space-y-5">
      <h1 class="text-xl font-bold">
        {{ $t("alterations.editAlterationModal.title") }}
      </h1>
      <MultiLanguageNameForm ref="namesForm" v-model="localAlteration" is-inline />
      <div class="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div class="space-y-1.5">
          <InputLabel for="price">
            {{ $t("common.inputs.price.label") }}
          </InputLabel>
          <div class="grid grid-cols-[1fr_auto] items-center gap-2">
            <TextInput
              id="price"
              v-model="localAlteration.price"
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
            v-model="localAlteration.sections"
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
            v-model="localAlteration.informations"
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
        <Button @click="updateAlteration">
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
  MultiLanguageNameForm,
  TextInput,
  InputLabel,
  SelectMenu,
  useToast,
} from "@/components";
import {
  apiClient,
  type DisplayAlterationDTO,
  type UpdateAlterationDTO,
} from "@/integration";
import { can } from "@/auth";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Edit } from "lucide-vue-next";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "updated:alteration"): void;
}>();
const props = defineProps<{
  alteration: DisplayAlterationDTO;
  sectionsOptions: { key: string; label: string }[];
  informationsOptions: { key: string; label: string }[];
}>();

const isOpen = ref<boolean>(false);

const localAlteration = ref<UpdateAlterationDTO>({ ...props.alteration });
const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();

watch(
  () => props.alteration.sorting,
  (sorting) => {
    localAlteration.value.sorting = sorting;
  }
);

const priceValidationError = ref<string>("");
function validatePrice() {
  if (!localAlteration.value.price) {
    priceValidationError.value = "common.inputs.price.errorMessage";
    return false;
  }
  priceValidationError.value = "";
  return true;
}

async function updateAlteration() {
  if (!namesForm.value) return;
  try {
    if (namesForm.value.validateForm() && validatePrice()) {
      await apiClient.alterationsControllerUpdateAlteration(
        props.alteration.id,
        {
          ...localAlteration.value,
          sorting: props.alteration.sorting,
        },
      );
      openToast(t("alterations.editAlterationModal.success"));
      emit("updated:alteration");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t("alterations.editAlterationModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive",
    );
  }
}

function openModal() {
  localAlteration.value = { ...props.alteration };
  isOpen.value = true;
}

function closeModal() {
  localAlteration.value = { ...props.alteration };
  isOpen.value = false;
}
</script>
