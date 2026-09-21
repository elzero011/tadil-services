<template>
  <Modal
    v-model="isOpen"
    @close-modal="closeModal"
    class="w-[920px] max-w-full max-h-[90vh] overflow-y-auto"
  >
    <div v-if="isLoadingDetails" class="py-20 text-center text-muted-foreground">
      <Loader2 class="mx-auto mb-4 h-8 w-8 animate-spin" />
      {{ $t("orders.details.loading") }}
    </div>
    <div v-else-if="selectedOrderDetails" class="space-y-6">
      <!-- Header -->
      <div
        class="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
              :class="statusClasses(selectedOrderDetails.status)"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
              {{ $t("orderStatus." + selectedOrderDetails.status) }}
            </span>
            <h1 class="text-2xl font-bold leading-tight">
              {{ $t("orders.details.title", { ref: selectedOrderDetails.reference }) }}
            </h1>
            <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar class="h-3.5 w-3.5" />
              {{ $t("orders.details.placedOn") }}
              {{ formatDate(selectedOrderDetails.date) }}
            </p>
          </div>
          <div
            class="rounded-xl border border-border bg-card/80 px-4 py-3 text-end shadow-sm backdrop-blur"
          >
            <p class="text-xs uppercase tracking-wide text-muted-foreground">
              {{ $t("orders.details.totalPrice") }}
            </p>
            <p class="text-2xl font-bold text-primary">
              {{ selectedOrderDetails.totalPrice }}
              {{ $t("common.currencies.ras") }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left Column: Info & History -->
        <div class="space-y-6 lg:col-span-1">
          <!-- Participants -->
          <section class="rounded-xl border border-border bg-muted/30 p-4">
            <h3
              class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ $t("orders.details.participants") }}
            </h3>
            <div class="space-y-2.5">
              <div
                class="flex items-start gap-3 rounded-lg bg-card p-2.5"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  <User class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">
                    {{ $t("orders.details.customer") }}
                  </p>
                  <p class="truncate font-medium">
                    {{ selectedOrderDetails.customerName }}
                  </p>
                  <p class="truncate text-sm text-muted-foreground">
                    {{ cityLabel(selectedOrderDetails) || $t("orders.details.noCity") }}
                  </p>
                </div>
              </div>
              <div
                class="flex items-start gap-3 rounded-lg bg-card p-2.5"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400"
                >
                  <Scissors class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">
                    {{ $t("orders.details.assignedTailor") }}
                  </p>
                  <p class="truncate font-medium">
                    {{ selectedOrderDetails.tailorName || $t("orders.details.pending") }}
                  </p>
                </div>
              </div>
              <div
                class="flex items-start gap-3 rounded-lg bg-card p-2.5"
              >
                <div
                  class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  <Truck class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">
                    {{ $t("orders.details.assignedCourier") }}
                  </p>
                  <p class="truncate font-medium">
                    {{ selectedOrderDetails.courierName || $t("orders.details.pending") }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- History Timeline -->
          <section
            v-if="selectedOrderDetails.history?.length"
            class="rounded-xl border border-border p-4"
          >
            <h3
              class="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ $t("orders.details.statusHistory") }}
            </h3>
            <div class="ms-1 space-y-4 border-s-2 border-border ps-4">
              <div
                v-for="(hist, idx) in selectedOrderDetails.history"
                :key="idx"
                class="relative"
              >
                <div
                  class="absolute top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card"
                  style="inset-inline-start: -21px"
                ></div>
                <p class="text-sm font-medium">
                  {{ $t("orderStatus." + hist.status) }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ formatDate(hist.timestamp) }}
                </p>
              </div>
            </div>
          </section>
        </div>

        <!-- Right Column: Items & Chat -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Items -->
          <section>
            <h3
              class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ $t("orders.details.orderItems") }}
            </h3>
            <div class="space-y-3">
              <!-- Predefined Items -->
              <div
                v-for="item in selectedOrderDetails.items"
                :key="item.id"
                class="flex gap-4 rounded-xl border border-border bg-card p-3"
              >
                <img
                  :src="item.imageFileUrl"
                  class="h-20 w-20 shrink-0 rounded-lg bg-muted/50 object-cover"
                />
                <div class="min-w-0 flex-grow">
                  <div class="flex items-start justify-between gap-3">
                    <p class="font-semibold">{{ item.englishName }}</p>
                    <p class="shrink-0 font-semibold text-primary">
                      {{ item.price }} {{ $t("common.currencies.ras") }}
                    </p>
                  </div>
                  <div class="mt-2 space-y-2">
                    <div v-for="section in item.sections" :key="section.id">
                      <span
                        class="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {{ section.englishName }}
                      </span>
                      <div class="mt-1 space-y-0.5 ps-2 text-xs text-muted-foreground">
                        <p v-for="alt in section.alterations" :key="alt.id">
                          • {{ alt.englishName }} (+{{ alt.price }}
                          {{ $t("common.currencies.ras") }})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Custom Items -->
              <div
                v-for="item in selectedOrderDetails.customItems"
                :key="item.id"
                class="flex gap-4 rounded-xl border border-border bg-card p-3"
              >
                <img
                  :src="item.imageFileUrl"
                  class="h-20 w-20 shrink-0 rounded-lg bg-muted/50 object-cover"
                />
                <div class="min-w-0 flex-grow">
                  <div class="flex items-start justify-between gap-3">
                    <p class="font-semibold">
                      {{ $t("orders.details.customRequest") }}
                    </p>
                    <p class="shrink-0 font-semibold text-primary">
                      {{ item.price }} {{ $t("common.currencies.ras") }}
                    </p>
                  </div>
                  <div class="mt-2 space-y-0.5 ps-2 text-xs text-muted-foreground">
                    <p v-for="alt in item.alterations" :key="alt.id">
                      • {{ alt.englishName }} (+{{ alt.price }}
                      {{ $t("common.currencies.ras") }})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Chat Logs -->
          <section v-if="selectedOrderDetails.chats?.length">
            <h3
              class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ $t("orders.details.chatLogs") }}
            </h3>
            <div class="space-y-4">
              <div
                v-for="chat in selectedOrderDetails.chats"
                :key="chat.id"
                class="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div class="border-b border-border bg-muted/40 px-4 py-2">
                  <p class="text-sm font-semibold">
                    {{ chat.channel }} {{ $t("orders.details.channel") }}
                  </p>
                </div>
                <div class="max-h-80 space-y-3 overflow-y-auto p-4">
                  <div
                    v-if="!chat.messages.length"
                    class="text-center text-xs text-muted-foreground"
                  >
                    {{ $t("orders.details.noMessages") }}
                  </div>
                  <div
                    v-for="msg in chat.messages"
                    :key="msg.id"
                    class="flex max-w-[85%] flex-col"
                    :class="
                      msg.senderId === selectedOrderDetails.customerId
                        ? 'ms-auto items-end'
                        : 'me-auto items-start'
                    "
                  >
                    <div
                      v-if="msg.deletedAt"
                      class="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs italic text-muted-foreground"
                    >
                      {{ $t("orders.details.messageDeleted") }}
                    </div>
                    <template v-else>
                      <div
                        v-if="msg.type === 'TEXT'"
                        class="px-3 py-2 text-sm"
                        :class="
                          msg.senderId === selectedOrderDetails.customerId
                            ? 'rounded-2xl rounded-ee-sm bg-primary text-primary-foreground'
                            : 'rounded-2xl rounded-es-sm bg-muted text-foreground'
                        "
                      >
                        {{ msg.content }}
                      </div>
                      <div
                        v-else-if="msg.type === 'IMAGE'"
                        class="max-w-xs overflow-hidden rounded-xl border border-border"
                      >
                        <img :src="msg.content" class="h-auto w-full" />
                      </div>
                      <div
                        v-else-if="msg.type === 'AUDIO'"
                        class="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm"
                      >
                        <Mic class="h-4 w-4 text-muted-foreground" />
                        <span
                          v-if="msg.metadata?.duration"
                          class="text-xs text-muted-foreground"
                        >
                          ({{ Math.round(msg.metadata.duration) }}s)
                        </span>
                        <audio :src="msg.content" controls class="ms-1 h-8 w-40"></audio>
                      </div>
                    </template>
                    <span class="mt-0.5 px-1 text-[10px] text-muted-foreground">
                      {{ formatDate(msg.timestamp)
                      }}<span v-if="msg.isEdited">
                        - ({{ $t("orders.details.edited") }})</span
                      >
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Modal } from "@/components";
import { Loader2, User, Scissors, Truck, Mic, Calendar } from "lucide-vue-next";
import { apiClient, type DisplayOrderDetailsDto } from "@/integration";
import { can } from "@/auth";
import { useLocalizedCityComposable } from "@/composables";

