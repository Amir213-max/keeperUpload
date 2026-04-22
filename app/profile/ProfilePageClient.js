"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_ORDERS, GET_PROFILE } from "../lib/queries";
import { UPDATE_PROFILE_MUTATION, CHANGE_PASSWORD_MUTATION } from "../lib/mutations";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "../Componants/Loader";
import PriceDisplay from "../components/PriceDisplay";
import { useCurrency } from "../contexts/CurrencyContext";
import { useTranslation } from "../contexts/TranslationContext";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import DynamicText from "../components/DynamicText";
import { FaSignOutAlt } from "react-icons/fa";
import { User, Lock, ShoppingCart, Package, Save, Loader2 } from "lucide-react";

const VALID_TABS = ["account", "orders", "cart", "security"];

function mapLegacyTab(tab) {
  if (!tab) return null;
  if (VALID_TABS.includes(tab)) return tab;
  if (tab === "profile") return "account";
  if (tab === "password") return "security";
  return null;
}

/** قيمة مناسبة لـ `<input type="date">` (yyyy-mm-dd) */
function toDateInputValue(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function profileFormFromSources(profile, fallbackUser) {
  if (profile) {
    return {
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      date_of_birth: toDateInputValue(profile.date_of_birth),
      gender: profile.gender || "",
      avatar: profile.avatar || "",
    };
  }
  if (fallbackUser) {
    return {
      name: fallbackUser.name || "",
      email: fallbackUser.email || "",
      phone: fallbackUser.phone || "",
      date_of_birth: toDateInputValue(fallbackUser.date_of_birth),
      gender: fallbackUser.gender || "",
      avatar: fallbackUser.avatar || "",
    };
  }
  return {
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    avatar: "",
  };
}

export default function ProfilePageClient() {
  const { user, token, logout, updateUser } = useAuth();
  const { cart } = useCart();
  const { loading: currencyLoading } = useCurrency();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    avatar: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const [activeTab, setActiveTab] = useState("account");

  const isRTL = lang === "ar";

  const tabFromUrl = useMemo(() => {
    const raw = searchParams.get("tab");
    return mapLegacyTab(raw);
  }, [searchParams]);

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const setTab = useCallback(
    (tab) => {
      if (!VALID_TABS.includes(tab)) return;
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/profile?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleLogout = () => {
    if (logout) logout();
  };

  const fetchProfile = useCallback(async () => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      storedUser = null;
    }
    const fallbackUser = user || storedUser;

    if (!storedToken && !token) {
      setProfileLoading(false);
      if (fallbackUser) {
        setProfileForm((prev) => {
          const next = profileFormFromSources(null, fallbackUser);
          if (prev.name || prev.email) return prev;
          return next;
        });
      }
      return;
    }
    try {
      setProfileLoading(true);
      const { profile } = await graphqlRequest(GET_PROFILE, {
        token: storedToken || token,
      });
      setProfileForm(profileFormFromSources(profile, fallbackUser));
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error(
        error?.message || t("Failed to load profile") || "Failed to load profile"
      );
      if (fallbackUser) {
        setProfileForm(profileFormFromSources(null, fallbackUser));
      }
    } finally {
      setProfileLoading(false);
    }
  }, [token, t, user]);

  useEffect(() => {
    const checkAuth = () => {
      const storedToken =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const storedUser =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "null")
          : null;

      if (storedToken || token || storedUser || user) {
        setAuthChecked(true);
        if (storedToken || token) {
          fetchOrders();
          fetchProfile();
        } else {
          setOrdersLoading(false);
          setProfileLoading(false);
        }
      } else {
        router.push("/");
      }
    };

    checkAuth();
  }, [token, user, router, fetchProfile]);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const dataPromise = graphqlRequest(GET_ORDERS);
      const data = await Promise.race([dataPromise, timeoutPromise]);

      setOrders(data?.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (error.message !== "Request timeout") {
        toast.error(t("Failed to fetch orders") || "فشل في جلب الطلبات");
      }
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const toggleOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t("Not available");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case "paid":
        return t("Paid");
      case "pending":
        return t("Pending");
      default:
        return t("Unpaid");
    }
  };

  const validateAccountForm = () => {
    const name = profileForm.name?.trim();
    if (!name) {
      toast.error(t("Name is required") || "Name is required");
      return false;
    }
    const email = profileForm.email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("Invalid email") || "Invalid email");
      return false;
    }
    const phone = profileForm.phone?.trim();
    if (phone && phone.length < 6) {
      toast.error(t("Invalid phone number") || "Invalid phone number");
      return false;
    }
    const avatar = profileForm.avatar?.trim();
    if (avatar) {
      try {
        new URL(avatar);
      } catch {
        toast.error(t("Invalid avatar URL") || "Invalid avatar URL");
        return false;
      }
    }
    return true;
  };

  const handleProfileSave = async () => {
    if (!validateAccountForm()) return;
    setSavingProfile(true);
    try {
      const input = { name: profileForm.name.trim() };
      const phone = profileForm.phone?.trim();
      if (phone) input.phone = phone;
      const dob = profileForm.date_of_birth?.trim();
      if (dob) input.date_of_birth = dob;
      const gender = profileForm.gender?.trim();
      if (gender) input.gender = gender;
      const avatar = profileForm.avatar?.trim();
      if (avatar) input.avatar = avatar;

      const data = await graphqlRequest(UPDATE_PROFILE_MUTATION, { input });
      const payload = data?.updateProfile;
      const updated = payload?.user;
      const message = payload?.message;

      if (!payload || !updated) {
        toast.error(message || t("Failed to update profile") || "Failed to update profile");
        return;
      }

      setProfileForm(profileFormFromSources(updated, null));
      if (updateUser) {
        updateUser({
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          date_of_birth: updated.date_of_birth,
          gender: updated.gender,
          avatar: updated.avatar,
        });
      }

      toast.success(message || t("Profile updated successfully") || "Profile updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error.message || t("Failed to update profile") || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error(
        t("New password and confirm password do not match") ||
          "New password and confirm password do not match!"
      );
      return;
    }
    if (passwords.new.length < 8) {
      toast.error(t("Password must be at least 8 characters long") || "Password must be at least 8 characters long!");
      return;
    }
    if (!passwords.current) {
      toast.error(t("Current password is required") || "Current password is required");
      return;
    }

    setSavingPassword(true);
    try {
      const data = await graphqlRequest(CHANGE_PASSWORD_MUTATION, {
        input: {
          current_password: passwords.current,
          password: passwords.new,
          password_confirmation: passwords.confirm,
        },
      });
      const result = data?.changePassword;
      if (result?.success === false) {
        toast.error(result?.message || t("Failed to change password") || "Failed to change password");
        return;
      }
      toast.success(result?.message || t("Password changed successfully") || "Password changed successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      console.error(error);
      toast.error(error.message || t("Failed to change password") || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const hasStoredToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");
  const hasAuth = Boolean(token || user || hasStoredToken);

  if (!authChecked) {
    return <Loader />;
  }
  if (!hasAuth) {
    return <Loader />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-4 md:py-8 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t("Profile")}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("Manage your account, orders, and cart") || "Manage your account, orders, and cart"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm md:text-base font-medium"
              aria-label={t("Logout") || "تسجيل الخروج"}
            >
              <FaSignOutAlt size={16} />
              <span>{t("Logout") || "Logout"}</span>
            </button>
          </div>

          {/* Quick summary (from context — instant) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t("Name")}</label>
              <p className="text-base md:text-lg text-gray-900 font-medium">
                {user?.name || profileForm.name || t("Not available")}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t("Email")}</label>
              <p className="text-base md:text-lg text-gray-900 font-medium break-all">
                {user?.email || profileForm.email || t("Not available")}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 md:mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: "account", label: t("Account Info") || "Account Info", Icon: User },
              { id: "orders", label: t("Orders"), Icon: Package },
              { id: "cart", label: t("Cart"), Icon: ShoppingCart },
              { id: "security", label: t("Security") || "Security", Icon: Lock },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === id
                    ? "border-black text-gray-900 bg-gray-50"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        {activeTab === "account" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-8 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 md:w-6 md:h-6" />
              {t("Account Info") || "Account Info"}
            </h2>

            {profileLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Name")}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Email")}</label>
                  <input
                    type="email"
                    className="w-full border border-gray-200 bg-gray-50 text-black cursor-not-allowed rounded-lg px-4 py-3"
                    value={profileForm.email}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("Email cannot be changed") || "Email cannot be changed"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("Phone Number") || "Phone Number"}
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder={t("Phone Number") || ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("Date of birth") || "Date of birth"}
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black [color-scheme:light] focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                    value={profileForm.date_of_birth || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Gender") || "Gender"}</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all bg-white"
                    value={profileForm.gender || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  >
                    <option value="">{t("Prefer not to say") || "Prefer not to say"}</option>
                    <option value="male">{t("Male") || "Male"}</option>
                    <option value="female">{t("Female") || "Female"}</option>
                    <option value="other">{t("Other") || "Other"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("Avatar URL") || "Avatar URL"}
                  </label>
                  <input
                    type="url"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                    value={profileForm.avatar}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                    placeholder="https://"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 bg-black text-white font-semibold px-6 md:px-8 py-3 rounded-lg hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t("Saving...") || "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t("Save Changes") || "Save Changes"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Orders */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">{t("Orders")}</h2>

            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <p className="text-gray-500 text-base md:text-lg">{t("No orders yet")}</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    <div
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleOrder(order.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleOrder(order.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900">
                            {t("Order")} #{order.number || order.id}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs md:text-sm font-medium ${
                              order.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : order.payment_status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getPaymentStatusText(order.payment_status)}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-500 mb-2">{formatDate(order.created_at)}</p>
                        <p className="text-lg md:text-xl font-bold text-gray-900">
                          <PriceDisplay price={order.total_amount} loading={currencyLoading} />
                        </p>
                      </div>
                      <span
                        className={`text-gray-600 hover:text-gray-900 transition-colors ml-2 flex-shrink-0 ${
                          isRTL ? "rotate-90" : ""
                        }`}
                        aria-hidden
                      >
                        {expandedOrder === order.id ? "▼" : "▶"}
                      </span>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs md:text-sm text-gray-600 mb-1">{t("Subtotal")}</p>
                            <p className="text-base md:text-lg font-semibold text-gray-900">
                              <PriceDisplay price={order.subtotal} loading={currencyLoading} />
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs md:text-sm text-gray-600 mb-1">{t("VAT")}</p>
                            <p className="text-base md:text-lg font-semibold text-gray-900">
                              <PriceDisplay price={order.vat_amount} loading={currencyLoading} />
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs md:text-sm text-gray-600 mb-1">{t("Shipping Cost")}</p>
                            <p className="text-base md:text-lg font-semibold text-gray-900">
                              <PriceDisplay price={order.shipping_cost} loading={currencyLoading} />
                            </p>
                          </div>
                        </div>

                        <h4 className="font-semibold text-gray-900 mb-3 text-base md:text-lg">
                          {t("Products")}:
                        </h4>
                        <div className="space-y-2 md:space-y-3">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 md:gap-4 p-3 bg-white rounded-lg border border-gray-100"
                            >
                              {item.product?.images?.[0] && (
                                <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                                  <Image
                                    src={item.product.images[0]}
                                    alt={item.product_name || "Product"}
                                    fill
                                    className="object-cover rounded"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm md:text-base truncate">
                                  <DynamicText>
                                    {item.product_name || item.product?.name || t("Products")}
                                  </DynamicText>
                                </p>
                                <p className="text-xs md:text-sm text-gray-500 mt-1">
                                  {t("Quantity")}: {item.quantity} ×{" "}
                                  <PriceDisplay price={item.unit_price} loading={currencyLoading} />
                                </p>
                              </div>
                              <div className={`text-right flex-shrink-0 ${isRTL ? "text-left" : ""}`}>
                                <p className="font-semibold text-gray-900 text-sm md:text-base">
                                  <PriceDisplay price={item.total_price} loading={currencyLoading} />
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {order.tracking_urls && order.tracking_urls.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">{t("Tracking Links")}:</p>
                            <div className="space-y-1">
                              {order.tracking_urls.map((url, index) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs md:text-sm block break-all"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cart */}
        {activeTab === "cart" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">{t("Cart")}</h2>

            {!cart || !cart.lineItems || cart.lineItems.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <p className="text-gray-500 mb-4 text-base md:text-lg">{t("Cart is empty")}</p>
                <Link
                  href="/"
                  className="inline-block bg-black text-white px-6 py-2.5 md:py-3 rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base font-medium"
                >
                  {t("Browse Products")}
                </Link>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {cart.lineItems.map((item) => {
                  const basePrice = item.product?.list_price_amount || 0;
                  const price =
                    item.product?.productBadges?.length > 0
                      ? basePrice -
                        (basePrice *
                          Math.abs(parseFloat(item.product.productBadges[0].label.replace("%", ""))) /
                          100)
                      : basePrice;
                  const itemTotal = price * (item.quantity || 1);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 md:gap-4 p-3 md:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {item.product?.images?.[0] && (
                        <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                          <Image
                            src={item.product.images[0]}
                            alt={item.product?.name || "Product"}
                            fill
                            className="object-cover rounded"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1">
                          <DynamicText>{item.product?.name || t("Products")}</DynamicText>
                        </h3>
                        {item.product?.brand_name && (
                          <p className="text-xs md:text-sm text-gray-500 mb-1">
                            <DynamicText>{item.product.brand_name}</DynamicText>
                          </p>
                        )}
                        <p className="text-xs md:text-sm text-gray-600">
                          {t("Quantity")}: {item.quantity}
                        </p>
                      </div>
                      <div className={`text-right flex-shrink-0 ${isRTL ? "text-left" : ""}`}>
                        <p className="font-bold text-gray-900 text-sm md:text-base">
                          <PriceDisplay price={itemTotal} loading={currencyLoading} />
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-base md:text-lg font-semibold text-gray-800">{t("Total")}:</span>
                    <span className="text-lg md:text-xl font-bold text-gray-900">
                      <PriceDisplay
                        price={
                          cart.grand_total ||
                          cart.item_total ||
                          cart.lineItems?.reduce((sum, item) => {
                            const basePrice = item.product?.list_price_amount || 0;
                            const price =
                              item.product?.productBadges?.length > 0
                                ? basePrice -
                                  (basePrice *
                                    Math.abs(
                                      parseFloat(item.product.productBadges[0].label.replace("%", ""))
                                    ) /
                                    100)
                                : basePrice;
                            return sum + price * (item.quantity || 1);
                          }, 0) ||
                          0
                        }
                        loading={currencyLoading}
                      />
                    </span>
                  </div>
                  <Link
                    href="/shipping-details"
                    className="block bg-black text-white text-center px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base font-medium"
                  >
                    {t("Complete Order")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security */}
        {activeTab === "security" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-8 max-w-2xl mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 md:w-6 md:h-6" />
              {t("Change Password")}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Current Password")}
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder={t("Enter your current password") || ""}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("New Password")}</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder={t("Enter your new password (min. 8 characters)") || ""}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Confirm New Password")}
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder={t("Confirm your new password") || ""}
                />
              </div>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={savingPassword}
                className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-6 md:px-8 py-3 rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("Changing...") || "Changing..."}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    {t("Change Password")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
