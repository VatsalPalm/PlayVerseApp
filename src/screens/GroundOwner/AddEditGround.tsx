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
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../utils/types";
import {
  useGroundControllerGetGroundDetails,
  useGroundControllerCreateGround,
  useGroundControllerUpdateGround,
  useUploadControllerUploadFiles,
} from "../../Api/playVerseComponents";
import CTextInput from "../../Components/atoms/CTextInput";
import SizedBox from "../../Components/atoms/SizeBox";
import { showMessage } from "react-native-flash-message";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type AddEditGroundRouteProp = RouteProp<HomeStackParamList, "AddEditGround">;

const DEFAULT_SPORTS = [
  { id: "1", name: "Cricket", icon: "🏏" },
  { id: "2", name: "Football", icon: "⚽" },
  { id: "5", name: "Pickleball", icon: "🏓" },
  { id: "6", name: "Badminton", icon: "🏸" },
];

const AddEditGroundScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<AddEditGroundRouteProp>();
  const groundId = route.params?.groundId;
  const isEdit = !!groundId;

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [groundImages, setGroundImages] = useState<string[]>([]);
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (isMapVisible && !latitude && !longitude) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            if (loc && loc.coords) {
              setLatitude(loc.coords.latitude.toString());
              setLongitude(loc.coords.longitude.toString());
            }
          } else {
            showMessage({
              message: "Permission Denied",
              description:
                "Could not access location. Using default map center.",
              type: "warning",
            });
          }
        } catch (e) {
          console.log("Error getting location:", e);
        }
      }
    };
    fetchLocation();
  }, [isMapVisible]);

  const getMapHtml = () => {
    const lat = latitude ? parseFloat(latitude) : 23.0225;
    const lng = longitude ? parseFloat(longitude) : 72.5714;
    const shouldLocate = !latitude && !longitude;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    body { margin: 0; padding: 0; background-color: #080612; color: #FFFFFF; font-family: -apple-system, sans-serif; }
    #map { height: 100vh; width: 100vw; }
    .search-container {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      z-index: 1000;
    }
    #search-input {
      width: 100%;
      height: 48px;
      background-color: #120E2E;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      color: #FFFFFF;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      box-sizing: border-box;
    }
    #search-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
    #search-input:focus {
      outline: none;
      border-color: #6C4DF6;
    }
    .confirm-btn {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #6C4DF6;
      color: #FFFFFF;
      padding: 14px 28px;
      border: none;
      border-radius: 28px;
      font-size: 16px;
      font-weight: 700;
      box-shadow: 0 6px 20px rgba(108, 77, 246, 0.4);
      z-index: 1000;
      cursor: pointer;
      width: 80%;
      text-align: center;
    }
    .pac-container {
      background-color: #120E2E;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      border-radius: 12px;
      margin-top: 8px;
      font-family: -apple-system, sans-serif;
    }
    .pac-item {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 12px 16px;
      color: #9CA3AF;
      font-size: 13px;
    }
    .pac-item-query {
      color: #FFFFFF;
      font-size: 14px;
    }
    .pac-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    .pac-matched {
      color: #6C4DF6;
    }
    .pac-icon {
      filter: invert(100%);
    }
  </style>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDY1UU7ewuL9EK2zemNvtzZoLx_9epbqIg&libraries=places"></script>
</head>
<body>
  <div class="search-container">
    <input type="text" id="search-input" placeholder="Search address or landmark..." />
  </div>

  <div id="map"></div>
  <button class="confirm-btn" onclick="confirmLocation()">Confirm Location</button>

  <script>
    var map;
    var marker;
    var defaultLat = parseFloat('${lat}');
    var defaultLng = parseFloat('${lng}');

    function initMap() {
      var darkMapStyle = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2827" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3942" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ];

      map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 15,
        styles: darkMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
      });

      marker = new google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
      });

      map.addListener("click", function (e) {
        marker.setPosition(e.latLng);
      });

      var input = document.getElementById("search-input");
      var autocomplete = new google.maps.places.Autocomplete(input);
      autocomplete.bindTo("bounds", map);

      autocomplete.addListener("place_changed", function () {
        var place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }

        marker.setPosition(place.geometry.location);
      });

      if (${shouldLocate}) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function (position) {
            var pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            map.setCenter(pos);
            marker.setPosition(pos);
          });
        }
      }
    }

    function confirmLocation() {
      var pos = marker.getPosition();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          latitude: pos.lat(),
          longitude: pos.lng()
        }));
      }
    }

    google.maps.event.addDomListener(window, 'load', initMap);
  </script>