const { cityLabel } = useLocalizedCityComposable();

const isOpen = defineModel<boolean>();

const props = defineProps<{
  orderId: string | null;
}>();

const isLoadingDetails = ref(false);
const selectedOrderDetails = ref<DisplayOrderDetailsDto | null>(null);

const fetchOrderDetails = async () => {
  if (!can("orders.read")) return;
  if (!props.orderId) return;
  isLoadingDetails.value = true;
  selectedOrderDetails.value = null;
  try {
    const response = await apiClient.ordersControllerGetOrderById(props.orderId);
    selectedOrderDetails.value = response.data;
  } catch (error) {
    console.error("Failed to fetch order details", error);
  } finally {
    isLoadingDetails.value = false;
  }
};

watch(() => props.orderId, (newId) => {
  if (isOpen.value && newId) {
    fetchOrderDetails();
  }
});

watch(isOpen, (newVal) => {
  if (newVal && props.orderId) {
    fetchOrderDetails();
  }
});

const closeModal = () => {
  isOpen.value = false;
};

const statusClasses = (status: string) => {
  switch (status) {
    case "done":
      return "bg-green-500/15 text-green-600 dark:text-green-400";
    case "pending":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "inProgress":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "canceled":
      return "bg-red-500/15 text-red-600 dark:text-red-400";
    default:
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400";
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};
</script>
