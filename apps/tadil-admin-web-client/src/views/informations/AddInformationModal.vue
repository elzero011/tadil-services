<template>
  <Button v-if="can('informations.create')" @click="isOpen = true">
    {{ $t("informations.addNewInformationModal.title") }}
  </Button>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="w-[600px] max-w-full space-y-5">
      <h1 class="text-xl font-bold">
        {{ $t("informations.addNewInformationModal.title") }}
      </h1>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <InputLabel for="type">
            {{ $t("common.inputs.infoType.label") }}
          </InputLabel>
          <SelectMenu
            v-model="newInformation.type"
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
                !newInformation.isRequired
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="newInformation.isRequired = false"
            >
              {{ $t("common.inputs.infoType.options.optional") }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                newInformation.isRequired
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="newInformation.isRequired = true"
            >
              {{ $t("common.inputs.infoType.options.required") }}
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="newInformation.type === InformationType.CHECKBOX"
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
        <MultiLanguageNameForm ref="namesForm" v-model="newInformation" is-inline />
      </div>
      <div
        v-if="newInformation.type === InformationType.NUMBER"
        class="space-y-1.5"
      >
        <InputLabel for="unit">
          {{ $t("common.inputs.unit.label") }}
        </InputLabel>
        <SelectMenu
          v-model="newInformation.unit"
          :options="unitOptions"
          :placeholder="$t('common.inputs.unit.placeholder')"
        />
      </div>
      <div
        v-if="newInformation.type === InformationType.SELECT_MENU"
        class="space-y-1.5"
      >
        <InputLabel for="extras">
          {{ $t("common.inputs.extras.label") }}
        </InputLabel>
        <SelectMenu
          v-model="newInformation.extras"
          :options="extrasOptions"
          :placeholder="$t('common.inputs.extras.placeholder')"
          multiple
        />
      </div>
      <div class="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" @click="closeModal">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="createInformation">
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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";
import {
  apiClient,
  InformationType,
  type CreateInformationDTO,
  type DisplayExtraDTO,
} from "@/integration";

const { t } = useI18n();
const { openToast } = useToast();

const emit = defineEmits<{
  (e: "created:information"): void;
}>();
const props = defineProps<{
  extras: DisplayExtraDTO[];
  extrasOptions: { key: string; label: string }[];
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

  newInformation.value.extras = [extra.id];
  newInformation.value.arabicName = extra.arabicName;
  newInformation.value.englishName = extra.englishName;
  newInformation.value.urduName = extra.urduName;
  newInformation.value.hindiName = extra.hindiName;
  newInformation.value.bengaliName = extra.bengaliName;
}
const newInformation = ref<CreateInformationDTO>({
  englishName: "",
  arabicName: "",
  hindiName: "",
  urduName: "",
  bengaliName: "",
  isRequired: false,
  type: InformationType.TEXT,
  extras: [],
  unit: "",
  sorting: undefined,
});
const namesForm = ref<InstanceType<typeof MultiLanguageNameForm>>();

async function createInformation() {
  if (!namesForm.value) return;
  try {
    if (namesForm.value.validateForm()) {
      await apiClient.informationsControllerCreateInformation(
        newInformation.value
      );
      openToast(t("informations.addNewInformationModal.success"));
      emit("created:information");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t("informations.addNewInformationModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}

function closeModal() {
  newInformation.value = {
    englishName: "",
    arabicName: "",
    hindiName: "",
    urduName: "",
    bengaliName: "",
    isRequired: false,
    type: InformationType.TEXT,
    extras: [],
    unit: "",
    sorting: undefined,
  };
  isOpen.value = false;
}
</script>
