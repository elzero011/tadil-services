<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">{{ $t("nav.couriers") }}</h1>

    <div class="flex justify-between items-center gap-3">
      <div class="w-72 flex items-center gap-2 rounded-md border border-input bg-background px-3">
        <Search class="h-4 w-4 opacity-50 shrink-0" />
        <input
          v-model="search"
          :placeholder="$t('customers.searchPlaceholder')"
          class="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          @input="onSearchInput"
        />
      </div>
      <AddUserModal
        :selectedUserType="ROLE.COURIER"
        @created:user="fetchCouriers"
      />
    </div>

    <UsersTable
      :users="couriers"
      :is-loading="isLoading"
      :user-type="ROLE.COURIER"
      :max-sorting="sortingMax"
      @refresh="fetchCouriers"
    />

    <Pagination
      :page="page"
      :page-size="pageSize"
      :total="total"
      @update:page="onPageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Search } from "lucide-vue-next";
import { apiClient, ROLE, type DisplayUserDTO } from "@/integration";
import { Pagination } from "@/components";
import AddUserModal from "./AddUserModal.vue";
import UsersTable from "./components/UsersTable.vue";
import { can } from "@/auth";

const couriers = ref<DisplayUserDTO[]>([]);
const isLoading = ref<boolean>(false);

const search = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const sortingMax = ref(0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchCouriers = async () => {
  if (!can("couriers.read")) return;
  if (!can("couriers.read")) return;
  isLoading.value = true;
  try {
    const response = await apiClient.couriersControllerGetCouriers({
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    couriers.value = response.data.data;
    total.value = response.data.total;
    sortingMax.value = response.data.sortingMax;
  } catch (error) {
    console.error("Failed to fetch couriers", error);
  } finally {
    isLoading.value = false;
  }
};

// Search when the user stops typing.
const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchCouriers();
  }, 350);
};

const onPageChange = (target: number) => {
  page.value = target;
  fetchCouriers();
};

onMounted(fetchCouriers);
</script>
