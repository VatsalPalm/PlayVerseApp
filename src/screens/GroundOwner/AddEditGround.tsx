import React, { useEffect, useState, useRef } from "react";
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
  Alert,
  TextInput,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
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
import CButton from "../../Components/atoms/CButton";
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
  const [sportsGroundTypes, setSportsGroundTypes] = useState<
    Record<string, "BOX" | "OPEN" | "BOTH">
  >({});
  const [groundImages, setGroundImages] = useState<string[]>([]);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [selectedCoord, setSelectedCoord] = useState({
    latitude: 23.0225,
    longitude: 72.5714,
  });
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (isMapVisible) {
      setSelectedCoord({
        latitude: latitude ? parseFloat(latitude) : 23.0225,
        longitude: longitude ? parseFloat(longitude) : 72.5714,
      });
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isMapVisible, latitude, longitude]);

  useEffect(() => {
    const fetchLocation = async () => {
      if (isMapVisible && !latitude && !longitude) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 3000),
              ),
            ]);
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

  const handleLocateMe = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (loc && loc.coords) {
          const newCoord = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setSelectedCoord(newCoord);
          mapRef.current?.animateToRegion(
            {
              ...newCoord,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            },
            1000,
          );
        }
      } else {
        showMessage({
          message: "Permission Denied",
          description: "Location permission is required to locate you.",
          type: "warning",
        });
      }
    } catch (e) {
      console.log("Locate me error:", e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setSearchResults([]);
    }
  };

  const triggerSearch = async () => {
    if (searchQuery.trim().length < 3) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            "User-Agent": "PlayVerseApp",
            Accept: "application/json",
          },
        },
      );
      const text = await response.text();
      if (text.trim().startsWith("[")) {
        const data = JSON.parse(text);
        setSearchResults(data);
      } else {
        console.log("OSM Search returned non-JSON response:", text);
      }
    } catch (e) {
      console.log("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const newCoord = { latitude: lat, longitude: lon };
      setSelectedCoord(newCoord);
      setSearchResults([]);
      setSearchQuery(item.display_name);
      mapRef.current?.animateToRegion(
        {
          ...newCoord,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        1000,
      );
    }
  };

  const getMarkerIcon = () => {
    if (selectedSports.length > 0) {
      const firstSportId = selectedSports[0];
      const sportObj = DEFAULT_SPORTS.find((s) => s.id === firstSportId);
      if (sportObj) {
        return sportObj.icon;
      }
    }
    return "🏟️";
  };

  const performReverseGeocode = async (latVal: number, lngVal: number) => {
    try {
      const reverseGeo = await Location.reverseGeocodeAsync({
        latitude: latVal,
        longitude: lngVal,
      });
      if (reverseGeo && reverseGeo.length > 0) {
        const first = reverseGeo[0];
        const parts = [
          first.name,
          first.street,
          first.district,
          first.city,
          first.subregion,
          first.region,
        ].filter(Boolean);
        const readableAddress = parts.join(", ");
        if (readableAddress) {
          setLocationName(readableAddress);
          return readableAddress;
        }
      }
    } catch (err) {
      console.log("Reverse geocoding error:", err);
    }
    return "";
  };

  const handleConfirmLocation = async () => {
    const latVal = selectedCoord.latitude;
    const lngVal = selectedCoord.longitude;
    setLatitude(latVal.toString());
    setLongitude(lngVal.toString());
    setIsMapVisible(false);
    showMessage({
      message: "Location Selected",
      description: `Coordinates: ${latVal.toFixed(4)}, ${lngVal.toFixed(4)}`,
      type: "success",
    });
    const resolvedAddr = await performReverseGeocode(latVal, lngVal);
    if (resolvedAddr && !address.trim()) {
      setAddress(resolvedAddr);
    }
  };

  // Queries & Mutations

  const { data: groundDetails, isLoading: isLoadingDetails } =
    useGroundControllerGetGroundDetails<any>(
      { pathParams: { id: groundId as number } },
      { enabled: isEdit },
    );

  const { mutateAsync: uploadFiles } = useUploadControllerUploadFiles();

  const { mutate: createGround, isPending: isCreating } =
    useGroundControllerCreateGround({
      onSuccess: () => {
        showMessage({
          message: "Success",
          description: "Ground registered successfully.",
          type: "success",
        });
        navigation.navigate("GroundsList");
      },
      onError: (error: any) => {
        console.log("Create error:", error);
        showMessage({
          message: "Registration Failed",
          description: error?.message || "Could not register ground.",
          type: "danger",
        });
      },
    });

  const { mutate: updateGround, isPending: isUpdating } =
    useGroundControllerUpdateGround({
      onSuccess: () => {
        showMessage({
          message: "Success",
          description: "Ground details updated successfully.",
          type: "success",
        });
        navigation.navigate("GroundsList");
      },
      onError: (error: any) => {
        console.log("Update error:", error);
        showMessage({
          message: "Update Failed",
          description: error?.message || "Could not update ground details.",
          type: "danger",
        });
      },
    });

  // Populate data in edit mode or reset in add mode
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

      if (ground.latitude && ground.longitude) {
        const latVal = parseFloat(ground.latitude);
        const lngVal = parseFloat(ground.longitude);
        if (!isNaN(latVal) && !isNaN(lngVal)) {
          performReverseGeocode(latVal, lngVal);
        }
      }

      const sportsArray = ground.sports || [];
      const ids: string[] = [];
      const typeMap: Record<string, "BOX" | "OPEN" | "BOTH"> = {};
      sportsArray.forEach((s: any) => {
        const sId = typeof s === "object" ? s.id?.toString() : s.toString();
        if (sId) {
          ids.push(sId);
          const gType =
            typeof s === "object" && (s.groundType || s.ground_type)
              ? (s.groundType || s.ground_type).toUpperCase()
              : "BOX";
          typeMap[sId] = (
            ["BOX", "OPEN", "BOTH"].includes(gType) ? gType : "BOX"
          ) as "BOX" | "OPEN" | "BOTH";
        }
      });
      setSelectedSports(ids);
      setSportsGroundTypes(typeMap);

      const imagesArray = ground.images || [];
      if (imagesArray.length > 0) {
        const urls = imagesArray
          .map((img: any) =>
            typeof img === "object" ? img?.imageUrl || img?.url : img,
          )
          .filter(Boolean);
        setGroundImages(urls);
      }
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setAddress("");
      setCity("");
      setLatitude("");
      setLongitude("");
      setLocationName("");
      setSelectedSports([]);
      setSportsGroundTypes({});
      setGroundImages([]);
    }
  }, [isEdit, groundDetails, groundId]);

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description: "Sorry, we need camera permissions to take a photo.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        setGroundImages((prev) => {
          const combined = [...prev, newUri];
          return combined.slice(0, 5);
        });
      }
    } catch (e) {
      console.log("Camera error:", e);
    }
  };

  const handleLaunchLibrary = async (remainingSlots: number) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage({
          message: "Permission Denied",
          description:
            "Sorry, we need gallery permissions to upload ground images.",
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

        const newUris = selectedAssets.map((asset) => asset.uri);
        setGroundImages((prev) => {
          const combined = [...prev, ...newUris];
          return combined.slice(0, 5);
        });
      }
    } catch (e) {
      console.log("Image selection error:", e);
    }
  };

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

    Alert.alert("Ground Photos", "Choose an option to add ground photos", [
      {
        text: "Take Photo (Camera)",
        onPress: handleLaunchCamera,
      },
      {
        text: "Choose from Gallery",
        onPress: () => handleLaunchLibrary(remainingSlots),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const handleDeleteImage = (index: number) => {
    setGroundImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSport = (sportId: string) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter((id) => id !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
      if (!sportsGroundTypes[sportId]) {
        setSportsGroundTypes((prev) => ({ ...prev, [sportId]: "BOX" }));
      }
    }
  };

  const setGroundTypeForSport = (
    sportId: string,
    type: "BOX" | "OPEN" | "BOTH",
  ) => {
    setSportsGroundTypes((prev) => ({ ...prev, [sportId]: type }));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      showMessage({
        message: "Validation Error",
        description: "Please enter ground name.",
        type: "warning",
      });
      return;
    }

    const groundNameRegex = /^[A-Za-z0-9\s\-',.()&]{3,100}$/;
    if (!groundNameRegex.test(trimmedName)) {
      showMessage({
        message: "Validation Error",
        description: "Please enter a valid ground name (minimum 3 characters, alphanumeric & spaces only).",
        type: "warning",
      });
      return;
    }

    if (trimmedCity) {
      const cityRegex = /^[A-Za-z\s]{3,30}$/;
      if (!cityRegex.test(trimmedCity)) {
        showMessage({
          message: "Validation Error",
          description: "Please enter a valid city name (minimum 3 characters, letters only).",
          type: "warning",
        });
        return;
      }
    }

    if (trimmedAddress) {
      if (trimmedAddress.length < 5 || trimmedAddress.length > 150) {
        showMessage({
          message: "Validation Error",
          description: "Please enter a valid address (between 5 and 150 characters).",
          type: "warning",
        });
        return;
      }
    }

    if (selectedSports.length === 0) {
      showMessage({
        message: "Validation Error",
        description: "Please select at least one sport.",
        type: "warning",
      });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Separate local file URIs from already uploaded HTTP(S) S3 URLs
      const localUris = groundImages.filter((uri) => !uri.startsWith("http"));
      const remoteUris = groundImages.filter((uri) => uri.startsWith("http"));
      let uploadedUrls: string[] = [];

      if (localUris.length > 0) {
        const formData = new FormData();
        localUris.forEach((uri, index) => {
          formData.append("files", {
            uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
            name: `ground_${Date.now()}_${index}.jpg`,
            type: "image/jpeg",
          } as any);
        });

        const uploadRes: any = await uploadFiles({
          body: formData as any,
        });

        const result = uploadRes?.result || uploadRes?.data || uploadRes;
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
      }

      const finalImages = [...remoteUris, ...uploadedUrls];

      const payload: any = {
        name: trimmedName,
        description: description.trim() || undefined,
        address: trimmedAddress || undefined,
        city: trimmedCity || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        sports: selectedSports.map((id) => ({
          sportId: parseInt(id, 10),
          groundType: sportsGroundTypes[id] || "BOX",
        })),
        images: finalImages.length > 0 ? finalImages : undefined,
      };

      if (isEdit) {
        updateGround({
          pathParams: { id: groundId as number },
          body: payload,
        });
      } else {
        payload.slots = [];
        createGround({
          body: payload,
        });
      }
    } catch (e: any) {
      console.log("Submit error:", e);
      showMessage({
        message: "Failed to save ground",
        description:
          e?.message ||
          "Something went wrong while uploading or saving details.",
        type: "danger",
      });
    } finally {
      setIsUploading(false);
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

      {/* Map Selection Modal */}
      <Modal
        visible={isMapVisible}
        animationType="slide"
        onRequestClose={() => setIsMapVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pin Venue Location</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsMapVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, position: "relative" }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.mapView}
              initialRegion={{
                latitude: selectedCoord.latitude,
                longitude: selectedCoord.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
              onPress={(e) => {
                setSelectedCoord(e.nativeEvent.coordinate);
                setSearchResults([]);
              }}
            >
              <Marker
                coordinate={selectedCoord}
                draggable
                onDragEnd={(e) => setSelectedCoord(e.nativeEvent.coordinate)}
                title="Venue Location"
                description="Drag or tap to adjust location"
              >
                <View style={styles.customMarkerContainer}>
                  <View style={styles.customMarkerBubble}>
                    <Text style={styles.customMarkerText}>
                      {getMarkerIcon()}
                    </Text>
                  </View>
                  <View style={styles.customMarkerArrow} />
                </View>
              </Marker>
            </MapView>

            {/* Search Input Container */}
            <View style={styles.searchBarContainer}>
              <View style={styles.searchInputRow}>
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Search address or landmark..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  onSubmitEditing={triggerSearch}
                  returnKeyType="search"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                <TouchableOpacity
                  onPress={triggerSearch}
                  activeOpacity={0.7}
                  style={{ padding: 4 }}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#6C4DF6" />
                  ) : (
                    <Ionicons name="search" size={20} color="#6C4DF6" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <View style={styles.searchResultsList}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 200 }}
                  >
                    {searchResults.map((item, idx) => (
                      <TouchableOpacity
                        key={`res-${idx}`}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectSearchResult(item)}
                      >
                        <Text
                          style={styles.searchResultItemText}
                          numberOfLines={2}
                        >
                          📍 {item.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.locateBtn}
              activeOpacity={0.8}
              onPress={handleLocateMe}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#6C4DF6" />
              ) : (
                <Text style={styles.locateBtnIcon}>🎯</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.confirmBtnContainer}>
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.8}
              onPress={handleConfirmLocation}
            >
              <Text style={styles.confirmBtnText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Edit Ground" : "Add Ground"}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Arena Photos List */}
          <Text style={styles.sectionLabel}>Ground Photos (Max 5)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesScrollContainer}
          >
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
          </ScrollView>

          <SizedBox height={20} />

          {/* Form */}
          <CTextInput
            label="Ground Name *"
            placeholder="e.g. Green Field Ground"
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

            {/* Ground Type Options for Selected Sports (Cricket and Football only) */}
            {selectedSports.filter((id) => id === "1" || id === "2").length >
              0 && (
              <View style={styles.groundTypeSection}>
                <SizedBox height={14} />
                <Text style={styles.groundTypeHeader}>Ground Type Options</Text>
                <Text style={styles.groundTypeSubHeader}>
                  Choose ground format (Box vs Open Ground) for each selected
                  sport:
                </Text>
                <SizedBox height={12} />
                {selectedSports
                  .filter((id) => id === "1" || id === "2")
                  .map((sportId) => {
                    const sportObj = sportsToShow.find(
                      (s) => s.id === sportId,
                    ) || {
                      name: `Sport #${sportId}`,
                      icon: "⚽",
                    };
                    const currentType = sportsGroundTypes[sportId] || "BOX";
                    return (
                      <View key={`gt-${sportId}`} style={styles.sportTypeCard}>
                        <View style={styles.sportTypeCardHeader}>
                          <Text style={styles.sportTypeCardIcon}>
                            {sportObj.icon}
                          </Text>
                          <Text style={styles.sportTypeCardTitle}>
                            {sportObj.name}
                          </Text>
                        </View>
                        <View style={styles.typeButtonsRow}>
                          <TouchableOpacity
                            style={[
                              styles.typeBtn,
                              currentType === "BOX" && styles.typeBtnSelected,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              setGroundTypeForSport(sportId, "BOX")
                            }
                          >
                            <Text
                              style={[
                                styles.typeBtnText,
                                currentType === "BOX" &&
                                  styles.typeBtnTextSelected,
                              ]}
                            >
                              📦 Box Ground
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.typeBtn,
                              currentType === "OPEN" && styles.typeBtnSelected,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              setGroundTypeForSport(sportId, "OPEN")
                            }
                          >
                            <Text
                              style={[
                                styles.typeBtnText,
                                currentType === "OPEN" &&
                                  styles.typeBtnTextSelected,
                              ]}
                            >
                              🏞️ Open Ground
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.typeBtn,
                              currentType === "BOTH" && styles.typeBtnSelected,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              setGroundTypeForSport(sportId, "BOTH")
                            }
                          >
                            <Text
                              style={[
                                styles.typeBtnText,
                                currentType === "BOTH" &&
                                  styles.typeBtnTextSelected,
                              ]}
                            >
                              🏟️ Both
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>

          <SizedBox height={24} />

          {/* Map Location Selector */}
          <View>
            <Text style={styles.label}>Venue Location *</Text>
            <SizedBox height={8} />
            <TouchableOpacity
              style={styles.mapPickerBtn}
              activeOpacity={0.8}
              onPress={() => setIsMapVisible(true)}
            >
              <Text style={styles.mapPickerBtnIcon}>📍</Text>
              <Text style={styles.mapPickerBtnText} numberOfLines={2}>
                {locationName
                  ? locationName
                  : latitude && longitude
                    ? `Pinned: ${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`
                    : "Choose on Map"}
              </Text>
            </TouchableOpacity>
          </View>

          <SizedBox height={40} />

          {/* Submit button */}
          <CButton
            title={isEdit ? "Save Changes" : "Register Ground"}
            onPress={handleSubmit}
            loading={isCreating || isUpdating || isUploading}
            disabled={isCreating || isUpdating || isUploading}
            style={styles.submitBtn}
          />

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
    color: "#00D2FF",
    fontSize: 16,
    fontWeight: "600",
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
    marginHorizontal: Dimensions.get("window").width * 0.043,
  },
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginHorizontal: Dimensions.get("window").width * 0.043,
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
    marginHorizontal: Dimensions.get("window").width * 0.043,
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
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: Dimensions.get("window").width * 0.043,
  },
  mapPickerBtnIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  mapPickerBtnText: {
    color: "#a594ff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
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
  mapView: {
    flex: 1,
  },
  locateBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#120E2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  locateBtnIcon: {
    fontSize: 20,
  },
  confirmBtnContainer: {
    padding: 20,
    backgroundColor: "#080612",
  },
  confirmBtn: {
    backgroundColor: "#6C4DF6",
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C4DF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  customMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 42,
  },
  customMarkerBubble: {
    backgroundColor: "#120E2E",
    borderWidth: 1.5,
    borderColor: "#6C4DF6",
    borderRadius: 18,
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  customMarkerText: {
    fontSize: 16,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    lineHeight: 22,
  },
  customMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#6C4DF6",
    marginTop: -1,
    zIndex: 2,
  },
  searchBarContainer: {
    position: "absolute",
    top: 16,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#120E2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  searchInputField: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    padding: 0,
  },
  searchResultsList: {
    backgroundColor: "#120E2E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  searchResultItemText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 18,
  },
  imagesScrollContainer: {
    paddingVertical: 4,
    gap: 12,
    paddingHorizontal: Dimensions.get("window").width * 0.043,
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
    marginHorizontal: Dimensions.get("window").width * 0.043,
  },
  groundTypeSection: {
    marginTop: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    marginHorizontal: Dimensions.get("window").width * 0.043,
  },
  groundTypeHeader: {
    color: "#00D2FF",
    fontSize: 14,
    fontWeight: "700",
  },
  groundTypeSubHeader: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  sportTypeCard: {
    backgroundColor: "#120E2E",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sportTypeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sportTypeCardIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sportTypeCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  typeButtonsRow: {
    flexDirection: "row",
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  typeBtnSelected: {
    backgroundColor: "#6C4DF6",
    borderColor: "#6C4DF6",
  },
  typeBtnText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  typeBtnTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
