<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">{{ $t("payoutRequests.title") }}</h1>
      <p class="text-muted-foreground">{{ $t("payoutRequests.subtitle") }}</p>
    </div>

    <div class="bg-card rounded-lg border shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs uppercase bg-muted/50">
            <tr>
              <th class="px-6 py-4 font-medium">{{ $t("payoutRequests.table.user") }}</th>
              <th class="px-6 py-4 font-medium">{{ $t("payoutRequests.table.amount") }}</th>
              <th class="px-6 py-4 font-medium">{{ $t("payoutRequests.table.date") }}</th>
              <th class="px-6 py-4 font-medium text-right">{{ $t("payoutRequests.table.actions") }}</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="isLoading">
              <td colspan="4" class="px-6 py-10 text-center text-muted-foreground">
                <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2" />
                {{ $t("common.loading") }}
              </td>
            </tr>
            <tr v-else-if="requests.length === 0">
              <td colspan="4" class="px-6 py-10 text-center text-muted-foreground">
                {{ $t("payoutRequests.table.empty") }}
              </td>
            </tr>
            <tr v-for="req in requests" :key="req.id" class="hover:bg-muted/30 transition-colors">
              <td class="px-6 py-4 font-medium">
                <button
                  type="button"
                  class="text-left text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                  v-if="can('payouts.read')"
                  @click="openWallet(req)"
                >
                  {{ req.user?.firstName }} {{ req.user?.lastName }}
                </button>
                <span class="text-xs text-muted-foreground block">{{ req.user?.phone }}</span>
              </td>
              <td class="px-6 py-4">{{ req.amount }} {{ $t("common.currencies.ras") }}</td>
              <td class="px-6 py-4 text-xs">{{ formatDate(req.date) }}</td>
              <td class="px-6 py-4">
                <div class="flex justify-end gap-2">
                  <DestructiveActionAlert v-if="can('payouts.fulfill')"
                    :title="$t('payoutRequests.confirmations.fulfillTitle')"
                    :description="$t('payoutRequests.confirmations.fulfill')"
                    :confirm-text="$t('payoutRequests.buttons.fulfill')"
                    :on-confirm="() => handleFulfill(req.id)"
                  >
                    <template #trigger="{ openAlert }">
                      <Button variant="outline" size="sm" @click="openAlert" :disabled="isProcessing === req.id">
                        {{ $t("payoutRequests.buttons.fulfill") }}
                      </Button>
                    </template>
                  </DestructiveActionAlert>
                  <DestructiveActionAlert v-if="can('payouts.reject')"
                    :title="$t('payoutRequests.confirmations.rejectTitle')"
                    :description="$t('payoutRequests.confirmations.reject')"
                    :confirm-text="$t('payoutRequests.buttons.reject')"
                    :on-confirm="() => handleReject(req.id)"
                  >
                    <template #trigger="{ openAlert }">
                      <Button variant="destructive" size="sm" @click="openAlert" :disabled="isProcessing === req.id">
                        {{ $t("payoutRequests.buttons.reject") }}
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

    <WalletDetailsModal
      v-model="isWalletOpen"
      :user-id="selectedUserId"
      :beneficiary-name="selectedUserName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/integration";
import { Button, DestructiveActionAlert } from "@/components";
import WalletDetailsModal from "./WalletDetailsModal.vue";
import { Loader2 } from "lucide-vue-next";
import { can } from "@/auth";

const requests = ref<any[]>([]);
const isLoading = ref(true);
const isProcessing = ref<string | null>(null);

const isWalletOpen = ref(false);
const selectedUserId = ref<string | null>(null);
const selectedUserName = ref<string>("");

const openWallet = (req: any) => {
  selectedUserId.value = req.userId ?? req.user?.id ?? null;
  selectedUserName.value = `${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim();
  isWalletOpen.value = true;
};

const fetchRequests = async () => {
  if (!can("payouts.read")) return;
  isLoading.value = true;
  try {
    const response = await apiClient.payoutRequestsControllerGetPending();
    requests.value = response.data;
  } catch (error) {
    console.error("Failed to fetch payout requests", error);
  } finally {
    isLoading.value = false;
  }
};

const handleFulfill = async (id: string) => {
  if (!can("payouts.fulfill")) return;
  isProcessing.value = id;
  try {
    await apiClient.payoutRequestsControllerFulfill(id);
    await fetchRequests();
  } catch (error) {
    console.error("Failed to fulfill request", error);
  } finally {
    isProcessing.value = null;
  }
};

const handleReject = async (id: string) => {
  if (!can("payouts.reject")) return;
  isProcessing.value = id;
  try {
    await apiClient.payoutRequestsControllerReject(id);
    await fetchRequests();
  } catch (error) {
    console.error("Failed to reject request", error);
  } finally {
    isProcessing.value = null;
  }
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

onMounted(fetchRequests);
</script>
