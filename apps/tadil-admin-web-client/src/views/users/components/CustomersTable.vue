<template>
  <div class="border rounded-lg overflow-auto">
    <table class="relative w-full table-fixed">
      <thead class="border-b sticky top-0 z-10 bg-background h-12">
        <tr class="divide-x">
          <th class="w-24 text-center">{{ $t("common.tableHeaders.sorting") }}</th>
          <th class="ps-2 text-center">{{ $t("users.tableHeaders.firstName") }}</th>
          <th class="ps-2 text-center">{{ $t("users.tableHeaders.lastName") }}</th>
          <th class="ps-2 text-center">{{ $t("users.tableHeaders.phone") }}</th>
          <th class="ps-2 text-center">{{ $t("customers.tableHeaders.city") }}</th>
          <th class="w-72">{{ $t("common.tableHeaders.actions") }}</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr v-if="isLoading" v-for="index in 5" :key="index" class="divide-x">
          <td v-for="col in 5" :key="col">
            <div class="ps-2 flex justify-center">
              <SkeletonItem variant="short-text" />
            </div>
          </td>
          <td class="flex gap-2 justify-center">
            <SkeletonItem variant="action-button" />
            <SkeletonItem variant="action-button" />
            <SkeletonItem variant="action-button" />
          </td>
        </tr>
        <tr v-else-if="customers.length === 0">
          <td colspan="6" class="h-16 text-center text-muted-foreground">
            {{ $t("customers.table.empty") }}
          </td>
        </tr>
        <tr v-else v-for="customer in customers" :key="customer.id" class="min-h-12 divide-x">
          <td class="ps-2 text-center">{{ customer.sorting }}</td>
          <td class="ps-2 text-center truncate">{{ customer.firstName }}</td>
          <td class="ps-2 text-center truncate">{{ customer.lastName }}</td>
          <td class="ps-2 text-center truncate">{{ customer.phone }}</td>
          <td class="ps-2 text-center truncate">{{ cityLabel(customer) || "--" }}</td>
          <td>
            <div class="flex flex-wrap gap-2 justify-center px-1 py-1">
              <SortingButton v-if="can('customers.update')"
                :sorting="customer.sorting"
                :max="maxSorting"
                :save="(sorting) => updateSorting(customer.id, sorting)"
              />
              <ViewUserModal :user="customer" />
              <Button size="sm" variant="outline" @click="viewOrders(customer)">
                <ClipboardList class="h-4 w-4 me-1" />
                {{ $t("customers.buttons.viewOrders") }}
              </Button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { Button, SkeletonItem, SortingButton } from "@/components";
import { ClipboardList } from "lucide-vue-next";
import { apiClient, type DisplayUserDTO } from "@/integration";
import { useLocalizedCityComposable } from "@/composables";
import ViewUserModal from "../ViewUserModal.vue";
import { can } from "@/auth";

defineProps<{
  customers: DisplayUserDTO[];
  isLoading: boolean;
  maxSorting: number;
}>();
const emit = defineEmits<{ (e: "refresh"): void }>();

const router = useRouter();
const { cityLabel } = useLocalizedCityComposable();

async function updateSorting(id: string, sorting: number) {
  if (!can("customers.update")) return;
  await apiClient.usersSortingControllerUpdateSorting(id, { sorting });
  emit("refresh");
}

const viewOrders = (customer: DisplayUserDTO) => {
  router.push({
    path: "/orders",
    query: {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
    },
  });
};
</script>
