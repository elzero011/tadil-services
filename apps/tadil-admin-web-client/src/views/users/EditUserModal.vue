<template>
  <Button v-if="can(user.role === ROLE.TAILOR ? 'tailors.update' : 'couriers.update')" variant="outline" size="sm" @click="isOpen = true">
    <Edit />
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
            {{ $t(`users.editUserModal.title`) }}
          </h1>
          <p class="truncate text-sm text-muted-foreground">
            {{ newUser.firstName }} {{ newUser.lastName }}
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
        <Button @click="updateUser">
          {{ $t("common.buttons.save") }}
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
  type DisplayUserDTO,
  type RoleType,
  type UpdateUserDTO,
} from "@/integration";
import { Edit, Scissors, Truck, User } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AddressFields from "./components/AddressFields.vue";
import type { AddressFormValue } from "./components/address.types";
import { can } from "@/auth";

function addressFromUser(user: DisplayUserDTO): AddressFormValue {
  return {
    cityId: user.cityId,
    cityNameAr: user.cityNameAr,
    cityNameEn: user.cityNameEn,
    cityNameBn: user.cityNameBn,
    cityNameHi: user.cityNameHi,
    cityNameUr: user.cityNameUr,
    districtId: user.districtId,
    districtNameAr: user.districtNameAr,
    districtNameEn: user.districtNameEn,
    districtNameBn: user.districtNameBn,
    districtNameHi: user.districtNameHi,
    districtNameUr: user.districtNameUr,
    street: user.street,
    streetAr: user.streetAr,
    streetEn: user.streetEn,
    streetBn: user.streetBn,
    streetHi: user.streetHi,
    streetUr: user.streetUr,
    latitude: user.latitude,
    longitude: user.longitude,
  };
}

const { t } = useI18n();
const { openToast } = useToast();

const props = defineProps<{
  user: DisplayUserDTO;
  selectedUserType: RoleType;
}>();

const emit = defineEmits<{
  (e: "updated:user"): void;
}>();

const headerIcon = computed(() => {
  switch (props.selectedUserType) {
    case ROLE.TAILOR:
      return Scissors;
    case ROLE.COURIER:
      return Truck;
    default:
      return User;
  }
});

const isOpen = ref<boolean>(false);
const newUser = ref<UpdateUserDTO>({
  phone: props.user.phone,
  firstName: props.user.firstName,
  lastName: props.user.lastName,
  email: props.user.email,
  commissionRate: props.user.commissionRate ?? 10,
});
const address = ref<AddressFormValue>(addressFromUser(props.user));
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

async function updateUser() {
  if (!can(props.user.role === ROLE.TAILOR ? "tailors.update" : "couriers.update")) return;
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
      const payload: UpdateUserDTO = { ...newUser.value, ...address.value };
      switch (props.selectedUserType) {
        case ROLE.TAILOR: {
          await apiClient.tailorsControllerUpdateTailor(
            props.user.id,
            payload,
          );
          break;
        }
        case ROLE.COURIER: {
          await apiClient.couriersControllerUpdateCourier(
            props.user.id,
            payload,
          );
          break;
        }
      }
      openToast(t(`users.editUserModal.success`));
      emit("updated:user");
      closeModal();
      return;
    }
  } catch (error: any) {
    openToast(
      t(`users.editUserModal.error`),
      error?.response?.data?.message || undefined,
      undefined,
      "destructive",
    );
  }
}

function closeModal() {
  newUser.value = {
    phone: props.user.phone,
    firstName: props.user.firstName,
    lastName: props.user.lastName,
    email: props.user.email,
    commissionRate: props.user.commissionRate ?? 10,
  };
  address.value = addressFromUser(props.user);
  addressValid.value = false;
  showAddressValidation.value = false;
  isOpen.value = false;
}
</script>
