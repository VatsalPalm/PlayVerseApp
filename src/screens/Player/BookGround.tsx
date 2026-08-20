import React, { useState, useMemo, useEffect } from "react";
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
  TextInput,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { showMessage } from "react-native-flash-message";
import {
  useGroundControllerGetAvailability,
  useBookingControllerCreateBooking,
  useGroundControllerGetPublicGrounds,
} from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";
import * as Location from "expo-location";

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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDateLabel(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Build the next 14 days starting from today */
function buildDates(): Date[] {
  const result: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push(d);
  }
  return result;
}

const BookGroundScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const {
    groundId: routeGroundId,
    groundName: routeGroundName,
    sportId: routeSportId,
  } = (route.params || {}) as {
    groundId?: number;
    groundName?: string;
    sportId?: number;
    sportName?: string;
  };

  const [activeGroundId, setActiveGroundId] = useState<number | undefined>(
    routeGroundId,
  );
  const [activeGroundName, setActiveGroundName] = useState<string | undefined>(
    routeGroundName,
  );

  // Pagination states for grounds list
  const [page, setPage] = useState(1);
  const [publicGrounds, setPublicGrounds] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Fetch user location
  useEffect(() => {
    let isMounted = true;
    const fetchLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted && loc && loc.coords) {
            setUserCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch (e) {
        console.log("Error fetching location in BookGround:", e);
      }
    };
    fetchLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Public Grounds
  const queryParams = useMemo(
    () => ({
      page,
      limit: 10,
      search: submittedQuery || undefined,
      latitude: userCoords?.latitude ?? undefined,
      longitude: userCoords?.longitude ?? undefined,
      radius: 10,
    }),
    [page, submittedQuery, userCoords],
  );

  const {
    data: publicGroundsData,
    isLoading: groundsLoading,
    isFetching: isGroundsFetching,
  } = useGroundControllerGetPublicGrounds<any>(
    {
      queryParams,
    },
    {
      enabled: !activeGroundId,
      retry: false,
    },
  );

  // Append new paginated data when it arrives
  useEffect(() => {
    if (!activeGroundId && publicGroundsData?.data) {
      const newItems = publicGroundsData.data;
      if (page === 1) {
        setPublicGrounds(newItems);
      } else {
        setPublicGrounds((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const filteredNew = newItems.filter(
            (item: any) => !existingIds.has(item.id),
          );
          return [...prev, ...filteredNew];
        });
      }
      if (newItems.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [publicGroundsData, page, activeGroundId]);

  // If searchQuery becomes empty, auto-clear submittedQuery to restore original list
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSubmittedQuery("");
    }
  }, [searchQuery]);

  // When search query changes, reset pagination
  useEffect(() => {
    if (!activeGroundId) {
      setPage(1);
      setHasMore(true);
      setPublicGrounds([]);
    }
  }, [submittedQuery, activeGroundId]);

  const loadMoreGrounds = () => {
    if (
      !activeGroundId &&
      hasMore &&
      !groundsLoading &&
      !isGroundsFetching &&
      publicGrounds.length > 0
    ) {
      setPage((prev) => prev + 1);
    }
  };

  const handleSearch = () => {
    setSubmittedQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSubmittedQuery("");
  };

  const handleBack = () => {
    if (activeGroundId && !routeGroundId) {
      setActiveGroundId(undefined);
      setActiveGroundName(undefined);
      setSelectedSlots([]);
    } else {
      navigation.goBack();
    }
  };

  const dates = useMemo(() => buildDates(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [isConfirmVisible, setConfirmVisible] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const toggleSlotSelection = (item: any) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (exists) {
        return prev.filter((s) => s.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const dateStr = toYMD(selectedDate);

  const { data: availData, isLoading: slotsLoading } =
    useGroundControllerGetAvailability<any>(
      { pathParams: { id: activeGroundId! }, queryParams: { date: dateStr } },
      { enabled: !!activeGroundId },
    );

  const slots: any[] = useMemo(() => {
    if (!availData) return [];
    if (Array.isArray(availData)) return availData;
    if (availData.data) {
      if (Array.isArray(availData.data)) return availData.data;
      if (Array.isArray(availData.data.availableSlots))
        return availData.data.availableSlots;
      if (Array.isArray(availData.data.slots)) return availData.data.slots;
    }
    if (Array.isArray(availData.slots)) return availData.slots;
    if (Array.isArray(availData.availableSlots))
      return availData.availableSlots;
    return [];
  }, [availData]);

  const { mutateAsync: createBookingAsync } =
    useBookingControllerCreateBooking();

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0 || !activeGroundId) return;
    setIsBooking(true);
    try {
      for (const slot of selectedSlots) {
        await createBookingAsync({
          body: {
            groundId: activeGroundId,
            slotId: slot.id,
            bookingDate: dateStr,
            sportId: routeSportId,
            notes: notes.trim() || undefined,
          },
        });
      }
      showMessage({
        message: "Bookings Confirmed! 🎉",
        description: `Successfully booked ${selectedSlots.length} slot(s) for ${dateStr}.`,
        type: "success",
        duration: 4000,
      });
      setSelectedSlots([]);
      navigation.navigate("MyBookings");
    } catch (e: any) {
      showMessage({
        message: e?.payload?.message || "Booking failed. Try again.",
        type: "danger",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const renderSlot = ({ item }: { item: any }) => {
    const isBooked = !!item.isBooked;
    const isSelected = selectedSlots.some((s) => s.id === item.id);
    return (
      <TouchableOpacity
        style={[
          styles.slotCard,
          isSelected && styles.slotCardSelected,
          isBooked && styles.slotCardBooked,
        ]}
        activeOpacity={isBooked ? 1 : 0.8}
        disabled={isBooked}
        onPress={() => toggleSlotSelection(item)}
      >
        <View style={styles.slotTimeRow}>
          <Text style={[styles.slotTime, isBooked && styles.slotTextDisabled]}>
            {item.startTime} – {item.endTime}
          </Text>
          {isBooked ? (
            <View style={styles.bookedTag}>
              <Text style={styles.bookedTagText}>Booked</Text>
            </View>
          ) : (
            isSelected && (
              <Ionicons name="checkmark-circle" size={20} color="#6C4DF6" />
            )
          )}
        </View>
        <Text style={[styles.slotPrice, isBooked && styles.slotTextDisabled]}>
          ₹{item.price}
        </Text>
        <Text style={[styles.slotDay, isBooked && styles.slotTextDisabled]}>
          Day {item.dayOfWeek !== undefined ? DAY_NAMES[item.dayOfWeek] : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGroundItem = ({ item }: { item: any }) => {
    const sportsList = item.sports || [];
    return (
      <View style={styles.groundCard}>
        <View style={styles.groundCardHeader}>
          <Text style={styles.groundCardName}>{item.name}</Text>
          <Text style={styles.groundCardLocation}>
            📍 {item.address || ""}
            {item.city ? `, ${item.city}` : ""}
            {item.distance !== undefined && item.distance !== null
              ? ` (${item.distance} km away)`
              : ""}
          </Text>
        </View>

        {item.description ? (
          <Text style={styles.groundCardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {sportsList.length > 0 && (
          <View style={styles.sportsChipsRow}>
            {sportsList.map((sport: any, sIdx: number) => {
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
                <View key={sIdx} style={styles.sportCardChip}>
                  <Text style={styles.sportCardChipText}>
                    {sportName}
                    {formattedType ? ` • ${formattedType}` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.selectGroundBtn}
          activeOpacity={0.8}
          onPress={() => {
            setActiveGroundId(item.id);
            setActiveGroundName(item.name);
          }}
        >
          <Text style={styles.selectGroundBtnText}>Select Ground ⚡</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (!activeGroundId) {
      return (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="#00D2FF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.headerTitle}>Select a Ground</Text>
              <Text style={styles.headerSub}>Choose a venue to book slots</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputRow}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search grounds by name or city..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSearch}
                  activeOpacity={0.7}
                  style={styles.searchClearBtn}
                >
                  <Text style={styles.searchClearText}>✕</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSearch}
                activeOpacity={0.8}
                style={styles.searchBtn}
              >
                <Text style={styles.searchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(groundsLoading || isGroundsFetching) && page === 1 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#6C4DF6" />
            </View>
          ) : (
            <FlatList
              data={publicGrounds}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={renderGroundItem}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: 40,
              }}
              onEndReached={loadMoreGrounds}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                isGroundsFetching && page > 1 ? (
                  <ActivityIndicator
                    size="small"
                    color="#6C4DF6"
                    style={{ marginVertical: 12 }}
                  />
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🏟️</Text>
                  <Text style={styles.emptyTitle}>No Grounds Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {submittedQuery
                      ? `No grounds matched "${submittedQuery}". Try another search.`
                      : "There are no venues listed in the app at the moment."}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeGroundName}
            </Text>
            <Text style={styles.headerSub}>Pick a date & slot</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Date Strip */}
          <Text style={styles.sectionLabel}>📅 Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
          >
            {dates.map((d, i) => {
              const isToday = i === 0;
              const isSel = toYMD(d) === dateStr;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateChip, isSel && styles.dateChipSelected]}
                  onPress={() => {
                    setSelectedDate(d);
                    setSelectedSlots([]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateDayText,
                      isSel && styles.dateDayTextSelected,
                    ]}
                  >
                    {DAY_NAMES[d.getDay()]}
                  </Text>
                  <Text
                    style={[
                      styles.dateDayNum,
                      isSel && styles.dateDayNumSelected,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  {isToday && <Text style={styles.todayDot}>•</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.selectedDateLabel}>
            {formatDateLabel(selectedDate)}
          </Text>

          {/* Slots */}
          <Text style={styles.sectionLabel}>🕐 Available Slots</Text>

          {slotsLoading ? (
            <View style={styles.slotLoader}>
              <ActivityIndicator size="large" color="#6C4DF6" />
              <SizedBox height={8} />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.noSlotsBox}>
              <Text style={styles.noSlotsIcon}>🚫</Text>
              <Text style={styles.noSlotsText}>
                No available slots for this date
              </Text>
            </View>
          ) : (
            <FlatList
              data={slots}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={renderSlot}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.slotsGrid}
              columnWrapperStyle={{ gap: 12 }}
            />
          )}

          {/* Notes */}
          {selectedSlots.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>📝 Notes (optional)</Text>
              <View style={styles.notesBox}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Any special requests..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom confirm bar */}
        {selectedSlots.length > 0 && (
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View>
              <Text style={styles.bottomSlotTime}>
                {selectedSlots.length === 1
                  ? `${selectedSlots[0].startTime} – ${selectedSlots[0].endTime}`
                  : `${selectedSlots.length} Slots Selected`}
              </Text>
              <Text style={styles.bottomDate}>
                {formatDateLabel(selectedDate)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.9}
              disabled={isBooking}
              onPress={handleConfirmBooking}
            >
              {isBooking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bookBtnText}>
                  Book {selectedSlots.length} Slot
                  {selectedSlots.length !== 1 ? "s" : ""} • ₹
                  {selectedSlots
                    .reduce((sum, s) => sum + parseFloat(s.price || "0"), 0)
                    .toFixed(0)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
        </Svg>
      </View>

      <SafeAreaView style={{ flex: 1 }}>{renderContent()}</SafeAreaView>
    </View>
  );
};

export default BookGroundScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080612" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  headerSub: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  dateStrip: { paddingHorizontal: 16, gap: 10 },
  dateChip: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateChipSelected: { backgroundColor: "#6C4DF6", borderColor: "#6C4DF6" },
  dateDayText: { color: "#9CA3AF", fontSize: 11, fontWeight: "600" },
  dateDayTextSelected: { color: "#fff" },
  dateDayNum: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  dateDayNumSelected: { color: "#fff" },
  todayDot: { color: "#00D2FF", fontSize: 18, lineHeight: 14 },
  selectedDateLabel: {
    color: "#a594ff",
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 20,
    marginTop: 8,
  },
  slotLoader: { alignItems: "center", paddingVertical: 40 },
  loadingText: { color: "#9CA3AF", fontSize: 13 },
  noSlotsBox: { alignItems: "center", paddingVertical: 40 },
  noSlotsIcon: { fontSize: 40, marginBottom: 10 },
  noSlotsText: { color: "#9CA3AF", fontSize: 14 },
  slotsGrid: { paddingHorizontal: 16 },
  slotCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    marginBottom: 12,
  },
  slotCardSelected: {
    borderColor: "#6C4DF6",
    backgroundColor: "rgba(108,77,246,0.12)",
  },
  slotTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotTime: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  slotPrice: {
    color: "#00D2FF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  slotDay: { color: "#9CA3AF", fontSize: 11, marginTop: 4 },
  slotCardBooked: {
    borderColor: "rgba(255,255,255,0.03)",
    backgroundColor: "rgba(255,255,255,0.01)",
    opacity: 0.4,
  },
  slotTextDisabled: {
    color: "#6B7280",
  },
  bookedTag: {
    backgroundColor: "rgba(239,68,68,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(239,68,68,0.3)",
  },
  bookedTagText: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  notesBox: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },
  notesInput: {
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: "top",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(18,14,46,0.95)",
    borderTopWidth: 1,
    borderColor: "rgba(108,77,246,0.3)",
  },
  bottomSlotTime: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  bottomDate: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  bookBtn: {
    backgroundColor: "#6C4DF6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 130,
    alignItems: "center",
  },
  bookBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 12,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    height: "100%",
  },
  searchClearBtn: {
    padding: 8,
  },
  searchClearText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  searchBtn: {
    paddingLeft: 12,
    paddingRight: 4,
    height: "100%",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#6C4DF6",
    fontSize: 14,
    fontWeight: "700",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  groundCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  groundCardHeader: {
    marginBottom: 10,
  },
  groundCardName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  groundCardLocation: {
    color: "#00D2FF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  groundCardDesc: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  sportsChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  sportCardChip: {
    backgroundColor: "rgba(108, 77, 246, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.25)",
  },
  sportCardChipText: {
    color: "#D2C4FF",
    fontSize: 10,
    fontWeight: "700",
  },
  selectGroundBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  selectGroundBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
