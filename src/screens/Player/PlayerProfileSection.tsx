import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "../../services/mmkv";
import { showMessage } from "react-native-flash-message";
import MyProfileTab from "./components/MyProfileTab";
import AiStatisticsTab from "./components/AiStatisticsTab";
import {
  useUserControllerGetProfile,
  useUserControllerUpdateProfile,
  useAuthControllerLogout,
} from "../../Api/playVerseComponents";

interface PlayerProfileSectionProps {
  onSignOut: () => void;
}

const PlayerProfileSection: React.FC<PlayerProfileSectionProps> = ({ onSignOut }) => {
  const [activeTab, setActiveTab] = useState<"profile" | "stats">("profile");
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Profile Data
  const {
    data: profileData,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useUserControllerGetProfile<any>({}, { retry: false });

  // Logout Mutation
  const { mutate: logout, isPending: isLoggingOut } = useAuthControllerLogout({
    onSuccess: () => {
      onSignOut();
    },
    onError: (err) => {
      console.log("Logout API failed:", err);
      onSignOut();
    }
  });

  // Update Profile Mutation
  const { mutate: updateProfile, isPending: isSaving } = useUserControllerUpdateProfile({
    onSuccess: (data: any) => {
      // Sync cache in storage
      try {
        const storedProfile = storage.getString("userProfile");
        if (storedProfile) {
          const currentProfileObj = JSON.parse(storedProfile);
          const updatedProfileData = data?.data || data?.result || data || {};
          const newProfileObj = {
            ...currentProfileObj,
            ...updatedProfileData,
          };
          storage.set("userProfile", JSON.stringify(newProfileObj));
        }
      } catch (e) {
        console.log("Failed to sync cache:", e);
      }

      showMessage({
        message: "Profile Saved",
        description: "Your profile was updated successfully.",
        type: "success",
      });

      refetchProfile();
    },
    onError: (error: any) => {
      console.log("Update profile error:", JSON.stringify(error, null, 2));
      let errMsg = "Could not save profile changes.";
      const payload = (error as any)?.payload || (error as any)?.response;
      if (Array.isArray(payload?.message)) {
        errMsg = payload.message.join(", ");
      } else if (typeof payload?.message === "string") {
        errMsg = payload.message;
      } else if (typeof (error as any)?.message === "string") {
        errMsg = (error as any).message;
      }
      showMessage({
        message: "Save Failed",
        description: errMsg,
        type: "danger",
      });
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProfile();
    setRefreshing(false);
  }, [refetchProfile]);

  const profile = profileData?.data || profileData?.result || profileData;
  const playerId = profile?.playerProfile?.id || profile?.id || 0;

  const handleSaveProfile = (updatedFields: any) => {
    updateProfile({
      body: updatedFields,
    });
  };

  if (isProfileLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00D2FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Player Hub</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={() => setIsLogoutModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "profile" && styles.tabBtnActive]}
          onPress={() => setActiveTab("profile")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "profile" && styles.tabBtnTextActive]}>
            My Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "stats" && styles.tabBtnActive]}
          onPress={() => setActiveTab("stats")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "stats" && styles.tabBtnTextActive]}>
            AI Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content wrapper with scroll view for pull to refresh */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00D2FF"
            colors={["#00D2FF"]}
          />
        }
      >
        {activeTab === "profile" ? (
          <MyProfileTab profile={profile} onSave={handleSaveProfile} isSaving={isSaving} />
        ) : (
          <AiStatisticsTab playerId={playerId} />
        )}
      </ScrollView>

      {/* Custom Logout Alert Modal */}
      <Modal
        visible={isLogoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconBg}>
              <Ionicons name="log-out-outline" size={26} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setIsLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={() => {
                  setIsLogoutModalVisible(false);
                  logout({});
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoggingOut && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#00D2FF" />
          <Text style={styles.loaderText}>Logging out...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PlayerProfileSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#080612",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  signOutBtn: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "rgba(0, 210, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.3)",
  },
  tabBtnText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#00D2FF",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#110E1F",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  modalBtnCancelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 6, 18, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loaderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
  },
});
