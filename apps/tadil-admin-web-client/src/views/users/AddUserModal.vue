<template>
  <Button v-if="can(selectedUserType === ROLE.TAILOR ? 'tailors.create' : 'couriers.create')" @click="isOpen = true">
    {{ $t(`users.addNewUserModal.title`) }}
  </Button>
  <Modal
    v-model="isOpen"
    @close-modal="closeModal"
    class="w-[480px] max-w-[95vw]"
  >
    <div class="space-y-5">
      <div class="flex items-center gap-3 border-b border-border pb-4 pe-8">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <component :is="headerIcon" class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h1 class="text-lg font-bold leading-tight">
            {{ $t(`users.addNewUserModal.title`) }}
          </h1>
          <p class="truncate text-sm text-muted-foreground">
            {{ $t("users.address.requiredHint") }}
          </p>
        </div>
      </div>
      <div class="space-y-4">
        <div class="space-y-1.5">
          <InputLabel for="phone">
            {{ $t("common.inputs.phone.label") }}
          </InputLabel>
          <TextInput
            id="phone"
            type="tel"
            inputmode="tel"
            pattern="[0-9]*"
            :maxlength="10"
            v-model="newUser.phone"
            :placeholder="$t('common.inputs.phone.placeholder')"
            :validationErrorMessage="$t(newUserValidationErrors.phone)"
            @update:model-value="validateUserPhone"
          />
        </div>
        <div class="space-y-1.5">
          <InputLabel for="firstName">
            {{ $t("common.inputs.firstName.label") }}
          </InputLabel>
          <TextInput
            id="firstName"
            v-model="newUser.firstName"
            :placeholder="$t('common.inputs.firstName.placeholder')"
            :validationErrorMessage="$t(newUserValidationErrors.firstName)"
            @update:model-value="validateUserFirstName"
          />
        </div>
        <div class="space-y-1.5">
          <InputLabel for="lastName">
            {{ $t("common.inputs.lastName.label") }}
          </InputLabel>
          <TextInput
            id="lastName"
            v-model="newUser.lastName"
            :placeholder="$t('common.inputs.lastName.placeholder')"
            :validationErrorMessage="$t(newUserValidationErrors.lastName)"
            @update:model-value="validateUserLastName"
          />
        </div>
        <div class="space-y-1.5">
          <InputLabel for="email">
            {{ $t("common.inputs.email.label") }}
          </InputLabel>
          <TextInput
            id="email"
            type="email"
            v-model="newUser.email"
            :placeholder="$t('common.inputs.email.placeholder')"
          />
        </div>
        <AddressFields
          v-if="selectedUserType !== ROLE.CUSTOMER"
          v-model="address"
          :show-validation="showAddressValidation"
          @valid-change="(v) => (addressValid = v)"
        />
        <div class="space-y-1.5" v-if="selectedUserType !== ROLE.CUSTOMER">
          <InputLabel for="commissionRate">
            {{ $t("common.inputs.commissionRate.label") }}
          </InputLabel>
          <TextInput
            id="commissionRate"
            type="number"
            v-model="newUser.commissionRate"
            :placeholder="$t('common.inputs.commissionRate.placeholder')"
          />
        </div>
      </div>
      <div class="mt-2 flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="outline" @click="closeModal">
          {{ $t("common.buttons.cancel") }}
        </Button>
        <Button @click="createUser">
          {{ $t("common.buttons.add") }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import {
  Modal,
  useToast,
  TextInput,
  InputLabel,
} from "@/components";
import Button from "@/components/ui/Button.vue";
import {
  apiClient,
  ROLE,
  type CreateUserDTO,
  type RoleType,
} from "@/integration";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Scissors, Truck, UserPlus } from "lucide-vue-next";
import AddressFields from "./components/AddressFields.vue";
import type { AddressFormValue } from "./components/address.types";
import { can } from "@/auth";

const { t } = useI18n();
const { openToast } = useToast();

const props = defineProps<{
  selectedUserType: RoleType;
}>();

const headerIcon = computed(() => {
  switch (props.selectedUserType) {
    case ROLE.TAILOR:
      return Scissors;
    case ROLE.COURIER:
      return Truck;
    default:
      return UserPlus;
  }
});

const emit = defineEmits<{
  (e: "created:user"): void;
}>();

const isOpen = ref<boolean>(false);
const newUser = ref<CreateUserDTO>({
  phone: "",
  firstName: "",
  lastName: "",
  email: undefined,
  commissionRate: 10,
});
const address = ref<AddressFormValue>({});
const addressValid = ref(false);
const showAddressValidation = ref(false);
const newUserValidationErrors = ref({
  phone: "",
  firstName: "",
  lastName: "",
});

function validateUserPhone() {
  if (!newUser.value.phone) {
    newUserValidationErrors.value.phone = t(
      "common.inputs.phone.undefinedErrorMessage",
    );
    return false;
  }
  if (newUser.value.phone.length < 10) {
    newUserValidationErrors.value.phone = t(
      "common.inputs.phone.lengthErrorMessage",
    );
    return false;
  }
  if (isNaN(Number(newUser.value.phone))) {
    newUserValidationErrors.value.phone = t(
      "common.inputs.phone.numericErrorMessage",
    );
    return false;
  }
  newUserValidationErrors.value.phone = "";
  return true;
}
function validateUserFirstName() {
  if (!newUser.value.firstName) {
    newUserValidationErrors.value.firstName = t(
      "common.inputs.firstName.errorMessage",
    );
    return false;
  }
  newUserValidationErrors.value.firstName = "";
  return true;
}
function validateUserLastName() {
  if (!newUser.value.lastName) {
    newUserValidationErrors.value.lastName = t(
      "common.inputs.lastName.errorMessage",
    );
    return false;
  }
  if (newUser.value.lastName.length < 2) {
    newUserValidationErrors.value.lastName = t(
      "common.inputs.lastName.errorMessage",
    );
    return false;
  }
  newUserValidationErrors.value.lastName = "";
  return true;
}

async function createUser() {
  if (!can(props.selectedUserType === ROLE.TAILOR ? "tailors.create" : "couriers.create")) return;
  try {
    if (
      validateUserPhone() &&
      validateUserFirstName() &&
      validateUserLastName()
    ) {
      // Tailors and couriers must have a city and a pinned location.
      if (!addressValid.value) {
        showAddressValidation.value = true;
        return;
      }
      const payload: CreateUserDTO = { ...newUser.value, ...address.value };
      switch (props.selectedUserType) {
        case ROLE.TAILOR: {
          await apiClient.tailorsControllerCreateTailor(payload);
          break;
        }
        case ROLE.COURIER: {
          await apiClient.couriersControllerCreateCourier(payload);
          break;
        }
      }
      openToast(t(`users.addNewUserModal.success`));
      emit("created:user");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t(`users.addNewUserModal.error`),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive",
    );
  }
}

function closeModal() {
  newUser.value = {
    phone: "",
    firstName: "",
    lastName: "",
    email: undefined,
    commissionRate: 10,
  };
  address.value = {};
  addressValid.value = false;
  showAddressValidation.value = false;
  isOpen.value = false;
}
</script>
