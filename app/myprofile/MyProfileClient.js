"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { graphqlClient } from "../lib/graphqlClient";
import { GET_PROFILE } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { LogOut, User, Lock, Save, Loader2 } from "lucide-react";
import { useTranslation } from "../contexts/TranslationContext";
import Loader from "../Componants/Loader";

export default function MyProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    // Check for tab parameter in URL
    const tabParam = searchParams.get("tab");
    if (tabParam && ["profile", "password"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    fetchUserData();
  }, [searchParams]);

  // 🟡 Fetch Logged-in User Data using profile
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first!");
        router.push("/login");
        return;
      }

      // Pass token as variable to the query
      const { profile } = await graphqlClient.request(GET_PROFILE, {
        token: token,
      });
      setUser(profile);
    } catch (error) {
      console.error("Error fetching user:", error);
      toast.error("Failed to load user data.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Update Profile
  const handleProfileSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement actual profile update mutation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // 🟡 Change Password
  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("New password and confirm password do not match!");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters long!");
      return;
    }
    
    setSaving(true);
    try {
      // TODO: Implement actual password change mutation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Password changed successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      toast.error("Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  // 🟢 Handle Logout
  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
  };

  // 🟢 Loading State
  const isRTL = lang === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  if (loading) return <Loader />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-white mb-4">Please login to view your profile.</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // 🟣 Render
  return (
    <div className={`min-h-screen bg-black text-white py-8 px-4 ${direction}`} dir={direction}>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-[#1f2323] rounded-xl shadow-lg p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">
                {t('My Profile') || 'My Profile'}
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                {t('Manage your account settings and preferences') || 'Manage your account settings and preferences'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1f2323] rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-700 overflow-x-auto">
            <button
              className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === "profile"
                  ? "border-b-2 border-yellow-400 text-yellow-400 bg-[#373e3e]"
                  : "text-gray-400 hover:text-white hover:bg-[#373e3e]"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <User className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">{t('Profile Info') || 'Profile Info'}</span>
            </button>
            <button
              className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === "password"
                  ? "border-b-2 border-yellow-400 text-yellow-400 bg-[#373e3e]"
                  : "text-gray-400 hover:text-white hover:bg-[#373e3e]"
              }`}
              onClick={() => setActiveTab("password")}
            >
              <Lock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">{t('Change Password') || 'Change Password'}</span>
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-[#1f2323] rounded-xl shadow-lg p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 md:w-6 md:h-6" />
              {t('Edit Profile') || 'Edit Profile'}
            </h2>
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {t('Full Name') || 'Full Name'}
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-600 bg-[#373e3e] text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                  value={user.name || ""}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {t('Email Address') || 'Email Address'}
                </label>
                <input
                  type="email"
                  className="w-full border-2 border-gray-600 bg-[#373e3e] text-gray-400 cursor-not-allowed rounded-lg px-4 py-3"
                  value={user.email || ""}
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">{t('Email cannot be changed') || 'Email cannot be changed'}</p>
              </div>
              {user.phone && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {t('Phone Number') || 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    className="w-full border-2 border-gray-600 bg-[#373e3e] text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                    value={user.phone || ""}
                    onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  />
                </div>
              )}
              <button
                onClick={handleProfileSave}
                disabled={saving}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 md:px-8 py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('Saving...') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {t('Save Changes') || 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div className="bg-[#1f2323] rounded-xl shadow-lg p-4 md:p-8 max-w-2xl">
            <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 md:w-6 md:h-6" />
              {t('Change Password') || 'Change Password'}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {t('Current Password') || 'Current Password'}
                </label>
                <input
                  type="password"
                  className="w-full border-2 border-gray-600 bg-[#373e3e] text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder={t('Enter your current password') || 'Enter your current password'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {t('New Password') || 'New Password'}
                </label>
                <input
                  type="password"
                  className="w-full border-2 border-gray-600 bg-[#373e3e] text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder={t('Enter your new password (min. 8 characters)') || 'Enter your new password (min. 8 characters)'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {t('Confirm New Password') || 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  className="w-full border-2 border-gray-600 bg-[#373e3e] text-white rounded-lg px-4 py-3 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder={t('Confirm your new password') || 'Confirm your new password'}
                />
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 md:px-8 py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('Changing...') || 'Changing...'}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    {t('Change Password') || 'Change Password'}
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

