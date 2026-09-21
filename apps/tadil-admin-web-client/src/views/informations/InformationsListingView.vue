<template>
  <div>
    <h1 class="text-2xl font-bold">{{ $t("nav.informations") }}</h1>
    <div class="flex justify-end">
      <AddInformationModal v-if="can('informations.create') && can('extras.read')"
        :extras="extras"
        :extrasOptions="extrasOptions"
        @created:information="getInformations"
      />
    </div>
    <div class="mt-4 border rounded-lg overflow-auto">
      <table class="relative w-full table-fixed text-sm">
        <thead class="border-b sticky top-0 z-10 bg-background h-12">
          <tr class="divide-x">
            <th class="w-20 text-center">
              {{ $t("common.tableHeaders.sorting") }}
            </th>
            <th class="ps-2 text-center">
              {{ $t("common.tableHeaders.englishName") }}
            </th>
            <th class="ps-2 text-center">
              {{ $t("common.tableHeaders.arabicName") }}
            </th>
            <th class="ps-2 text-center">
              {{ $t("common.tableHeaders.hindiName") }}
            </th>
            <th class="ps-2 text-center">
              {{ $t("common.tableHeaders.urduName") }}
            </th>
            <th class="ps-2 text-center">
              {{ $t("common.tableHeaders.bengaliName") }}
            </th>
            <th class="w-36">{{ $t("common.tableHeaders.actions") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-if="isLoading" v-for="index in 5" :key="index" class="divide-x">
            <td>
              <div class="ps-2 flex justify-center">
                <SkeletonItem variant="short-text" />
              </div>
            </td>
            <td>
              <div class="ps-2 flex justify-center">
                <SkeletonItem variant="short-text" />
              </div>
            </td>
            <td>
              <div class="ps-2 flex justify-center">
                <SkeletonItem variant="short-text" />
              </div>
            </td>
            <td>
              <div class="ps-2 flex justify-center">
                <SkeletonItem variant="short-text" />
              </div>
            </td>
            <td>
              <div class="ps-2 flex justify-center">
                <SkeletonItem variant="short-text" />
              </div>
            </td>
            <td class="flex gap-2 justify-center">
              <SkeletonItem variant="action-button" />
              <SkeletonItem variant="action-button" />
            </td>
          </tr>
          <tr
            v-else
            v-for="information in informations"
            :key="information.id"
            class="h-12 divide-x"
          >
            <td class="ps-2 text-center">{{ information.sorting }}</td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ information.englishName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ information.arabicName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ information.hindiName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ information.urduName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ information.bengaliName }}
            </td>
            <td class="">
              <div class="flex gap-2 justify-center">
                <SortingButton v-if="can('informations.update')"
                  :sorting="information.sorting"
                  :max="informations.length"
                  :save="(sorting) => updateSorting(information, sorting)"
                />
                <EditInformationModal v-if="can('informations.update') && can('extras.read')"
                  :key="information.id"
                  :information="information"
                  :extras="extras"
                  :extrasOptions="extrasOptions"
                  @updated:information="getInformations"
                />
                <DestructiveActionAlert v-if="can('informations.delete')"
                  :title="$t('informations.deleteInformation.confirmMessage')"
                  :onConfirm="() => deleteInformation(information.id)"
                >
                  <template #trigger="{ openAlert }">
                    <Button size="sm" variant="destructive" @click="openAlert">
                      <Trash2 />
                    </Button>
                  </template>
                </DestructiveActionAlert>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref } from "vue";
import {
  Button,
  DestructiveActionAlert,
  SkeletonItem,
  SortingButton,
  useToast,
} from "@/components";
import { Trash2 } from "lucide-vue-next";
import AddInformationModal from "./AddInformationModal.vue";
import {
  apiClient,
  type DisplayExtraDTO,
  type DisplayInformationDTO,
} from "@/integration";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";
import EditInformationModal from "./EditInformationModal.vue";

const { t, locale } = useI18n();
const { openToast } = useToast();

const informations = ref<DisplayInformationDTO[]>([]);
const isLoading = ref<boolean>(false);

async function getInformations() {
  if (!can("informations.read")) return;
  isLoading.value = true;
  informations.value = (
    await apiClient.informationsControllerGetInformations()
  ).data;
  isLoading.value = false;
}

async function updateSorting(
  information: DisplayInformationDTO,
  sorting: number
) {
  if (!can("informations.update")) return;
  await apiClient.catalogSortingControllerUpdateSorting(
    "informations",
    information.id,
    { sorting }
  );
  await getInformations();
}

async function deleteInformation(informationId: string) {
  if (!can("informations.delete")) return;
  try {
    await apiClient.informationsControllerDeleteInformation(informationId);
    openToast(t("informations.deleteInformation.success"));
    getInformations();
  } catch (error: any) {
    openToast(
      t("informations.deleteInformation.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive",
    );
  }
}

const extras = ref<DisplayExtraDTO[]>([]);
const extrasOptions = computed(() => {
  switch (locale.value) {
    case "ar":
      return extras.value.map((extra) => ({
        key: extra.id,
        label: extra.arabicName,
      }));
    case "hi":
      return extras.value.map((extra) => ({
        key: extra.id,
        label: extra.hindiName,
      }));
    case "ur":
      return extras.value.map((extra) => ({
        key: extra.id,
        label: extra.urduName,
      }));
    case "bn":
      return extras.value.map((extra) => ({
        key: extra.id,
        label: extra.bengaliName,
      }));
    default:
      return extras.value.map((extra) => ({
        key: extra.id,
        label: extra.englishName,
      }));
  }
});

onBeforeMount(async () => {
  await getInformations();
  if ((can("informations.create") || can("informations.update")) && can("extras.read"))
    extras.value = (await apiClient.extrasControllerGetExtras()).data;
});
</script>
