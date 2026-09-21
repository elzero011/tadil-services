<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">{{ $t("nav.customers") }}</h1>

    <div class="flex justify-end">
      <div class="w-72 flex items-center gap-2 rounded-md border border-input bg-background px-3">
        <Search class="h-4 w-4 opacity-50 shrink-0" />
        <input
          v-model="search"
          :placeholder="$t('customers.searchPlaceholder')"
          class="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          @input="onSearchInput"
        />
      </div>
    </div>

    <CustomersTable
      :customers="customers"
      :is-loading="isLoading"
      :max-sorting="sortingMax"
      @refresh="fetchCustomers"
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
import { apiClient, type DisplayUserDTO } from "@/integration";
import { Pagination } from "@/components";
import CustomersTable from "./components/CustomersTable.vue";
import { can } from "@/auth";

const customers = ref<DisplayUserDTO[]>([]);
const isLoading = ref(false);

const search = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const sortingMax = ref(0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchCustomers = async () => {
  if (!can("customers.read")) return;
  isLoading.value = true;
  try {
    const res = await apiClient.customersControllerGetCustomers({
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    customers.value = res.data.data;
    total.value = res.data.total;
    sortingMax.value = res.data.sortingMax;
  } catch (error) {
    console.error("Failed to fetch customers", error);
  } finally {
    isLoading.value = false;
  }
};

// Search when the user stops typing.
const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchCustomers();
  }, 350);
};

const onPageChange = (target: number) => {
  page.value = target;
  fetchCustomers();
};

onMounted(fetchCustomers);
</script>
