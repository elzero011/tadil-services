import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import type { Component } from "vue";
import { authState, can } from "@/auth";

const pages: Array<[string, string | undefined, () => Promise<{ default: Component }>]> = [
  ["required-informations", "informations.read", () => import("@/views/informations/InformationsListingView.vue")],
  ["alterations", "alterations.read", () => import("@/views/alterations/AlterationsListingView.vue")],
  ["extras", "extras.read", () => import("@/views/extras/ExtrasListingView.vue")], ["models", "models.read", () => import("@/views/models/ModelsListingView.vue")],
  ["tailors", "tailors.read", () => import("@/views/users/TailorsListView.vue")], ["couriers", "couriers.read", () => import("@/views/users/CouriersListView.vue")],
  ["customers", "customers.read", () => import("@/views/users/CustomersListView.vue")], ["login-requests", "login_requests.read", () => import("@/views/users/LoginRequestsView.vue")],
  ["payout-requests", "payouts.read", () => import("@/views/users/PayoutRequestsView.vue")], ["orders", "orders.read", () => import("@/views/orders/OrdersManagementView.vue")],
  ["staff", "staff.read", () => import("@/views/staff/StaffManagementView.vue")], ["roles", "roles.read", () => import("@/views/staff/RolesManagementView.vue")],
  ["password", undefined, () => import("@/views/auth/ChangePasswordView.vue")],
];
const routes: RouteRecordRaw[] = [
  { path: "/login", component: () => import("@/views/auth/LoginView.vue"), meta: { guest: true } },
  { path: "/accept-invitation", component: () => import("@/views/auth/SetPasswordView.vue"), meta: { guest: true } },
  { path: "/forbidden", component: () => import("@/views/auth/ForbiddenView.vue") },
  { path: "/no-access", component: () => import("@/views/auth/NoAccessView.vue") },
  {
    path: "/", component: () => import("@/layout/Layout.vue"), redirect: () => pages.find(([, permission]) => !permission || can(permission))?.[0] ? `/${pages.find(([, permission]) => !permission || can(permission))?.[0]}` : "/no-access",
    children: [
      ...pages.map(([path, permission, component]) => ({ path, component, meta: permission ? { permission } : {} })),
    ],
  },
];
const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  if (to.meta.guest) { if (authState.user && to.path === "/login") return "/"; return true; }
  if (!authState.user) return { path: "/login", query: { returnUrl: to.fullPath } };
  if (to.meta.permission && !can(to.meta.permission as string)) return "/forbidden";
  return true;
});
export default router;
