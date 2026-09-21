<template>
  <Modal v-model="isOpen" @close-modal="closeModal">
    <div class="space-y-4">
      <h1 class="text-xl font-bold">{{ $t("orders.assignModal.title") }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ $t("orders.assignModal.subtitle", { ref: selectedOrder?.reference }) }}
      </p>
      
      <div class="space-y-1.5">
        <InputLabel>{{ $t("orders.assignModal.selectLabel") }}</InputLabel>
        <SelectMenu
          v-model="tailorToAssign"
          :options="availableTailors"
          placeholder="orders.assignModal.selectPlaceholder"
        />
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <Button variant="outline" @click="closeModal">{{ $t("common.buttons.cancel") }}</Button>
        <Button @click="handleAssign" :disabled="!tailorToAssign || isProcessing">
          <Loader2 v-if="isProcessing" class="h-4 w-4 animate-spin me-2" />
          {{ $t("orders.assignModal.submit") }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Modal, Button, InputLabel, SelectMenu } from "@/components";
import { Loader2 } from "lucide-vue-next";
import { apiClient, type DisplayOrderDTO } from "@/integration";
import { can } from "@/auth";

const isOpen = defineModel<boolean>();

const props = defineProps<{
  selectedOrder: DisplayOrderDTO | null;
  availableTailors: { key: string; label: string }[];
}>();

const emit = defineEmits<{
  (e: "assigned"): void;
}>();

const tailorToAssign = ref("");
const isProcessing = ref(false);

const closeModal = () => {
  isOpen.value = false;
  tailorToAssign.value = "";
};

const handleAssign = async () => {
  if (!can("orders.assign_tailor") || !can("tailors.read")) return;
  if (!props.selectedOrder || !tailorToAssign.value) return;
  isProcessing.value = true;
  try {
    await apiClient.ordersControllerAssignTailor(props.selectedOrder.id, tailorToAssign.value);
    emit("assigned");
    closeModal();
  } catch (error) {
    console.error("Failed to assign tailor", error);
  } finally {
    isProcessing.value = false;
  }
};
</script>
