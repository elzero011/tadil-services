<template>
  <div class="flex gap-3 items-end bg-card p-4 rounded-lg border shadow-sm">
    <div class="space-y-1.5 flex-1 min-w-0">
      <label class="text-xs font-medium uppercase text-muted-foreground">{{ $t("orders.filters.status") }}</label>
      <SelectMenu v-model="filters.status" :options="statusOptions" class="w-full" />
    </div>

    <div v-if="showTailorFilter" class="space-y-1.5 flex-1 min-w-0">
      <label class="text-xs font-medium uppercase text-muted-foreground">{{ $t("orders.filters.tailor") }}</label>
      <SearchableSelect
        v-model="filters.tailorId"
        class="w-full"
        :options="tailorOptions"
        :selected-label="tailorLabel"
        :is-loading="tailorLoading"
        placeholder="orders.filters.allTailors"
        clear-label="orders.filters.allTailors"
        @search="$emit('search:tailor', $event)"
        @selected="$emit('selected:tailor', $event)"
      />
    </div>

    <div v-if="showCourierFilter" class="space-y-1.5 flex-1 min-w-0">
      <label class="text-xs font-medium uppercase text-muted-foreground">{{ $t("orders.filters.courier") }}</label>
      <SearchableSelect
        v-model="filters.courierId"
        class="w-full"
        :options="courierOptions"
        :selected-label="courierLabel"
        :is-loading="courierLoading"
        placeholder="orders.filters.allCouriers"
        clear-label="orders.filters.allCouriers"
        @search="$emit('search:courier', $event)"
        @selected="$emit('selected:courier', $event)"
      />
    </div>

    <div v-if="showCustomerFilter" class="space-y-1.5 flex-1 min-w-0">
      <label class="text-xs font-medium uppercase text-muted-foreground">{{ $t("orders.filters.customer") }}</label>
      <SearchableSelect
        v-model="filters.customerId"
        class="w-full"
        :options="customerOptions"
        :selected-label="customerLabel"
        :is-loading="customerLoading"
        placeholder="orders.filters.allCustomers"
        clear-label="orders.filters.allCustomers"
        @search="$emit('search:customer', $event)"
        @selected="$emit('selected:customer', $event)"
      />
    </div>

    <div class="space-y-1.5 shrink-0">
      <label class="text-xs font-medium uppercase text-muted-foreground">{{ $t("orders.filters.dateFrom") }}</label>
      <TextInput v-model="filters.dateFrom" type="date" class="w-36" />
    </div>

    <div class="space-y-1.5 shrink-0">
      <label class="text-xs font-medium uppercase text-muted-foreground">{{ $t("orders.filters.dateTo") }}</label>
      <TextInput v-model="filters.dateTo" type="date" class="w-36" />
    </div>

    <Button variant="outline" class="shrink-0" @click="resetFilters">
      {{ $t("orders.buttons.reset") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { SelectMenu, SearchableSelect, TextInput, Button } from "@/components";

export interface OrdersFilterState {
  status: string;
  tailorId: string;
  courierId: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
}

const filters = defineModel<OrdersFilterState>({ required: true });

const { showTailorFilter = true, showCourierFilter = true, showCustomerFilter = true } = defineProps<{
  statusOptions: { key: string; label: string }[];
  tailorOptions: { key: string; label: string }[];
  courierOptions: { key: string; label: string }[];
  customerOptions: { key: string; label: string }[];
  tailorLabel: string;
  courierLabel: string;
  customerLabel: string;
  tailorLoading: boolean;
  courierLoading: boolean;
  customerLoading: boolean;
  showTailorFilter?: boolean;
  showCourierFilter?: boolean;
  showCustomerFilter?: boolean;
}>();

const emit = defineEmits<{
  (e: "search:tailor", value: string): void;
  (e: "search:courier", value: string): void;
  (e: "search:customer", value: string): void;
  (e: "selected:tailor", value: { key: string; label: string }): void;
  (e: "selected:courier", value: { key: string; label: string }): void;
  (e: "selected:customer", value: { key: string; label: string }): void;
  (e: "reset"): void;
}>();

const resetFilters = () => {
  filters.value = {
    status: "all",
    tailorId: "",
    courierId: "",
    customerId: "",
    dateFrom: "",
    dateTo: "",
  };
  emit("reset");
};
</script>
