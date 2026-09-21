<template>
  <Modal v-model="isOpen" @close-modal="isOpen = false">
    <div class="w-[640px] max-w-full space-y-5">
      <div>
        <h1 class="text-xl font-bold">{{ $t("payoutRequests.wallet.title") }}</h1>
        <p v-if="beneficiaryName" class="text-sm text-muted-foreground">{{ beneficiaryName }}</p>
      </div>

      <div v-if="isLoading" class="py-10 text-center text-muted-foreground">
        <Loader2 class="mx-auto mb-2 h-6 w-6 animate-spin" />
        {{ $t("common.loading") }}
      </div>

      <div v-else-if="error" class="py-10 text-center text-destructive">
        {{ $t("payoutRequests.wallet.error") }}
      </div>

      <template v-else-if="details">
        <!-- Balance -->
        <div class="rounded-lg border border-border bg-muted/30 p-4">
          <p class="text-xs uppercase text-muted-foreground">{{ $t("payoutRequests.wallet.balance") }}</p>
          <p class="text-2xl font-bold">
            {{ details.balance }} <span class="text-base font-normal text-muted-foreground">{{ $t("common.currencies.ras") }}</span>
          </p>
        </div>

        <!-- Transactions -->
        <div class="space-y-2">
          <h2 class="text-sm font-semibold">{{ $t("payoutRequests.wallet.transactions") }}</h2>
          <div class="max-h-56 overflow-auto rounded-lg border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs uppercase">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.type") }}</th>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.reference") }}</th>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.amount") }}</th>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.date") }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-if="details.transactions.length === 0">
                  <td colspan="4" class="px-3 py-4 text-center text-muted-foreground">
                    {{ $t("payoutRequests.wallet.noTransactions") }}
                  </td>
                </tr>
                <tr v-for="tx in details.transactions" :key="tx.id">
                  <td class="px-3 py-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="tx.type === 'EARNING' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'"
                    >
                      {{ $t(`payoutRequests.wallet.types.${tx.type}`) }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">{{ tx.reference }}</td>
                  <td class="px-3 py-2 font-medium">{{ tx.amount }} {{ $t("common.currencies.ras") }}</td>
                  <td class="px-3 py-2 text-xs text-muted-foreground">{{ formatDate(tx.date) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Payout history -->
        <div class="space-y-2">
          <h2 class="text-sm font-semibold">{{ $t("payoutRequests.wallet.payouts") }}</h2>
          <div class="max-h-44 overflow-auto rounded-lg border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs uppercase">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.status") }}</th>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.amount") }}</th>
                  <th class="px-3 py-2 font-medium">{{ $t("payoutRequests.wallet.cols.date") }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-if="details.payoutRequests.length === 0">
                  <td colspan="3" class="px-3 py-4 text-center text-muted-foreground">
                    {{ $t("payoutRequests.wallet.noPayouts") }}
                  </td>
                </tr>
                <tr v-for="p in details.payoutRequests" :key="p.id">
                  <td class="px-3 py-2">{{ $t(`payoutRequests.wallet.statuses.${p.status}`) }}</td>
                  <td class="px-3 py-2 font-medium">{{ p.amount }} {{ $t("common.currencies.ras") }}</td>
                  <td class="px-3 py-2 text-xs text-muted-foreground">{{ formatDate(p.date) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Modal } from "@/components";
import { can } from "@/auth";
import { apiClient } from "@/integration";
import { Loader2 } from "lucide-vue-next";

interface WalletTransaction {
  id: string;
  reference: string;
  amount: number;
  type: "EARNING" | "PAYOUT";
  date: string;
  orderId?: string;
}
interface WalletPayoutRequest {
  id: string;
  amount: number;
  status: "PENDING" | "FULFILLED" | "REJECTED";
  date: string;
}
interface WalletDetails {
  balance: number;
  transactions: WalletTransaction[];
  payoutRequests: WalletPayoutRequest[];
}

const props = defineProps<{
  userId: string | null;
  beneficiaryName?: string;
}>();

const isOpen = defineModel<boolean>();

const details = ref<WalletDetails | null>(null);
const isLoading = ref(false);
const error = ref(false);

async function fetchWallet(userId: string) {
  if (!can("payouts.read")) return;
  isLoading.value = true;
  error.value = false;
  details.value = null;
  try {
    const response = await apiClient.payoutRequestsControllerGetWallet(userId);
    details.value = response.data as WalletDetails;
  } catch (e) {
    console.error("Failed to fetch wallet details", e);
    error.value = true;
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => [isOpen.value, props.userId] as const,
  ([open, userId]) => {
    if (open && userId) fetchWallet(userId);
  }
);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}
</script>
