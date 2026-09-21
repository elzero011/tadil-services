<template>
  <Button v-if="can('informations.update')" variant="outline" size="sm" @click="openModal">
    <Edit />
  </Button>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="w-[600px] max-w-full space-y-5">
      <h1 class="text-xl font-bold">
        {{ $t("informations.editInformationModal.title") }}
      </h1>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <InputLabel for="type">
            {{ $t("common.inputs.infoType.label") }}
          </InputLabel>
          <SelectMenu
            v-model="localInformation.type"
            :options="infoTypeOptions"
            :placeholder="$t('common.inputs.infoType.placeholder')"
          />
        </div>
        <div class="space-y-1.5">
          <InputLabel>
            {{ $t("common.inputs.infoType.requirement") }}
          </InputLabel>
          <div
            class="flex w-full rounded-lg border border-border bg-muted/40 p-1"
          >
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                !localInformation.isRequired
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="localInformation.isRequired = false"
            >
              {{ $t("common.inputs.infoType.options.optional") }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                localInformation.isRequired
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="localInformation.isRequired = true"
            >
              {{ $t("common.inputs.infoType.options.required") }}
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="localInformation.type === InformationType.CHECKBOX"
        class="space-y-1.5"
      >
        <InputLabel for="extras">
          {{ $t("common.inputs.extras.label") }}
        </InputLabel>
        <SelectMenu
          :options="extrasOptions"
          :placeholder="$t('common.inputs.extras.placeholder')"
          @update:model-value="onCheckboxExtraSelected"
        />
      </div>
      <div class="border-t border-border pt-4">
        <MultiLanguageNameForm
          ref="namesForm"
          v-model="localInformation"
          is-inline
        />
      </div>
      <div
        v-if="localInformation.type === InformationType.NUMBER"
        class="space-y-1.5"
      >
        <InputLabel for="unit">
          {{ $t("common.inputs.unit.label") }}
        </InputLabel>
        <SelectMenu
          v-model="localInformation.unit"
          :options="unitOptions"
          :placeholder="$t('common.inputs.unit.placeholder')"
        />
      </div>
      <div
        v-if="localInformation.type === InformationType.SELECT_MENU"
        class="space-y-1.5"
      >
        <InputLabel for="extras">
          {{ $t("common.inputs.extras.label") }}
        </InputLabel>
        <SelectMenu
          v-model="localInformation.extras"
          :options="extrasOptions"
          :placeholder="$t('common.inputs.extras.placeholder')"
          multiple
        />
      </div>
      <div class="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" @click="closeModal">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="updateInformation">
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
  InputLabel,
  MultiLanguageNameForm,
  SelectMenu,
} from "@/components";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Edit } from "lucide-vue-next";
import { can } from "@/auth";
import {
  apiClient,
  InformationType,
  type DisplayInformationDTO,
  type UpdateInformationDTO,
  type DisplayExtraDTO,
} from "@/integration";

const { t } = useI18n();
const { openToast } = useToast();

const props = defineProps<{
  information: DisplayInformationDTO;
  extras: DisplayExtraDTO[];
  extrasOptions: { key: string; label: string }[];
}>();

const emit = defineEmits<{
  (e: "updated:information"): void;
}>();

const isOpen = ref<boolean>(false);

const infoTypeOptions = computed(() => [
  {
    key: InformationType.TEXT,
    label: t("common.inputs.infoType.options.text"),
  },
  {
    key: InformationType.NUMBER,
    label: t("common.inputs.infoType.options.number"),
  },
  {
    key: InformationType.SELECT_MENU,
    label: t("common.inputs.infoType.options.selectMenu"),
  },
  {
    key: InformationType.CHECKBOX,
    label: t("common.inputs.infoType.options.checkbox"),
  },
]);

const unitOptions = computed(() => [
  { key: "cm", label: t("common.inputs.unit.options.cm") },
  { key: "inch", label: t("common.inputs.unit.options.inch") },
]);

function onCheckboxExtraSelected(extraId?: string | string[]) {
  if (Array.isArray(extraId)) return;
  if (!extraId) return;

  const extra = props.extras.find((extra) => extra.id === extraId);
  if (!extra) return;

  localInformation.value.extras = [extra.id];
  localInformation.value.arabicName = extra.arabicName;
  localInformation.value.englishName = extra.englishName;
  localInformation.value.urduName = extra.urduName;
  localInformation.value.hindiName = extra.hindiName;
  localInformation.value.bengaliName = extra.bengaliName;
}

function informationToUpdateDto(
  information: DisplayInformationDTO
): UpdateInformationDTO {
  return {
    englishName: information.englishName,
    arabicName: information.arabicName,
    hindiName: information.hindiName,
    urduName: information.urduName,
    bengaliName: information.bengaliName,
    isRequired: information.isRequired,
    type: information.type,
    extras: information.extras,
    unit: information.unit,
    sorting: information.sorting,
  };
}

const localInformation = ref<UpdateInformationDTO>(
  informationToUpdateDto(props.information)
);

watch(
  () => props.information,
  (newInfo) => {
    if (isOpen.value) {
      localInformation.value.sorting = newInfo.sorting;
      return;
    }
    localInformation.value = informationToUpdateDto(newInfo);
  }
);

const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();

async function updateInformation() {
  if (!namesForm.value) return;
  try {
    if (namesForm.value.validateForm()) {
      await apiClient.informationsControllerUpdateInformation(
        props.information.id,
        {
          ...localInformation.value,
          sorting: props.information.sorting,
        }
      );
      openToast(t("informations.editInformationModal.success"));
      emit("updated:information");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t("informations.editInformationModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

function openModal() {
  localInformation.value = informationToUpdateDto(props.information);
  isOpen.value = true;
}

function closeModal() {
  localInformation.value = informationToUpdateDto(props.information);
  isOpen.value = false;
}
</script>
