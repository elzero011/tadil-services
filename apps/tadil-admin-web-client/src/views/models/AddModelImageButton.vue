<template>
  <div>
    <label v-if="can('models.update')"
      for="modelImage"
      class="border border-border rounded-md flex justify-center items-center h-40 w-40 bg-muted/70 hover:bg-muted cursor-pointer"
    >
      <Plus />
    </label>
    <input
      id="modelImage"
      type="file"
      accept=".jpg,.jpeg,.png,.svg"
      class="hidden"
      multiple
      @change="handleFileInputChange"
    />
  </div>
</template>

<script setup lang="ts">
import { useToast } from "@/components";
import { apiClient } from "@/integration";
import { Plus } from "lucide-vue-next";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { can } from "@/auth";

const { t } = useI18n();
const { openToast } = useToast();

const props = defineProps<{
  modelId: string;
}>();

const emit = defineEmits<{
  (e: "updated:model-images"): void;
}>();

const selectedFiles = ref<File[]>([]);

async function handleFileInputChange(event: Event) {
  if (!can("models.update")) return;
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  selectedFiles.value = files;
  if (selectedFiles.value.length < 1) {
    openToast(t("models.addNewModelModal.error.noFileSelected"));
  }
  try {
    await apiClient.modelsControllerAddModelImage(props.modelId, {
      files: selectedFiles.value,
    });
    openToast(t("models.addNewModelModal.success"));
    emit("updated:model-images");
  } catch (error: any) {
    openToast(
      t("models.addNewModelModal.error"),
      error.response?.data?.message || undefined,
      undefined,
      "destructive"
    );
  }
}
</script>