</body>
</html>
    `;
  };

  // Queries & Mutations

  const { data: groundDetails, isLoading: isLoadingDetails } =
    useGroundControllerGetGroundDetails<any>(
      { pathParams: { id: groundId as number } },
      { enabled: isEdit },
    );

  const { mutate: uploadFiles, isPending: isUploading } =
    useUploadControllerUploadFiles({
      onSuccess: (data: any) => {
        console.log("Upload response:", data);
        const result = data?.result || data?.data || data;
        let uploadedUrls: string[] = [];

        if (Array.isArray(result)) {
          uploadedUrls = result
            .map((item: any) => item?.url || item)
            .filter(Boolean);
        } else if (result && typeof result === "object") {
          const url = result.url || result.path;
          if (url) {
            uploadedUrls.push(url);
          }
        } else if (typeof result === "string") {
          uploadedUrls.push(result);
        }

        if (uploadedUrls.length > 0) {
          setGroundImages((prev) => {
            const combined = [...prev, ...uploadedUrls];
            return combined.slice(0, 5);
          });
          showMessage({
            message: "Image Uploaded",
            description: "Arena image(s) uploaded successfully.",
            type: "success",
          });
        }
      },
      onError: (error: any) => {
        console.log("Failed to upload images:", error);
        showMessage({
          message: "Upload Failed",
          description: "Failed to upload arena image(s). Please try again.",
          type: "danger",
        });
      },
    });

  const { mutate: createGround, isPending: isCreating } =
    useGroundControllerCreateGround({
      onSuccess: () => {
        showMessage({
          message: "Success",
          description: "Arena registered successfully.",
          type: "success",
        });
        navigation.navigate("GroundsList");
      },
      onError: (error: any) => {
        console.log("Create error:", error);
        showMessage({
          message: "Registration Failed",
          description: error?.message || "Could not register arena.",
          type: "danger",
        });
      },
    });

  const { mutate: updateGround, isPending: isUpdating } =
    useGroundControllerUpdateGround({
      onSuccess: () => {
        showMessage({
          message: "Success",
          description: "Arena details updated successfully.",
          type: "success",
        });
        navigation.navigate("GroundsList");
      },
      onError: (error: any) => {
        console.log("Update error:", error);
        showMessage({
          message: "Update Failed",
          description: error?.message || "Could not update arena details.",
          type: "danger",
        });
      },
    });

  // Populate data in edit mode
  useEffect(() => {
    if (isEdit && groundDetails) {
      const ground =
        groundDetails?.data || groundDetails?.result || groundDetails;
      setName(ground.name || "");
      setDescription(ground.description || "");
      setAddress(ground.address || "");
      setCity(ground.city || "");
      setLatitude(ground.latitude ? ground.latitude.toString() : "");
      setLongitude(ground.longitude ? ground.longitude.toString() : "");

      const sportsArray = ground.sports || [];
      const ids = sportsArray.map((s: any) =>
        typeof s === "object" ? s.id?.toString() : s.toString(),
      );
      setSelectedSports(ids);

      const imagesArray = ground.images || [];
      if (imagesArray.length > 0) {
        const urls = imagesArray
          .map((img: any) => (typeof img === "object" ? img?.url : img))
          .filter(Boolean);
        setGroundImages(urls);
      }
    }
  }, [isEdit, groundDetails]);

  // Handle Pick Image
  const handlePickImage = async () => {
    const remainingSlots = 5 - groundImages.length;
    if (remainingSlots <= 0) {
      showMessage({
        message: "Limit Reached",
        description: "You can upload a maximum of 5 images.",
        type: "warning",
      });
      return;
    }

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description:
            "Sorry, we need camera roll permissions to upload arena images.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAssets = result.assets.slice(0, remainingSlots);

        if (result.assets.length > remainingSlots) {
          showMessage({
            message: "Limit Exceeded",
            description: `Only the first ${remainingSlots} selected image(s) will be uploaded.`,
            type: "info",
          });
        }

        const formData = new FormData();
        selectedAssets.forEach((asset, index) => {
          formData.append("files", {
            uri:
              Platform.OS === "android"
                ? asset.uri
                : asset.uri.replace("file://", ""),
            name: `ground_${Date.now()}_${index}.jpg`,
            type: "image/jpeg",
          } as any);
        });

        uploadFiles({
          body: formData as any,
        });
      }
    } catch (e) {
      console.log("Image selection error:", e);
    }
  };

  const handleDeleteImage = (index: number) => {
    setGroundImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSport = (sportId: string) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter((id) => id !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      showMessage({
        message: "Validation Error",
        description: "Please enter arena name.",
        type: "warning",
      });
      return;
    }

    if (selectedSports.length === 0) {
      showMessage({
        message: "Validation Error",
        description: "Please select at least one sport.",
        type: "warning",
      });
      return;
    }

    const payload: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      sports: selectedSports.map((id) => parseInt(id, 10)),
      images: groundImages.length > 0 ? groundImages : undefined,
    };

    if (isEdit) {
      updateGround({
        pathParams: { id: groundId as number },
        body: payload,
      });
    } else {
      // Create ground has slots as required array, we provide an empty array initially
      payload.slots = [];
      createGround({
        body: payload,
      });
    }
  };

  const sportsToShow = DEFAULT_SPORTS;

  if (isEdit && isLoadingDetails) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="large" color="#6C4DF6" />
      </View>
    );
  }

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

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>◀ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Edit Arena" : "Add Arena"}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Arena Photos List */}
          <Text style={styles.sectionLabel}>Arena Photos (Max 5)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesScrollContainer}
          >
            {groundImages.map((img, index) => (
              <View key={`img-${index}`} style={styles.imageCard}>
                <Image source={{ uri: img }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.deleteBadge}
                  activeOpacity={0.7}
                  onPress={() => handleDeleteImage(index)}
                >
                  <Text style={styles.deleteBadgeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {groundImages.length < 5 && (
              <TouchableOpacity
                style={[styles.imageCard, styles.addCard]}
                activeOpacity={0.8}
                onPress={handlePickImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#6C4DF6" />
                ) : (
                  <>
                    <Text style={styles.addIcon}>＋</Text>
                    <Text style={styles.addText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          <SizedBox height={20} />

          {/* Form */}
          <CTextInput
            label="Arena Name *"
            placeholder="e.g. Green Field Arena"
            value={name}
            onChangeTextValue={setName}
          />
          <SizedBox height={16} />

          <CTextInput
            label="Description"
            placeholder="Add brief details about facilities, pitch sizes..."
            value={description}
            onChangeTextValue={setDescription}
            multiline
            style={styles.textArea}
          />
          <SizedBox height={16} />

          <CTextInput
            label="Address"
            placeholder="e.g. 123 Main Street, Navrangpura"
            value={address}
            onChangeTextValue={setAddress}
          />
          <SizedBox height={16} />

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <CTextInput
                label="City"
                placeholder="e.g. Ahmedabad"
                value={city}
                onChangeTextValue={setCity}
              />
            </View>
          </View>
          <SizedBox height={16} />

          {/* Map Location Selector */}
          <View>
            <Text style={styles.label}>Venue Location *</Text>
            <SizedBox height={8} />
            <TouchableOpacity
              style={styles.mapPickerBtn}
              activeOpacity={0.8}
              onPress={() => {
                setLatitude("23.0225");
                setLongitude("72.5714");
                showMessage({
                  message: "Static Location Set",
                  description: "Set default coordinates (23.0225, 72.5714) to bypass map error.",
                  type: "success",
                });
              }}
            >
              <Text style={styles.mapPickerBtnIcon}>📍</Text>
              <Text style={styles.mapPickerBtnText}>
                {latitude && longitude
                  ? `Pinned: ${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`
                  : "Set Auto-Default Location"}
              </Text>
            </TouchableOpacity>

            <SizedBox height={12} />

            {/* Manual Coordinate Inputs */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <CTextInput
                  label="Latitude"
                  placeholder="e.g. 23.0225"
                  value={latitude}
                  onChangeTextValue={setLatitude}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <CTextInput
                  label="Longitude"
                  placeholder="e.g. 72.5714"
                  value={longitude}
                  onChangeTextValue={setLongitude}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
          <SizedBox height={24} />

          {/* Sports Selector */}
          <View>
            <Text style={styles.label}>Supported Sports *</Text>
            <SizedBox height={10} />
            <View style={styles.sportsGrid}>
              {sportsToShow.map((sport: any) => {
                const isSelected = selectedSports.includes(sport.id);
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportChip,
                      isSelected && styles.sportChipSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleSport(sport.id)}
                  >
                    <Text style={styles.sportIcon}>{sport.icon}</Text>
                    <Text
                      style={[
                        styles.sportName,
                        isSelected && styles.sportNameSelected,
                      ]}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <SizedBox height={40} />

          {/* Submit button */}
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isEdit ? "Save Changes" : "Register Arena"}
              </Text>
            )}
          </TouchableOpacity>

          <SizedBox height={40} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AddEditGroundScreen;

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
  backBtnText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 20,
  },
  photoContainer: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoPlaceholderText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  rowFields: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.9,
  },
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sportChipSelected: {
    backgroundColor: "#6C4DF6",
    borderColor: "#6C4DF6",
  },
  sportIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sportName: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },
  sportNameSelected: {
    color: "#FFFFFF",
  },
  submitBtn: {
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
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  mapPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
  },
  mapPickerBtnIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  mapPickerBtnText: {
    color: "#a594ff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#080612",
  },
  modalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
  },
  modalCloseText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  mapWebView: {
    flex: 1,
  },
  imagesScrollContainer: {
    paddingVertical: 4,
    gap: 12,
  },
  imageCard: {
    width: 120,
    height: 85,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 10,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  deleteBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  addCard: {
    borderStyle: "dashed",
    borderColor: "rgba(108, 77, 246, 0.5)",
    backgroundColor: "rgba(108, 77, 246, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  addIcon: {
    fontSize: 20,
    color: "#6C4DF6",
    fontWeight: "bold",
  },
  addText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },
  sectionLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.9,
    marginBottom: 8,
  },
});
