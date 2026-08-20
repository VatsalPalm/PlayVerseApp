import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
  Modal,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useGroundControllerGetGroundDetails } from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getImageUrl = (url?: string, groundName?: string) => {
  if (!url || url.includes("example.com")) {
    const nameLower = (groundName || "").toLowerCase();
    if (nameLower.includes("cricket") || nameLower.includes("stadium")) {
      return "https://images.unsplash.com/photo-1589487390574-13e4a3e75112?auto=format&fit=crop&w=600&q=80";
    }
    if (
      nameLower.includes("basket") ||
      nameLower.includes("court") ||
      nameLower.includes("arena")
    ) {
      return "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80";
    }
    if (nameLower.includes("tennis") || nameLower.includes("complex")) {
      return "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80";
    }
    if (nameLower.includes("football") || nameLower.includes("pitch")) {
      return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80";
    }
    return "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=600&q=80";
  }
  return url;
};

const GroundDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groundId, groundName } = route.params as {
    groundId: number;
    groundName: string;
  };
  const insets = useSafeAreaInsets();

  const { data: groundDetailsData, isLoading } =
    useGroundControllerGetGroundDetails<any>(
      { pathParams: { id: groundId } },
      { enabled: !!groundId },
    );

  const groundDetails = groundDetailsData?.data || groundDetailsData;

  const imagesToShow = useMemo(() => {
    if (!groundDetails) return [];
    const list = groundDetails.images || [];
    return list.length > 0
      ? list.map((img: any) => getImageUrl(img.image_url, groundDetails.name))
      : [getImageUrl(groundDetails.thumbnail, groundDetails.name)];
  }, [groundDetails]);

  const sportsList = groundDetails?.sports || [];
  const [showSportPicker, setShowSportPicker] = useState(false);

  const handleBookNow = () => {
    if (sportsList.length > 1) {
      // Multiple sports — show picker
      setShowSportPicker(true);
    } else {
      // Single or no sport — go straight to booking
      const sport = sportsList[0];
      navigation.navigate("BookGround", {
        groundId,
        groundName: groundDetails.name,
        sportId: sport?.id,
        sportName: sport?.name,
      });
    }
  };

  const handleSportSelect = (sport: any) => {
    setShowSportPicker(false);
    navigation.navigate("BookGround", {
      groundId,
      groundName: groundDetails.name,
      sportId: sport.id,
      sportName: sport.name,
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

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Top Header Row */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Ground Details
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6C4DF6" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : groundDetails ? (
          <View style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Image Slider */}
              <View style={styles.sliderContainer}>
                <FlatList
                  data={imagesToShow}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  keyExtractor={(url, index) =>
                    `${groundId}-detail-img-${index}`
                  }
                  renderItem={({ item: url }) => (
                    <Image
                      source={{ uri: url }}
                      style={styles.sliderImage}
                      resizeMode="cover"
                    />
                  )}
                />
              </View>

              {/* Text Info Details */}
              <View style={styles.detailsContent}>
                <Text style={styles.groundName}>{groundDetails.name}</Text>

                <Text style={styles.groundAddress}>
                  📍 {groundDetails.address || "No address added"},{" "}
                  {groundDetails.city || ""}
                </Text>

                {groundDetails.min_price !== undefined &&
                  groundDetails.min_price !== null && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>Starts from</Text>
                      <Text style={styles.priceValue}>
                        ₹{groundDetails.min_price}/hour
                      </Text>
                    </View>
                  )}

                <View style={styles.divider} />

                {/* Sports available */}
                <Text style={styles.sectionTitle}>⚽ Available Sports</Text>
                {sportsList.length > 0 ? (
                  <View style={styles.sportsContainer}>
                    {sportsList.map((sport: any, index: number) => {
                      const sportName = sport.name || `Sport ID: ${sport}`;
                      const typeLabel = sport.groundType || sport.ground_type;
                      const formattedType =
                        typeLabel === "BOX"
                          ? "Box Ground"
                          : typeLabel === "OPEN"
                            ? "Open Ground"
                            : typeLabel === "BOTH"
                              ? "Box & Open"
                              : typeLabel;
                      return (
                        <View key={index} style={styles.sportChip}>
                          <Text style={styles.sportChipText}>
                            {sportName}
                            {formattedType ? ` • ${formattedType}` : ""}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    No sports listed for this ground.
                  </Text>
                )}

                <View style={styles.divider} />

                {/* Description */}
                <Text style={styles.sectionTitle}>📝 About the Venue</Text>
                <Text style={styles.descriptionText}>
                  {groundDetails.description ||
                    "No description provided by the venue manager yet."}
                </Text>

                {groundDetails.owner_name && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>👤 Venue Host</Text>
                    <View style={styles.hostContainer}>
                      <View style={styles.hostAvatar}>
                        <Text style={styles.hostAvatarText}>
                          {(groundDetails.owner_name[0] || "M").toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.hostName}>
                          {groundDetails.owner_name}
                        </Text>
                        <Text style={styles.hostTitle}>
                          Authorized Ground Manager
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            {/* Bottom floating button */}
            <View
              style={[
                styles.bottomBar,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.8}
                onPress={handleBookNow}
              >
                <Text style={styles.bookBtnText}>Book Slots Now ⚡</Text>
              </TouchableOpacity>
            </View>

            {/* Sport Picker Modal */}
            <Modal
              visible={showSportPicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowSportPicker(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setShowSportPicker(false)}
              >
                <Pressable
                  style={[
                    styles.sportSheet,
                    { paddingBottom: Math.max(insets.bottom, 24) },
                  ]}
                >
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>Choose Your Sport</Text>
                  <Text style={styles.sheetSubtitle}>
                    Select the sport you want to book a slot for
                  </Text>

                  <View style={styles.sportOptionsList}>
                    {sportsList.map((sport: any, index: number) => {
                      const typeLabel = sport.groundType || sport.ground_type;
                      const formattedType =
                        typeLabel === "BOX"
                          ? "Box Ground"
                          : typeLabel === "OPEN"
                            ? "Open Ground"
                            : typeLabel === "BOTH"
                              ? "Box & Open"
                              : typeLabel;

                      const sportEmojis: Record<string, string> = {
                        cricket: "🏏",
                        football: "⚽",
                        basketball: "🏀",
                        tennis: "🎾",
                        badminton: "🏸",
                        volleyball: "🏐",
                        pickleball: "🏓",
                      };
                      const emoji =
                        sportEmojis[(sport.name || "").toLowerCase()] || "🏟️";

                      return (
                        <TouchableOpacity
                          key={sport.id || index}
                          style={styles.sportOption}
                          activeOpacity={0.75}
                          onPress={() => handleSportSelect(sport)}
                        >
                          <View style={styles.sportOptionLeft}>
                            <Text style={styles.sportOptionEmoji}>{emoji}</Text>
                            <View>
                              <Text style={styles.sportOptionName}>
                                {sport.name}
                              </Text>
                              {formattedType ? (
                                <Text style={styles.sportOptionType}>
                                  {formattedType}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color="#6C4DF6"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        ) : (
          <View style={styles.loaderContainer}>
            <Text style={styles.errorText}>Failed to load ground details.</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default GroundDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  sliderContainer: {
    height: 250,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  sliderImage: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  detailsContent: {
    padding: 24,
  },
  groundName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  groundAddress: {
    color: "#00D2FF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(108, 77, 246, 0.08)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.2)",
    alignSelf: "flex-start",
  },
  priceLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    marginRight: 8,
  },
  priceValue: {
    color: "#00D2FF",
    fontSize: 16,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 20,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportChip: {
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  sportChipText: {
    color: "#a594ff",
    fontSize: 12,
    fontWeight: "700",
  },
  noDataText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontStyle: "italic",
  },
  descriptionText: {
    color: "#D1D5DB",
    fontSize: 14,
    lineHeight: 22,
  },
  hostContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6C4DF6",
    justifyContent: "center",
    alignItems: "center",
  },
  hostAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  hostName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  hostTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(8, 6, 18, 0.95)",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  bookBtn: {
    backgroundColor: "#6C4DF6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6C4DF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
  },
  // ─── Sport Picker Modal ────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sportSheet: {
    backgroundColor: "#120E2E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  sheetSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
  },
  sportOptionsList: {
    gap: 10,
    marginBottom: 8,
  },
  sportOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.2)",
  },
  sportOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sportOptionEmoji: {
    fontSize: 28,
  },
  sportOptionName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  sportOptionType: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 2,
  },
});
