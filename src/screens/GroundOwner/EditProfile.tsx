import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import CTextInput from "../../Components/atoms/CTextInput";
import SizedBox from "../../Components/atoms/SizeBox";
import CButton from "../../Components/atoms/CButton";
import {
  useUserControllerGetProfile,
  useUserControllerUpdateProfile,
  useUploadControllerUploadFile,
} from "../../Api/playVerseComponents";
import { ProfileImageDto } from "../../Api/playVerseSchemas";
import { showMessage } from "react-native-flash-message";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "../../services/mmkv";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper to parse dynamic/relative image URLs
const getProfileImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  return `https://8lqg2hx4-3339.inc1.devtunnels.ms${url}`;
};

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");

  // Profile photo states
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<ProfileImageDto | null>(null);

  // Get Profile Data
  const { data: profileData, isLoading, refetch } = useUserControllerGetProfile<any>({});

  // Sync profile data to local state once loaded
  useEffect(() => {
    if (profileData) {
      const profile = profileData?.data || profileData?.result || profileData;
      if (profile) {
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || profile.playerProfile?.bio || "");
        setCity(profile.city || profile.playerProfile?.city || "");

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
        }
      }
    }
  }, [profileData]);

  // Image Upload Hook
  const { mutate: uploadFile, isPending: isUploading } = useUploadControllerUploadFile({
    onSuccess: (data: any) => {
      const url = data?.result?.url || data?.url || data?.path;
      const filename = data?.result?.filename || data?.filename || "profile.jpg";
      if (url) {
        setUploadedImage({ filename, url });
        setProfileImageUri(getProfileImageUrl(url));
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

  // Update Profile Hook
  const { mutate: updateProfile, isPending: isUpdating } = useUserControllerUpdateProfile({
    onSuccess: (data: any) => {
      // Save updated data to MMKV cache
      try {
        const storedProfile = storage.getString("userProfile");
        if (storedProfile) {
          const currentProfileObj = JSON.parse(storedProfile);
          const updatedProfileData = data?.data || data?.result || data || {};
          
          const newProfileObj = {
            ...currentProfileObj,
            ...updatedProfileData,
            // Explicitly sync displayName and profile_image in storage
            display_name: displayName,
            profile_image: uploadedImage || currentProfileObj.profile_image,
          };
          storage.set("userProfile", JSON.stringify(newProfileObj));
        }
      } catch (e) {
        console.log("Failed to update user profile cache:", e);
      }

      showMessage({
        message: "Profile Updated",
        description: "Your profile changes have been saved successfully.",
        type: "success",
      });

      // Refetch profile query & navigate back
      refetch();
      navigation.goBack();
    },
    onError: (error: any) => {
      console.log("Update profile error:", error);
      let errMsg = "Could not update profile details.";
      if (typeof error?.message === "string") {
        errMsg = error.message;
      }
      showMessage({
        message: "Update Failed",
        description: errMsg,
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
          description: "Sorry, we need camera permissions to take a profile picture.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
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
          description: "Sorry, we need gallery permissions to upload profile picture.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPickedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Image picker error:", e);
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      "Profile Photo",
      "Select an option to choose your profile picture",
      [
        {
          text: "Take Photo (Camera)",
          onPress: handleLaunchCamera,
        },
        {
          text: "Choose from Gallery",
          onPress: handleLaunchLibrary,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleSaveChanges = () => {
    const trimmedName = displayName.trim();
    const trimmedCity = city.trim();

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
        description: "Please enter a valid display name (alphabets and spaces only, 3 to 50 characters).",
        type: "warning",
      });
      return;
    }

    if (trimmedCity) {
      const cityRegex = /^[A-Za-z\s]{3,30}$/;
      if (!cityRegex.test(trimmedCity)) {
        showMessage({
          message: "Validation Error",
          description: "Please enter a valid city name (alphabets only, 3 to 30 characters).",
          type: "warning",
        });
        return;
      }
    }

    updateProfile({
      body: {
        display_name: trimmedName,
        bio: bio.trim() || undefined,
        city: trimmedCity || undefined,
        profile_image: uploadedImage || undefined,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="large" color="#6C4DF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={[styles.avatarContainer, profileImageUri ? styles.avatarContainerActive : null]} onPress={handlePickImage} disabled={isUploading} activeOpacity={0.8}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderIcon}>👤</Text>
                  <Text style={styles.avatarPlaceholderText}>ADD PHOTO</Text>
                </View>
              )}

              {isUploading && (
                <View style={styles.uploadSpinnerContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}

              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarInstruction}>Tap to change profile picture</Text>
          </View>

          <SizedBox height={15} />

          {/* Form Fields */}
          <CTextInput label="Full Name" value={displayName} onChangeTextValue={setDisplayName} placeholder="Enter your full name" />
          <SizedBox height={16} />

          <CTextInput label="Bio" value={bio} onChangeTextValue={setBio} placeholder="Describe yourself (e.g. Ground owner or administrator)" multiline numberOfLines={3} />
          <SizedBox height={16} />

          <CTextInput label="City" value={city} onChangeTextValue={setCity} placeholder="e.g. Mumbai, Delhi" />
          <SizedBox height={30} />

          <CButton title="Save Changes" onPress={handleSaveChanges} loading={isUpdating} disabled={isUpdating || isUploading} />

          <SizedBox height={40} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080612",
  },
  safeArea: {
    flex: 1,
  },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
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
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    paddingTop: 15,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 15,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#6C4DF6",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  avatarContainerActive: {
    borderStyle: "solid",
    borderColor: "#6C4DF6",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  avatarPlaceholderText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#6C4DF6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#080612",
  },
  uploadSpinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInstruction: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    marginTop: 8,
    fontWeight: "500",
  },
});
