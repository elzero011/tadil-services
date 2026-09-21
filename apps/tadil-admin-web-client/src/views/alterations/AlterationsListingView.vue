<template>
  <div>
    <h1 class="text-2xl font-bold">{{ $t("nav.alterations") }}</h1>
    <div class="flex justify-end">
      <AddAlterationModal v-if="can('alterations.create') && can('models.read') && can('informations.read')"
        :sectionsOptions="sectionsOptions"
        :informationsOptions="informationsOptions"
        @created:alteration="getAlterations"
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
            <th class="ps-2 text-center">
              {{ $t("common.tableHeaders.price") }}
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
            v-for="alteration in alterations"
            :key="alteration.id"
            class="h-12 divide-x"
          >
            <td class="ps-2 text-center">{{ alteration.sorting }}</td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ alteration.englishName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ alteration.arabicName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ alteration.hindiName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ alteration.urduName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ alteration.bengaliName }}
            </td>
            <td class="ps-2 text-center max-w-40 truncate">
              {{ alteration.price }}{{ $t("common.currencies.ras") }}
            </td>
            <td class="">
              <div class="flex gap-2 justify-center">
                <SortingButton v-if="can('alterations.update')"
                  :sorting="alteration.sorting"
                  :max="alterations.length"
                  :save="(sorting) => updateSorting(alteration, sorting)"
                />
                <EditAlterationModal v-if="can('alterations.update') && can('models.read') && can('informations.read')"
                  :key="alteration.id"
                  :alteration="alteration"
                  :sectionsOptions="sectionsOptions"
                  :informationsOptions="informationsOptions"
                  @updated:alteration="getAlterations"
                />
                <DestructiveActionAlert v-if="can('alterations.delete')"
                  :title="$t('alterations.deleteAlteration.confirmMessage')"
                  :onConfirm="() => deleteAlteration(alteration.id)"
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
import { useI18n } from "vue-i18n";
import { can } from "@/auth";
import AddAlterationModal from "./AddAlterationModal.vue";
import EditAlterationModal from "./EditAlterationModal.vue";
import {
  apiClient,
  type DisplayAlterationDTO,
  type DisplaySectionDTO,
  type DisplayInformationDTO,
} from "@/integration";

const { t } = useI18n();
const { openToast } = useToast();

const alterations = ref<DisplayAlterationDTO[]>([]);
const isLoading = ref<boolean>(false);

async function getAlterations() {
  if (!can("alterations.read")) return;
  isLoading.value = true;
  alterations.value = (
    await apiClient.alterationsControllerGetAlterations()
  ).data;
  isLoading.value = false;
}

async function updateSorting(
  alteration: DisplayAlterationDTO,
  sorting: number
) {
  if (!can("alterations.update")) return;
  await apiClient.catalogSortingControllerUpdateSorting(
    "alterations",
    alteration.id,
    { sorting }
  );
  await getAlterations();
}

async function deleteAlteration(alterationId: string) {
  if (!can("alterations.delete")) return;
  try {
    await apiClient.alterationsControllerDeleteAlteration(alterationId);
    openToast(t("alterations.deleteAlteration.success"));
    getAlterations();
  } catch (error: any) {
    openToast(
      t("alterations.deleteAlteration.error"),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive",
    );
  }
}

const { locale } = useI18n();
const sections = ref<DisplaySectionDTO[]>([]);
const sectionsOptions = computed(() => {
  switch (locale.value) {
    case "ar":
      return sections.value.map((section) => ({
        key: section.id,
        label: section.arabicName,
      }));
    case "hi":
      return sections.value.map((section) => ({
        key: section.id,
        label: section.hindiName,
      }));
    case "ur":
      return sections.value.map((section) => ({
        key: section.id,
        label: section.urduName,
      }));
    case "bn":
      return sections.value.map((section) => ({
        key: section.id,
        label: section.bengaliName,
      }));
    default:
      return sections.value.map((section) => ({
        key: section.id,
        label: section.englishName,
      }));
  }
});
const informations = ref<DisplayInformationDTO[]>([]);
const informationsOptions = computed(() => {
  switch (locale.value) {
    case "ar":
      return informations.value.map((information) => ({
        key: information.id,
        label: information.arabicName,
      }));
    case "hi":
      return informations.value.map((information) => ({
        key: information.id,
        label: information.hindiName,
      }));
    case "ur":
      return informations.value.map((information) => ({
        key: information.id,
        label: information.urduName,
      }));
    case "bn":
      return informations.value.map((information) => ({
        key: information.id,
        label: information.bengaliName,
      }));
    default:
      return informations.value.map((information) => ({
        key: information.id,
        label: information.englishName,
      }));
  }
});

onBeforeMount(async () => {
  await getAlterations();
  if (can("alterations.create") || can("alterations.update")) {
    if (can("models.read"))
      sections.value = (await apiClient.modelsControllerGetSections()).data;
    if (can("informations.read"))
      informations.value = (await apiClient.informationsControllerGetInformations()).data;
  }
});
</script>
