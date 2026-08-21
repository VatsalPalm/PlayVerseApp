import React, { useState } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, Sports } from "../../utils/types";
import CTextInput from "../../Components/atoms/CTextInput";
import CImage from "../../Components/atoms/CImage";
import SizedBox from "../../Components/atoms/SizeBox";
import CButton from "../../Components/atoms/CButton";
import { Icons } from "../../assets";
import {
  useAuthControllerRegister,
  useUploadControllerUploadFile,
} from "../../Api/playVerseComponents";
import { showMessage } from "react-native-flash-message";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import FloatingOrbs from "../../Components/atoms/FloatingOrbs";
import DeviceInfo from "react-native-device-info";
import { getFcmPushToken } from "../../utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { ProfileImageDto } from "../../Api/playVerseSchemas";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPORTS_LIST = [
  { id: Sports.CRICKET, name: "Cricket", icon: "🏏" },
  { id: Sports.FOOTBALL, name: "Football", icon: "⚽" },
  { id: Sports.PICKLEBALL, name: "Pickleball", icon: "🏓" },
  { id: Sports.BADMINTON, name: "Badminton", icon: "🏸" },
];

const RegisterScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<"PLAYER" | "GROUND_OWNER">(
    "PLAYER",
  );
  const [selectedSports, setSelectedSports] = useState<number[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const isGroundOwner = selectedRole === "GROUND_OWNER";

  const toggleSport = (sportId: number) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter((id) => id !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<ProfileImageDto | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: uploadFileAsync } = useUploadControllerUploadFile();

  const processPickedImage = (localUri: string) => {
    setProfileImage(localUri);
    setUploadedImage(null);
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description:
            "Sorry, we need camera permissions to take a profile picture.",
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
      console.log("Camera launch error:", e);
    }
  };

  const handleLaunchLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description:
            "Sorry, we need gallery permissions to upload a profile picture.",
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
      ],
    );
  };

  const { mutate: register, isPending } = useAuthControllerRegister({
    onSuccess: (data: any) => {
      setLocalLoading(false);
      showMessage({
        message: "Registration Initiated",
        description:
          "An OTP has been sent to your mobile number. Please verify to continue.",
        type: "info",
        icon: "info",
        duration: 4000,
      });
      const otpToken =
        data?.result?.otpToken || data?.token || data?.result?.token || "";
      // Navigate to OTP screen. We pass mobileNumber and token
      navigation.navigate("Otp", {
        mobileNumber: phone.trim(),
        token: otpToken,
      });
    },
    onError: (error: any) => {
      setLocalLoading(false);
      console.log("Registration error:", error);
      let errMsg = "Registration failed. Check parameters and try again.";

      if (Array.isArray(error?.messages)) {
        const msgs = error.messages
          .map((m: any) => {
            if (Array.isArray(m.constraints)) {
              return m.constraints.join(", ");
            }
            return typeof m.constraints === "string" ? m.constraints : "";
          })
          .filter(Boolean);
        if (msgs.length > 0) {
          errMsg = msgs.join("\n");
        }
      } else if (typeof error?.message === "string") {
        errMsg = error.message;
      } else if (error?.message && typeof error.message === "object") {
        const messages: string[] = [];
        for (const key in error.message) {
          if (Array.isArray(error.message[key])) {
            messages.push(...error.message[key]);
          } else if (typeof error.message[key] === "string") {
            messages.push(error.message[key]);
          }
        }
        if (messages.length > 0) {
          errMsg = messages.join("\n");
        }
      } else if (error?.error && typeof error.error === "object") {
        const messages: string[] = [];
        for (const key in error.error) {
          if (Array.isArray(error.error[key])) {
            messages.push(...error.error[key]);
          } else if (typeof error.error[key] === "string") {
            messages.push(error.error[key]);
          }
        }
        if (messages.length > 0) {
          errMsg = messages.join("\n");
        }
      } else if (typeof error?.payload === "string") {
        errMsg = error.payload;
      }

      showMessage({
        message: "Registration Failed",
        description: errMsg,
        type: "danger",
        icon: "danger",
      });
    },
  });

  const handleRegister = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      showMessage({
        message: "Required Fields",
        description: "Please fill in all details.",
        type: "warning",
      });
      return;
    }

    const nameRegex = /^[A-Za-z\s'.]{3,50}$/;
    if (!nameRegex.test(trimmedName)) {
      showMessage({
        message: "Validation Error",
        description:
          "Please enter a valid full name (alphabets and spaces only, 3 to 50 characters).",
        type: "warning",
      });
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      showMessage({
        message: "Validation Error",
        description: "Please enter a valid 10-digit mobile number.",
        type: "warning",
      });
      return;
    }

    if (!isGroundOwner && selectedSports.length === 0) {
      showMessage({
        message: "Select Sport",
        description: "Please select at least one sport of interest.",
        type: "warning",
      });
      return;
    }

    setLocalLoading(true);

    let fcmToken = "fcm_token_001";
    let brand = "Generic";
    let model = "Device";
    let os = "Android";
    let osVersion = "1.0";
    let uniqueId = "N/A";

    try {
      const tokenResult = await getFcmPushToken();
      if (tokenResult) {
        fcmToken = tokenResult;
      }
      brand = DeviceInfo.getBrand() || brand;
      model = DeviceInfo.getModel() || model;
      os = DeviceInfo.getSystemName() || os;
      osVersion = DeviceInfo.getSystemVersion() || osVersion;
      uniqueId = (await DeviceInfo.getUniqueId()) || uniqueId;
    } catch (e) {
      console.log("Failed to fetch device / fcm info:", e);
    }

    let lat: number | undefined;
    let lng: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (loc && loc.coords) {
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      }
    } catch (e) {
      console.log("Failed to fetch location on register:", e);
    }

    let uploadImgPayload: ProfileImageDto | undefined = undefined;

    if (profileImage && !profileImage.startsWith("http")) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", {
          uri:
            Platform.OS === "android"
              ? profileImage
              : profileImage.replace("file://", ""),
          name: "profile.jpg",
          type: "image/jpeg",
        } as any);

        const uploadRes: any = await uploadFileAsync({
          body: formData as any,
        });

        const res = uploadRes?.result || uploadRes?.data || uploadRes;
        const url = res?.url || res?.path;
        const filename = res?.filename || "profile.jpg";

        if (url) {
          uploadImgPayload = { filename, url };
          setUploadedImage(uploadImgPayload);
        }
      } catch (err: any) {
        console.log("Upload error:", err);
        setIsUploading(false);
        setLocalLoading(false);
        showMessage({
          message: "Upload Failed",
          description: "Could not upload profile picture. Please try again.",
          type: "danger",
        });
        return;
      } finally {
        setIsUploading(false);
      }
    } else if (profileImage && profileImage.startsWith("http")) {
      uploadImgPayload = uploadedImage || undefined;
    }

    register({
      body: {
        display_name: fullName.trim(),
        country_code: "+91",
        mobile_number: phone.trim(),
        role: selectedRole,
        profile_image: uploadImgPayload || undefined,
        auth_type: "Local",
        app_type: "App",
        os,
        brand,
        model_no: model,
        serial_number: uniqueId,
        version_number: osVersion,
        fcm_token: fcmToken,
        sports: selectedSports as any,
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

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

      <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#00D2FF" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.scrollContainer, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <CImage
              source={Icons.crmLogo}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <View style={styles.titleContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Enter your details and select your sports to join PlayVerse.
              </Text>
            </View>

            <SizedBox height={20} />

            {/* Profile Image Picker */}
            <TouchableOpacity
              style={[
                styles.avatarContainer,
                profileImage ? styles.avatarContainerActive : null,
              ]}
              activeOpacity={0.8}
              onPress={handlePickImage}
              disabled={isUploading}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={32}
                    color="#6C4DF6"
                    style={styles.avatarPlaceholderIcon}
                  />
                  <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                </View>
              )}

              {isUploading && (
                <View style={styles.uploadSpinnerContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}

              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <SizedBox height={20} />

            {/* Form */}
            <View style={styles.form}>
              {/* Role Selector — full width cards stacked vertically */}
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>Register As</Text>
                <View style={styles.roleContainer}>
                  {[
                    {
                      id: "PLAYER",
                      name: "Player",
                      icon: "🏃",
                      desc: "Join tournaments & compete",
                    },
                    {
                      id: "GROUND_OWNER",
                      name: "Ground Owner",
                      icon: "🏟️",
                      desc: "List & manage sports grounds",
                    },
                  ].map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedRole(r.id as any)}
                        style={[
                          styles.roleChip,
                          isSelected && styles.roleChipActive,
                        ]}
                      >
                        <Text style={styles.roleChipEmoji}>{r.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.roleChipText,
                              isSelected && styles.roleChipTextActive,
                            ]}
                          >
                            {r.name}
                          </Text>
                          <Text style={styles.roleChipDesc}>{r.desc}</Text>
                        </View>
                        {isSelected && <View style={styles.roleCheckDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <SizedBox height={20} />

              <CTextInput
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeTextValue={setFullName}
              />

              <SizedBox height={16} />

              <CTextInput
                label="Phone Number"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChangeTextValue={(text) =>
                  setPhone(text.replace(/[^0-9]/g, ""))
                }
                keyboardType="phone-pad"
                maxLength={10}
              />

              {/* Sports — only for Players */}
              {!isGroundOwner && (
                <>
                  <SizedBox height={20} />
                  <View style={styles.sportsSection}>
                    <Text style={styles.sportsLabel}>Sports of Interest</Text>
                    <View style={styles.chipsContainer}>
                      {SPORTS_LIST.map((sport) => {
                        const isSelected = selectedSports.includes(sport.id);
                        return (
                          <TouchableOpacity
                            key={sport.id}
                            activeOpacity={0.8}
                            onPress={() => toggleSport(sport.id)}
                            style={[
                              styles.chip,
                              isSelected && styles.chipActive,
                            ]}
                          >
                            <Text style={styles.chipEmoji}>{sport.icon}</Text>
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && styles.chipTextActive,
                              ]}
                            >
                              {sport.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              {/* Ground Owner info note */}
              {isGroundOwner && (
                <>
                  <SizedBox height={20} />
                  <View style={styles.infoNote}>
                    <Text style={styles.infoNoteIcon}>ℹ️</Text>
                    <Text style={styles.infoNoteText}>
                      Additional details like Business Name, City, Contact Email
                      and WhatsApp can be added in your Edit Profile after
                      registration.
                    </Text>
                  </View>
                </>
              )}

              <SizedBox height={30} />

              <CButton
                title={
                  isGroundOwner ? "Create Ground Owner" : "Register as Player"
                }
                onPress={handleRegister}
                loading={isPending || localLoading}
                disabled={isPending || localLoading}
                swipeable={true}
              />
            </View>

            <SizedBox height={20} />

            {/* Footer Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
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
    alignSelf: "center",
    marginBottom: 10,
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
  container: {
    flex: 1,
    backgroundColor: "#080612",
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.22,
    marginTop: 10,
  },
  titleContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 25,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "400",
  },
  form: {
    width: "100%",
  },
  sportsSection: {
    width: "100%",
    marginTop: 8,
  },
  sportsLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    borderColor: "#6C4DF6",
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  roleSection: {
    width: "100%",
  },
  roleLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  roleChipActive: {
    backgroundColor: "rgba(108, 77, 246, 0.12)",
    borderColor: "#6C4DF6",
  },
  roleChipEmoji: {
    fontSize: 22,
  },
  roleChipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  roleChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  roleChipDesc: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  roleCheckDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6C4DF6",
    marginLeft: "auto",
  },
  infoNote: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 210, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.2)",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
  },
  infoNoteIcon: {
    fontSize: 16,
  },
  infoNoteText: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  btnRegister: {
    height: 56,
    backgroundColor: "#6C4DF6",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C4DF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnRegisterText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  footerLink: {
    color: "#00D2FF",
    fontSize: 14,
    fontWeight: "700",
  },
});
