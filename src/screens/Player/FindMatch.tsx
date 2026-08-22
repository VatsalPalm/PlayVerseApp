import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../utils/types";
import { showMessage } from "react-native-flash-message";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import {
  useAiControllerFindGame,
  useAiControllerInvitePlayer,
} from "../../Api/playVerseComponents";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const sportIcons: Record<string, string> = {
  cricket: "🏏",
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  pickleball: "🏓",
  badminton: "🏸",
};

const formatDate = (raw: string): string => {
  if (!raw) return "—";
  let date: Date;
  if (raw.includes("T")) {
    date = new Date(raw);
  } else {
    const [y, m, d] = raw.split("-").map(Number);
    date = new Date(y, m - 1, d);
  }
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const FindMatchScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  // Mutation for searching games
  const findGameMutation = useAiControllerFindGame();
  
  // Mutation for sending invitations
  const invitePlayerMutation = useAiControllerInvitePlayer();

  const handleSearch = async () => {
    if (!prompt.trim()) {
      showMessage({
        message: "Please enter what you want to play!",
        type: "warning",
      });
      return;
    }

    try {
      setHasSearched(true);
      // Even though TS types this as returning undefined, we cast it to any at runtime
      const res = await findGameMutation.mutateAsync({
        body: { prompt },
      }) as any;

      const parsedMatches = res?.result || res?.data || res?.matches || [];
      setMatches(parsedMatches);
      
      if (parsedMatches.length === 0) {
        showMessage({
          message: "No matching games found. Try a different request!",
          type: "info",
        });
      } else {
        showMessage({
          message: `Found ${parsedMatches.length} matching games!`,
          type: "success",
        });
      }
    } catch (err: any) {
      console.log("Error searching games:", err);
      showMessage({
        message: err?.message || "Failed to search games. Try again.",
        type: "danger",
      });
    }
  };

  const handleJoinSlot = (match: any, slot: any) => {
    const matchId = match.id || match.matchId;
    const slotId = slot.id || slot.slotId;
    const sportName = match.sport_name || match.sportName || "Game";
    const slotTime = `${slot.start_time || slot.startTime || ""} - ${slot.end_time || slot.endTime || ""}`;
    const slotDate = formatDate(slot.date || slot.bookingDate || slot.booking_date || "");

    Alert.alert(
      "Join Request",
      `Would you like to join the ${sportName} match on ${slotDate} at ${slotTime}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send Request",
          onPress: async () => {
            try {
              await invitePlayerMutation.mutateAsync({
                body: { matchId: Number(matchId), slotId: Number(slotId) },
              });
              showMessage({
                message: "Join request sent successfully!",
                type: "success",
              });
            } catch (err: any) {
              console.log("Error joining slot:", err);
              showMessage({
                message: err?.message || "Failed to send join request. Try again.",
                type: "danger",
              });
            }
          },
        },
      ]
    );
  };

  const getSportIcon = (sportName: string) => {
    const nameLower = (sportName || "").toLowerCase();
    for (const key of Object.keys(sportIcons)) {
      if (nameLower.includes(key)) {
        return sportIcons[key];
      }
    }
    return "🎮";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Premium Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#1C1835" />
              <Stop offset="50%" stopColor="#0B0914" />
              <Stop offset="100%" stopColor="#06050C" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
        </Svg>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Match Finder</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt Card */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>What are you in the mood for?</Text>
          <Text style={styles.searchSub}>
            Tell our AI what sport, day, and time you'd like to play, and we'll find candidate slots.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. I want to play badminton today around 7 PM"
              placeholderTextColor="#9CA3AF"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.searchBtn,
              findGameMutation.isPending && styles.searchBtnDisabled,
            ]}
            onPress={handleSearch}
            disabled={findGameMutation.isPending}
            activeOpacity={0.8}
          >
            {findGameMutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.searchBtnText}>Search with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        <View style={styles.resultsContainer}>
          {findGameMutation.isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#6C4DF6" size="large" />
              <Text style={styles.loadingText}>Analyzing match configurations...</Text>
            </View>
          ) : !hasSearched ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={styles.emptyTitle}>Ask PlayVerse AI</Text>
              <Text style={styles.emptyText}>
                Describe your desired match setup above to find matches seeking players.
              </Text>
              
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggestions to try:</Text>
                {[
                  "I want to play cricket this Saturday evening",
                  "Looking for a football game tomorrow morning",
                  "Need a tennis match at a premium court next week",
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => setPrompt(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>💬 "{item}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Matches Found</Text>
              <Text style={styles.emptyText}>
                No matches match your exact query. Try widening your criteria or sports preference.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Matching Games</Text>
              {matches.map((item, index) => {
                const sportName = item.sport_name || item.sportName || "Game";
                const matchFormat = item.match_type || item.matchType || "Singles";
                const groundName = item.ground_name || item.groundName || "TBD Venue";
                const slots = item.available_slots || item.availableSlots || [];

                return (
                  <View key={item.id || index} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <View style={styles.sportBadge}>
                        <Text style={styles.sportBadgeIcon}>
                          {getSportIcon(sportName)}
                        </Text>
                        <View>
                          <Text style={styles.matchSportName}>{sportName}</Text>
                          <Text style={styles.matchFormatText}>{matchFormat}</Text>
                        </View>
                      </View>
                      {item.status && (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.venueRow}>
                      <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                      <Text style={styles.venueText} numberOfLines={1}>
                        {groundName}
                      </Text>
                    </View>

                    {slots.length > 0 ? (
                      <View style={styles.slotsSection}>
                        <Text style={styles.slotsTitle}>Select a Slot to Join:</Text>
                        <View style={styles.slotsGrid}>
                          {slots.map((slot: any, sIdx: number) => {
                            const slotDate = formatDate(slot.date || slot.bookingDate || slot.booking_date || "");
                            const slotTime = `${slot.start_time || slot.startTime || ""} - ${slot.end_time || slot.endTime || ""}`;
                            return (
                              <TouchableOpacity
                                key={slot.id || sIdx}
                                style={styles.slotPill}
                                onPress={() => handleJoinSlot(item, slot)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.slotIconRow}>
                                  <Ionicons name="calendar-outline" size={12} color="#A78BFA" />
                                  <Text style={styles.slotDateText}>{slotDate}</Text>
                                </View>
                                <View style={styles.slotIconRow}>
                                  <Ionicons name="time-outline" size={12} color="#00E676" />
                                  <Text style={styles.slotTimeText}>{slotTime}</Text>
                                </View>
                                <Text style={styles.joinText}>Tap to Join</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.noSlotsText}>No slots available for this match</Text>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FindMatchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0914",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
  },
  searchCard: {
    backgroundColor: "#120B24",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  searchLabel: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  searchSub: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  input: {
    color: "#FFF",
    fontSize: 14,
    minHeight: 60,
  },
  searchBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 16,
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  resultsContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  suggestionsTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  suggestionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  suggestionText: {
    color: "#A78BFA",
    fontSize: 13,
  },
  matchCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sportBadgeIcon: {
    fontSize: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 6,
    borderRadius: 12,
  },
  matchSportName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  matchFormatText: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  statusText: {
    color: "#A78BFA",
    fontSize: 10,
    fontWeight: "700",
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  venueText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  slotsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 14,
  },
  slotsTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 10,
    width: "48%",
  },
  slotIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  slotDateText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "500",
  },
  slotTimeText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "600",
  },
  joinText: {
    color: "#6C4DF6",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 2,
  },
  noSlotsText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 10,
  },
});
