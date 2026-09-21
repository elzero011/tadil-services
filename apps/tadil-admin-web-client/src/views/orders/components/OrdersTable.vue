<template>
  <div class="bg-card rounded-lg border shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs uppercase bg-muted/50">
          <tr>
            <th class="px-6 py-4 font-medium">{{ $t("orders.table.reference") }}</th>
            <th class="px-6 py-4 font-medium">{{ $t("orders.table.date") }}</th>
            <th class="px-6 py-4 font-medium">{{ $t("orders.table.customer") }}</th>
            <th class="px-6 py-4 font-medium">{{ $t("orders.table.tailor") }}</th>
            <th class="px-6 py-4 font-medium">{{ $t("orders.table.courier") }}</th>
            <th class="px-6 py-4 font-medium">{{ $t("orders.table.status") }}</th>
            <th class="px-6 py-4 font-medium text-right">{{ $t("orders.table.total") }}</th>
            <th class="px-6 py-4 font-medium text-right">{{ $t("orders.table.actions") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-if="isLoading">
            <td colspan="8" class="px-6 py-10 text-center text-muted-foreground">
              <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2" />
              {{ $t("common.loading") }}
            </td>
          </tr>
          <tr v-else-if="orders.length === 0">
            <td colspan="8" class="px-6 py-10 text-center text-muted-foreground">
              {{ $t("orders.table.empty") }}
            </td>
          </tr>
          <tr v-for="order in orders" :key="order.id" class="hover:bg-muted/30 transition-colors">
            <td class="px-6 py-4 font-medium">#{{ order.reference }}</td>
            <td class="px-6 py-4 text-xs whitespace-nowrap">{{ formatDate(order.date) }}</td>
            <td class="px-6 py-4">
              {{ order.customerName }}
            </td>
            <td class="px-6 py-4 text-xs">
              {{ order.tailorName || '---' }}
            </td>
            <td class="px-6 py-4 text-xs">
              {{ order.courierName || '---' }}
            </td>
            <td class="px-6 py-4">
              <span 
                class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                :class="statusClasses(order.status)"
              >
                {{ $t('orderStatus.' + order.status) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right font-semibold">
              {{ order.totalPrice }} {{ $t("common.currencies.ras") }}
            </td>
            <td class="px-6 py-4 text-right flex justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                class="h-8 w-8 p-0"
                @click="openDetailsModal(order.id)"
              >
                <Eye class="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button 
                v-if="canAssignTailor(order) && can('orders.assign_tailor') && can('tailors.read')"
                variant="outline" 
                size="sm" 
                @click="openAssignModal(order)"
              >
                {{ $t("orders.buttons.assignTailor") }}
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AssignTailorModal 
      v-model="isAssignModalOpen" 
      :selected-order="selectedOrder" 
      :available-tailors="availableTailors"
      @assigned="$emit('refresh')"
    />

    <OrderDetailsModal
      v-model="isDetailsModalOpen"
      :order-id="selectedOrderId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components";
import { Loader2, Eye } from "lucide-vue-next";
import type { DisplayOrderDTO } from "@/integration";
import AssignTailorModal from "./AssignTailorModal.vue";
import OrderDetailsModal from "./OrderDetailsModal.vue";
import { can } from "@/auth";

const props = defineProps<{
  orders: DisplayOrderDTO[];
  isLoading: boolean;
  availableTailors: { key: string; label: string }[];
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const isAssignModalOpen = ref(false);
const selectedOrder = ref<DisplayOrderDTO | null>(null);

const isDetailsModalOpen = ref(false);
const selectedOrderId = ref<string | null>(null);

const openAssignModal = (order: DisplayOrderDTO) => {
  selectedOrder.value = order;
  isAssignModalOpen.value = true;
};

const openDetailsModal = (id: string) => {
  selectedOrderId.value = id;
  isDetailsModalOpen.value = true;
};

const canAssignTailor = (order: DisplayOrderDTO) => {
  return order.status === "waitingForTailorAssignement" || order.status === "pending";
};

const statusClasses = (status: string) => {
  switch (status) {
    case "done": return "text-green-700 bg-green-500/20 border-green-500/30";
    case "pending": return "text-amber-700 bg-amber-500/20 border-amber-500/30";
    case "inProgress": return "text-blue-700 bg-blue-500/20 border-blue-500/30";
    case "canceled": return "text-red-700 bg-red-500/20 border-red-500/30";
    default: return "text-purple-700 bg-purple-500/20 border-purple-500/30";
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};
</script>
