import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import CImage from "../../../Components/atoms/CImage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { showMessage } from "react-native-flash-message";
import CTextInput from "../../../Components/atoms/CTextInput";
import SizedBox from "../../../Components/atoms/SizeBox";
import CButton from "../../../Components/atoms/CButton";
import { ProfileImageDto } from "../../../Api/playVerseSchemas";
import { useUploadControllerUploadFile } from "../../../Api/playVerseComponents";
import { env, getURL } from "../../../services/request";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper to parse dynamic/relative image URLs
const getProfileImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  const baseUrl = getURL(env).replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const SPORTS_OPTIONS = [
  { id: "1", name: "Cricket", icon: "🏏" },
  { id: "2", name: "Football", icon: "⚽" },
  { id: "5", name: "Pickleball", icon: "🏓" },
  { id: "6", name: "Badminton", icon: "🏸" },
];

const GENDER_OPTIONS: Array<"MALE" | "FEMALE" | "OTHER"> = ["MALE", "FEMALE", "OTHER"];
const HAND_OPTIONS: Array<"LEFT" | "RIGHT"> = ["LEFT", "RIGHT"];

interface MyProfileTabProps {
  profile: any;
  onSave: (updatedData: any) => void;
  isSaving: boolean;
}

const MyProfileTab: React.FC<MyProfileTabProps> = ({ profile, onSave, isSaving }) => {
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [dominantHand, setDominantHand] = useState<"LEFT" | "RIGHT" | "">("");
  const [preferredLang, setPreferredLang] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // Avatar states
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<ProfileImageDto | null>(null);

  // Sync profile data on mount or changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setMobileNumber(profile.mobile_number || profile.mobileNumber || "");
      setBio(profile.bio || profile.playerProfile?.bio || "");
      setCity(profile.city || profile.playerProfile?.city || "");
      setDob(profile.dob || profile.playerProfile?.dob || "");
      setGender(profile.gender || profile.playerProfile?.gender || "");
      setDominantHand(profile.dominant_hand || profile.playerProfile?.dominant_hand || "");
      setPreferredLang(profile.preferred_language || profile.playerProfile?.preferred_language || "");

      // Handle sports list parsing (either array of string ids, numbers, or objects)
      const rawSports = profile.sports || profile.playerProfile?.sports || [];
      const parsedSports = rawSports.map((s: any) => {
        if (typeof s === "object") return String(s.id);
        return String(s);
      });
      setSelectedSports(parsedSports);

      if (profile.profile_image) {
        if (typeof profile.profile_image === "string") {
          setProfileImageUri(getProfileImageUrl(profile.profile_image));
          setUploadedImage({
            url: profile.profile_image,
            filename: profile.profile_image.split("/").pop() || "profile.jpg",
          });
        } else if (profile.profile_image.url) {
          setUploadedImage(profile.profile_image);
          setProfileImageUri(getProfileImageUrl(profile.profile_image.url));
        }
      } else {
        setProfileImageUri(null);
        setUploadedImage(null);
      }
    }
  }, [profile, isEditMode]);

  // Image Upload Hook
  const { mutate: uploadFile, isPending: isUploading } = useUploadControllerUploadFile({
    onSuccess: (data: any) => {
      const url = data?.result?.url || data?.url || data?.path;
      const filename = data?.result?.filename || data?.filename || "profile.jpg";
      if (url) {
        const payload = { filename, url };
        setUploadedImage(payload);
        setProfileImageUri(getProfileImageUrl(url));
        showMessage({
          message: "Photo Uploaded",
          description: "Your profile photo has been updated.",
          type: "success",
        });

        // Auto save photo even if in view mode
        if (!isEditMode) {
          onSave({ profile_image: payload });
        }
      }
    },
    onError: (error: any) => {
      console.log("Upload error:", error);
      showMessage({
        message: "Upload Failed",
        description: "Could not upload profile picture. Please try again.",
        type: "danger",
      });
    },
  });

  const processPickedImage = (localUri: string) => {
    setProfileImageUri(localUri);

    const formData = new FormData();
    formData.append("file", {
      uri: Platform.OS === "android" ? localUri : localUri.replace("file://", ""),
      name: "profile.jpg",
      type: "image/jpeg",
    } as any);

    uploadFile({
      body: formData as any,
    });
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description: "Camera permissions are required to take a picture.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPickedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Camera error:", e);
    }
  };

  const handleLaunchLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description: "Gallery permissions are required to choose a photo.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPickedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Library error:", e);
    }
  };

  const handlePickImage = () => {
    Alert.alert("Profile Photo", "Select photo source", [
      { text: "Take Photo", onPress: handleLaunchCamera },
      { text: "Choose from Gallery", onPress: handleLaunchLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const toggleSport = (sportId: string) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter((id) => id !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const handleSave = () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      showMessage({
        message: "Validation Error",
        description: "Display name cannot be empty.",
        type: "warning",
      });
      return;
    }

    const nameRegex = /^[A-Za-z\s'.]{3,50}$/;
    if (!nameRegex.test(trimmedName)) {
      showMessage({
        message: "Validation Error",
        description: "Please enter a valid display name (3-50 letters/spaces).",
        type: "warning",
      });
      return;
    }

    onSave({
      display_name: trimmedName,
      profile_image: uploadedImage || undefined,
      sports: selectedSports.map(Number),
    });
    setIsEditMode(false);
  };

  if (isEditMode) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Avatar Pick Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={isUploading} activeOpacity={0.8}>
            {profileImageUri ? (
              <CImage source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : (
              <Text style={{ fontSize: 32 }}>👤</Text>
            )}
            {isUploading && (
              <View style={styles.spinnerOver}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarInstruction}>Tap to update photo</Text>
        </View>
        {/* Inputs Cards */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>👤 Personal Info</Text>
          <CTextInput label="Full Name *" value={displayName} onChangeTextValue={setDisplayName} placeholder="Enter display name" />
          <SizedBox height={14} />
          <CTextInput label="Mobile Number" value={mobileNumber} editable={false} selectTextOnFocus={false} placeholder="Mobile number" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>🏏 Sports of Interest</Text>
          <View style={styles.sportsGrid}>
            {SPORTS_OPTIONS.map((sport) => {
              const isSelected = selectedSports.includes(sport.id);
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportChip, isSelected && styles.sportChipActive]}
                  onPress={() => toggleSport(sport.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sportChipEmoji}>{sport.icon}</Text>
                  <Text style={[styles.sportChipText, isSelected && styles.sportChipTextActive]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <SizedBox height={20} />
        <CButton title="Save Profile" onPress={handleSave} loading={isSaving} disabled={isSaving || isUploading} />
        <SizedBox height={10} />
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditMode(false)} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <SizedBox height={60} />
      </ScrollView>
    );
  }

  // View Mode
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
      {/* Profile Header */}
      <View style={styles.profileHeaderCard}>
        <TouchableOpacity style={styles.avatarContainerView} onPress={handlePickImage} disabled={isUploading} activeOpacity={0.8}>
          {profileImageUri ? (
            <CImage source={{ uri: profileImageUri }} style={styles.avatarImageView} />
            // <Text>{profileImageUri}</Text>
          ) : (
            <View style={styles.avatarViewPlaceholder}>
              <Text style={{ fontSize: 36 }}>👤</Text>
            </View>
          )}
          {isUploading && (
            <View style={styles.spinnerOverView}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          )}
          <View style={styles.cameraIconBadge}>
            <Ionicons name="camera" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{displayName || "Anonymous Player"}</Text>
        {city ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#00D2FF" style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>{city}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditMode(true)} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={16} color="#00D2FF" style={{ marginRight: 6 }} />
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>


      {/* Registered Sports */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Sports of Interest</Text>
        <View style={styles.sportsGrid}>
          {selectedSports.length === 0 ? (
            <Text style={styles.emptyText}>No sports selected yet.</Text>
          ) : (
            selectedSports.map((id) => {
              const sportOpt = SPORTS_OPTIONS.find((o) => o.id === id);
              if (!sportOpt) return null;
              return (
                <View key={id} style={styles.sportChipView}>
                  <Text style={styles.sportChipEmojiView}>{sportOpt.icon}</Text>
                  <Text style={styles.sportChipTextView}>{sportOpt.name}</Text>
                </View>
              );
            })
          )}
        </View>
      </View>
      <SizedBox height={65} />
    </ScrollView>
  );
};

export default MyProfileTab;

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 14,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#6C4DF6",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  spinnerOver: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#6C4DF6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInstruction: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    marginTop: 6,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.8,
  },
  selectorLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  selectorsRow: {
    flexDirection: "row",
    gap: 10,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    alignItems: "center",
  },
  selectorBtnActive: {
    borderColor: "#00D2FF",
    backgroundColor: "rgba(0, 210, 255, 0.12)",
  },
  selectorBtnText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  selectorBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sportChipActive: {
    borderColor: "#6C4DF6",
    backgroundColor: "rgba(108, 77, 246, 0.16)",
  },
  sportChipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  sportChipText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  sportChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "700",
  },
  profileHeaderCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarContainerView: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#00D2FF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarImageView: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarViewPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerOverView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#00D2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#120E2E",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  locationText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 210, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.25)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  editProfileBtnText: {
    color: "#00D2FF",
    fontSize: 11,
    fontWeight: "700",
  },
  bioQuoteBox: {
    backgroundColor: "rgba(0, 210, 255, 0.04)",
    borderLeftWidth: 3,
    borderColor: "#00D2FF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    position: "relative",
  },
  quoteIcon: {
    position: "absolute",
    top: 4,
    left: 4,
  },
  bioQuoteText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    fontWeight: "500",
    paddingLeft: 4,
  },
  attrsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  attrItem: {
    width: "50%",
    paddingVertical: 8,
  },
  attrLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  attrValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  sportChipView: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 210, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sportChipEmojiView: {
    fontSize: 13,
    marginRight: 4,
  },
  sportChipTextView: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontStyle: "italic",
  },
});
