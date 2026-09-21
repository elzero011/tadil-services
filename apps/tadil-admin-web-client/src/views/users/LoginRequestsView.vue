<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ $t("loginRequests.title") }}</h1>
        <p class="text-muted-foreground">{{ $t("loginRequests.subtitle") }}</p>
      </div>
    </div>

    <div class="bg-card rounded-lg border shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs uppercase bg-muted/50">
            <tr>
              <th class="px-6 py-4 font-medium">{{ $t("loginRequests.table.name") }}</th>
              <th class="px-6 py-4 font-medium">{{ $t("loginRequests.table.phone") }}</th>
              <th class="px-6 py-4 font-medium">{{ $t("loginRequests.table.role") }}</th>
              <th class="px-6 py-4 font-medium text-right">{{ $t("loginRequests.table.actions") }}</th>
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
                {{ $t("loginRequests.table.empty") }}
              </td>
            </tr>
            <tr v-for="user in requests" :key="user.id" class="hover:bg-muted/30 transition-colors">
              <td class="px-6 py-4 font-medium">{{ user.firstName }} {{ user.lastName }}</td>
              <td class="px-6 py-4">{{ user.phone }}</td>
              <td class="px-6 py-4 capitalize">{{ user.role }}</td>
              <td class="px-6 py-4 text-right space-x-2">
                <Button v-if="can('login_requests.approve')" variant="outline" size="sm" @click="handleApprove(user.id)" :disabled="isProcessing === user.id">
                  {{ $t("loginRequests.buttons.approve") }}
                </Button>
                <Button v-if="can('login_requests.reject')" variant="destructive" size="sm" @click="handleReject(user.id)" :disabled="isProcessing === user.id">
                  {{ $t("loginRequests.buttons.reject") }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/integration";
import type { DisplayUserDTO } from "@/integration/DTOs";
import Button from "@/components/ui/Button.vue";
import { Loader2 } from "lucide-vue-next";
import { can } from "@/auth";

const requests = ref<DisplayUserDTO[]>([]);
const isLoading = ref(true);
const isProcessing = ref<string | null>(null);

const fetchRequests = async () => {
  if (!can("login_requests.read")) return;
  isLoading.value = true;
  try {
    const response = await apiClient.loginRequestsControllerGetPending();
    requests.value = response.data;
  } catch (error) {
    console.error("Failed to fetch login requests", error);
  } finally {
    isLoading.value = false;
  }
};

const handleApprove = async (id: string) => {
  if (!can("login_requests.approve")) return;
  isProcessing.value = id;
  try {
    await apiClient.loginRequestsControllerApprove(id);
    await fetchRequests();
  } catch (error) {
    console.error("Failed to approve request", error);
  } finally {
    isProcessing.value = null;
  }
};

const handleReject = async (id: string) => {
  if (!can("login_requests.reject")) return;
  isProcessing.value = id;
  try {
    await apiClient.loginRequestsControllerReject(id);
    await fetchRequests();
  } catch (error) {
    console.error("Failed to reject request", error);
  } finally {
    isProcessing.value = null;
  }
};

onMounted(fetchRequests);
</script>
