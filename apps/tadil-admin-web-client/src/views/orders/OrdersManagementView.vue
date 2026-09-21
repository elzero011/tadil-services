<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{{ $t("orders.title") }}</h1>
      <p class="text-muted-foreground">{{ $t("orders.subtitle") }}</p>
    </div>

    <!-- Filters -->
    <OrdersFilters
      v-model="filters"
      :status-options="statusOptions"
      :tailor-options="tailorOptions"
      :courier-options="courierOptions"
      :customer-options="customerOptions"
      :tailor-label="selectedLabels.tailor"
      :courier-label="selectedLabels.courier"
      :customer-label="selectedLabels.customer"
      :tailor-loading="lookupLoading.tailor"
      :courier-loading="lookupLoading.courier"
      :customer-loading="lookupLoading.customer"
      :show-tailor-filter="can('tailors.read')"
      :show-courier-filter="can('couriers.read')"
      :show-customer-filter="can('customers.read')"
      @search:tailor="searchTailors"
      @search:courier="searchCouriers"
      @search:customer="searchCustomers"
      @selected:tailor="selectedLabels.tailor = $event.label"
      @selected:courier="selectedLabels.courier = $event.label"
      @selected:customer="selectedLabels.customer = $event.label"
      @reset="onResetFilters"
    />

    <!-- Orders Table (including modals) -->
    <OrdersTable
      :orders="orders"
      :is-loading="isLoading"
      :available-tailors="availableTailors"
      @refresh="fetchOrders"
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
import { ref, reactive, onMounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient, type DisplayOrderDTO, type DisplayUserDTO } from "@/integration";
import { useI18n } from "vue-i18n";
import { useLocalizedCityComposable } from "@/composables";
import OrdersFilters, { type OrdersFilterState } from "./components/OrdersFilters.vue";
import OrdersTable from "./components/OrdersTable.vue";
import { Pagination } from "@/components";
import { can } from "@/auth";

const { t } = useI18n();
const { cityLabel } = useLocalizedCityComposable();
const route = useRoute();
const router = useRouter();

const orders = ref<DisplayOrderDTO[]>([]);
const isLoading = ref(true);

const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filters = ref<OrdersFilterState>({
  status: "all",
  tailorId: "",
  courierId: "",
  customerId: "",
  dateFrom: "",
  dateTo: "",
});

// Labels for the selected participants, kept so the trigger shows a name even
// though the searchable dropdown only holds the current (limited) result page.
const selectedLabels = reactive({ tailor: "", courier: "", customer: "" });

const tailors = ref<DisplayUserDTO[]>([]);
const couriers = ref<DisplayUserDTO[]>([]);
const customers = ref<DisplayUserDTO[]>([]);
const lookupLoading = reactive({ tailor: false, courier: false, customer: false });

const LOOKUP_LIMIT = 20;

// Options for filters
const statusOptions = computed(() => [
  { key: "all", label: t("orders.filters.allStatuses") },
  { key: "pending", label: t("orderStatus.pending") },
  { key: "waitingForTailorAssignement", label: t("orderStatus.waitingForTailorAssignement") },
  { key: "waitingForCourierAssignement", label: t("orderStatus.waitingForCourierAssignement") },
  { key: "inProgress", label: t("orderStatus.inProgress") },
  { key: "done", label: t("orderStatus.done") },
  { key: "canceled", label: t("orderStatus.canceled") },
]);

const userLabel = (u: DisplayUserDTO) => `${u.firstName} ${u.lastName}`;

const tailorOptions = computed(() => tailors.value.map((u) => ({ key: u.id, label: userLabel(u) })));
const courierOptions = computed(() => couriers.value.map((u) => ({ key: u.id, label: userLabel(u) })));
const customerOptions = computed(() => customers.value.map((u) => ({ key: u.id, label: userLabel(u) })));

const availableTailors = computed(() =>
  tailors.value.map((user: DisplayUserDTO) => ({ key: user.id, label: `${user.firstName} ${user.lastName} (${cityLabel(user) || 'No City'})` }))
);

const searchTailors = async (search: string) => {
  if (!can("tailors.read")) return;
  lookupLoading.tailor = true;
  try {
    const res = await apiClient.tailorsControllerGetTailors({ search, pageSize: LOOKUP_LIMIT });
    tailors.value = res.data.data;
  } catch (error) {
    console.error("Failed to search tailors", error);
  } finally {
    lookupLoading.tailor = false;
  }
};

const searchCouriers = async (search: string) => {
  if (!can("couriers.read")) return;
  lookupLoading.courier = true;
  try {
    const res = await apiClient.couriersControllerGetCouriers({ search, pageSize: LOOKUP_LIMIT });
    couriers.value = res.data.data;
  } catch (error) {
    console.error("Failed to search couriers", error);
  } finally {
    lookupLoading.courier = false;
  }
};

const searchCustomers = async (search: string) => {
  if (!can("customers.read")) return;
  lookupLoading.customer = true;
  try {
    const res = await apiClient.customersControllerGetCustomers({ search, pageSize: LOOKUP_LIMIT });
    customers.value = res.data.data;
  } catch (error) {
    console.error("Failed to search customers", error);
  } finally {
    lookupLoading.customer = false;
  }
};

const fetchOrders = async () => {
  if (!can("orders.read")) return;
  isLoading.value = true;
  try {
    const query: Record<string, any> = { page: page.value, pageSize: pageSize.value };
    if (filters.value.status !== "all") query.status = filters.value.status;
    if (filters.value.tailorId) query.tailorId = filters.value.tailorId;
    if (filters.value.courierId) query.courierId = filters.value.courierId;
    if (filters.value.customerId) query.customerId = filters.value.customerId;
    if (filters.value.dateFrom) query.dateFrom = filters.value.dateFrom;
    if (filters.value.dateTo) query.dateTo = filters.value.dateTo;

    const response = await apiClient.ordersControllerGetOrders(query);
    orders.value = response.data.data;
    total.value = response.data.total;
  } catch (error) {
    console.error("Failed to fetch orders", error);
  } finally {
    isLoading.value = false;
  }
};

const onPageChange = (target: number) => {
  page.value = target;
  fetchOrders();
};

// Clear the persisted trigger labels when the user resets the filters; the IDs
// themselves are cleared by OrdersFilters, which triggers the watcher → refetch.
const onResetFilters = () => {
  selectedLabels.tailor = "";
  selectedLabels.courier = "";
  selectedLabels.customer = "";
};

// Any filter change resets to the first page and refetches.
watch(filters, () => {
  page.value = 1;
  fetchOrders();
}, { deep: true });

onMounted(async () => {
  // Deep link: /orders?customerId=...&customerName=... pre-filters by customer.
  const customerId = route.query.customerId;
  const customerName = route.query.customerName;
  if (typeof customerId === "string" && customerId) {
    filters.value.customerId = customerId;
    if (typeof customerName === "string") selectedLabels.customer = customerName;
    // Clear the query so a manual reset doesn't re-apply it. Setting the filter
    // above already triggers the deep watcher, which performs the fetch.
    router.replace({ query: {} });
    return;
  }
  fetchOrders();
});
</script>

<style scoped>
</style>
