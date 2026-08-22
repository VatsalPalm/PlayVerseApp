import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import FloatingOrbs from '../../Components/atoms/FloatingOrbs';
import { showMessage } from "react-native-flash-message";
import {
  useMatchControllerCreateMatch,
  useGroundControllerGetPublicGrounds,
  useUserControllerGetProfile,
} from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import { SEED_PLAYERS } from "../../utils/seedPlayers";

const CreateMatchScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // API calls
  const { data: profileResponse } = useUserControllerGetProfile<any>({});
  const { data: groundsResponse, isLoading: groundsLoading } =
    useGroundControllerGetPublicGrounds<any>({
      queryParams: { limit: 100 },
    });
  const createMatchMutation = useMatchControllerCreateMatch();

  const currentUser = profileResponse?.data;

  // Match configurations
  const [matchType, setMatchType] = useState<"SINGLES" | "DOUBLES">("SINGLES");

  // Selection states
  // Do NOT automatically add current user as Home Player 1
  const [homePlayer1, setHomePlayer1] = useState<any>({
    id: 1,
    name: "Rajesh Kumar",
  });
  const [homePlayer2, setHomePlayer2] = useState<any>(null);
  const [awayPlayer1, setAwayPlayer1] = useState<any>({
    id: 2,
    name: "Priya Sharma",
  });
  const [awayPlayer2, setAwayPlayer2] = useState<any>(null);

  const [selectedGround, setSelectedGround] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState("2026-08-25");
  const [scheduledTime, setScheduledTime] = useState("18:00");

  // Rule settings
  const [pointsPerGame, setPointsPerGame] = useState("11");
  const [winByTwo, setWinByTwo] = useState(true);
  const [gamesToWin, setGamesToWin] = useState("2");

  // Modal selector states
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerTargetSlot, setPickerTargetSlot] = useState<
    "HP1" | "HP2" | "AP1" | "AP2" | "GROUND" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter players list based on search
  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return SEED_PLAYERS.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.id.toString() === query ||
        (p.mobile && p.mobile.includes(query)),
    );
  }, [searchQuery]);

  // Filter grounds list based on search
  const filteredGrounds = useMemo(() => {
    const list = groundsResponse?.data || [];
    return list.filter((g: any) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [groundsResponse, searchQuery]);

  const openPicker = (slot: "HP1" | "HP2" | "AP1" | "AP2" | "GROUND") => {
    setPickerTargetSlot(slot);
    setSearchQuery("");
    setPickerModalVisible(true);
  };

  const handleSelectItem = (item: any) => {
    if (pickerTargetSlot === "HP1") setHomePlayer1(item);
    else if (pickerTargetSlot === "HP2") setHomePlayer2(item);
    else if (pickerTargetSlot === "AP1") setAwayPlayer1(item);
    else if (pickerTargetSlot === "AP2") setAwayPlayer2(item);
    else if (pickerTargetSlot === "GROUND") setSelectedGround(item);

    setPickerModalVisible(false);
    setPickerTargetSlot(null);
  };

  const handleCreateMatch = async () => {
    // 1. Validations
    if (!homePlayer1) {
      showMessage({
        message: "Home team player 1 is required",
        type: "danger",
      });
      return;
    }
    if (!awayPlayer1) {
      showMessage({
        message: "Away team player 1 is required",
        type: "danger",
      });
      return;
    }

    if (matchType === "DOUBLES") {
      if (!homePlayer2) {
        showMessage({
          message: "Home team player 2 is required for Doubles",
          type: "danger",
        });
        return;
      }
      if (!awayPlayer2) {
        showMessage({
          message: "Away team player 2 is required for Doubles",
          type: "danger",
        });
        return;
      }
    }

    // Collect IDs as numbers
    const homePlayerIds = [Number(homePlayer1.id)];
    if (matchType === "DOUBLES" && homePlayer2) {
      homePlayerIds.push(Number(homePlayer2.id));
    }

    const awayPlayerIds = [Number(awayPlayer1.id)];
    if (matchType === "DOUBLES" && awayPlayer2) {
      awayPlayerIds.push(Number(awayPlayer2.id));
    }

    // Check for duplicates
    const allPlayerIds = [...homePlayerIds, ...awayPlayerIds];
    const uniqueIds = new Set(allPlayerIds);
    if (uniqueIds.size !== allPlayerIds.length) {
      showMessage({
        message: "A player cannot be added multiple times",
        type: "danger",
      });
      return;
    }

    const points = parseInt(pointsPerGame, 10);
    const games = parseInt(gamesToWin, 10);

    if (isNaN(points) || points <= 0) {
      showMessage({
        message: "Points per game must be a positive number",
        type: "danger",
      });
      return;
    }
    if (isNaN(games) || games <= 0) {
      showMessage({
        message: "Games to win must be a positive number",
        type: "danger",
      });
      return;
    }

    const bodyPayload = {
      sportId: 5, // Pickleball
      matchType,
      homePlayerIds: homePlayerIds.map(String),
      awayPlayerIds: awayPlayerIds.map(String),
      groundId: selectedGround?.id || null,
      scheduledAt: `${scheduledDate}T${scheduledTime}:00Z`,
      pointsPerGame: points,
      winByTwo,
      gamesToWin: games,
    };

    console.log("Creating Match with DTO payload:", bodyPayload);

    createMatchMutation.mutate(
      { body: bodyPayload },
      {
        onSuccess: () => {
          showMessage({
            message: "Match Scheduled Successfully!",
            type: "success",
          });
          navigation.goBack();
        },
        onError: (err: any) => {
          showMessage({
            message: err?.message || "Failed to schedule match. Try again.",
            type: "danger",
          });
        },
      },
    );
  };

  const renderPlayerSlot = (
    player: any,
    placeholder: string,
    onPress: () => void,
    onClear?: () => void
  ) => {
    if (!player) {
      return (
        <TouchableOpacity
          style={styles.emptyPlayerSlot}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.emptyPlayerSlotContent}>
            <View style={styles.plusIconCircle}>
              <Ionicons name="add" size={18} color="#6C4DF6" />
            </View>
            <Text style={styles.emptyPlayerText}>{placeholder}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const initials = player.name
      ? player.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "P";

    return (
      <View style={styles.selectedPlayerCard}>
        <View style={styles.playerAvatar}>
          <Text style={styles.playerAvatarText}>{initials}</Text>
        </View>
        
        <View style={styles.playerInfo}>
          <Text style={styles.playerNameText}>{player.name}</Text>
          <Text style={styles.playerMetaText}>
            ID: {player.id} {player.mobile ? `• ${player.mobile}` : ""}
          </Text>
        </View>

        <View style={styles.playerActions}>
          <TouchableOpacity style={styles.changePlayerBtn} onPress={onPress} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal" size={14} color="#6C4DF6" />
            <Text style={styles.changePlayerBtnText}>Change</Text>
          </TouchableOpacity>
          
          {onClear && (
            <TouchableOpacity style={styles.clearPlayerBtn} onPress={onClear} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#151226" />
              <Stop offset="50%" stopColor="#0B0914" />
              <Stop offset="100%" stopColor="#05040A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
        </Svg>
      </View>

      <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#A855F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Match</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Match Type Select */}
        <View style={styles.section}>
          <Text style={styles.label}>Match Format</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, matchType === "SINGLES" && styles.toggleBtnActive]}
              onPress={() => setMatchType("SINGLES")}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, matchType === "SINGLES" && styles.toggleTextActive]}>
                Singles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, matchType === "DOUBLES" && styles.toggleBtnActive]}
              onPress={() => setMatchType("DOUBLES")}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, matchType === "DOUBLES" && styles.toggleTextActive]}>
                Doubles
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Players Configuration - Home Team */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeader}>Home Team Players</Text>
          <View style={styles.cardBody}>
            {renderPlayerSlot(homePlayer1, "Select Home Player 1", () => openPicker("HP1"))}
            
            {matchType === "DOUBLES" && (
              <>
                <SizedBox height={12} />
                {renderPlayerSlot(
                  homePlayer2,
                  "Select Home Player 2",
                  () => openPicker("HP2"),
                  () => setHomePlayer2(null)
                )}
              </>
            )}
          </View>
        </View>

        {/* Players Configuration - Away Team */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeader}>Away Team Players</Text>
          <View style={styles.cardBody}>
            {renderPlayerSlot(awayPlayer1, "Select Away Player 1", () => openPicker("AP1"))}
            
            {matchType === "DOUBLES" && (
              <>
                <SizedBox height={12} />
                {renderPlayerSlot(
                  awayPlayer2,
                  "Select Away Player 2",
                  () => openPicker("AP2"),
                  () => setAwayPlayer2(null)
                )}
              </>
            )}
          </View>
        </View>

        {/* Venue Selection */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeader}>Ground / Venue (Optional)</Text>
          <View style={styles.cardBody}>
            {selectedGround ? (
              <View style={styles.selectedPlayerCard}>
                <View style={[styles.playerAvatar, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="location" size={20} color="#10B981" />
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerNameText}>{selectedGround.name}</Text>
                  <Text style={styles.playerMetaText}>Pickleball Arena</Text>
                </View>
                <View style={styles.playerActions}>
                  <TouchableOpacity style={styles.changePlayerBtn} onPress={() => openPicker("GROUND")} activeOpacity={0.7}>
                    <Ionicons name="swap-horizontal" size={14} color="#6C4DF6" />
                    <Text style={styles.changePlayerBtnText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.clearPlayerBtn}
                    onPress={() => setSelectedGround(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.emptyPlayerSlot, { borderColor: "rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.01)" }]}
                onPress={() => openPicker("GROUND")}
                activeOpacity={0.7}
              >
                <View style={styles.emptyPlayerSlotContent}>
                  <View style={[styles.plusIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                    <Ionicons name="location-outline" size={18} color="#10B981" />
                  </View>
                  <Text style={[styles.emptyPlayerText, { color: "#9CA3AF" }]}>Select Venue (Optional)</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date & Time Settings */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeader}>Schedule Details</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Scheduled Date</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputModern}
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#4B5563"
                />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Scheduled Time</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputModern}
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#4B5563"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Scoring & Rules Config */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardHeader}>Match Scoring Rules</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Points Per Game</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="trophy-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputModern}
                  keyboardType="number-pad"
                  value={pointsPerGame}
                  onChangeText={setPointsPerGame}
                />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Games to Win</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="list-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputModern}
                  keyboardType="number-pad"
                  value={gamesToWin}
                  onChangeText={setGamesToWin}
                  placeholder="e.g. 2"
                />
              </View>
            </View>
          </View>

          <SizedBox height={16} />

          <View style={styles.switchRowModern}>
            <View>
              <Text style={styles.switchLabelModern}>Win By Two Points</Text>
              <Text style={styles.switchSubLabelModern}>Requires winning by a 2-point margin</Text>
            </View>
            <TouchableOpacity
              style={[styles.switchToggleModern, winByTwo && styles.switchToggleActiveModern]}
              onPress={() => setWinByTwo(!winByTwo)}
              activeOpacity={0.8}
            >
              <View style={[styles.switchKnobModern, winByTwo && styles.switchKnobActiveModern]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={[styles.bottomFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleCreateMatch}
          disabled={createMatchMutation.isPending}
          activeOpacity={0.8}
        >
          {createMatchMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Schedule Match</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH PICKER MODAL */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerTargetSlot === "GROUND" ? "Select Venue" : "Select Player Profile"}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Modal Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  pickerTargetSlot === "GROUND" ? "Search venue..." : "Search by name, ID, or phone number..."
                }
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Modal List */}
            {pickerTargetSlot === "GROUND" ? (
              groundsLoading ? (
                <ActivityIndicator size="large" color="#6C4DF6" style={{ marginTop: 40 }} />
              ) : filteredGrounds.length === 0 ? (
                <Text style={styles.emptyText}>No venues found.</Text>
              ) : (
                <FlatList
                  data={filteredGrounds}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalListItem}
                      onPress={() => handleSelectItem({ id: item.id, name: item.name })}
                    >
                      <View>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemSubtitle}>{item.address || item.city}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                    </TouchableOpacity>
                  )}
                />
              )
            ) : filteredPlayers.length === 0 ? (
              <Text style={styles.emptyText}>No players found.</Text>
            ) : (
              <FlatList
                data={filteredPlayers}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const initials = item.name
                    ? item.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "P";
                  return (
                    <TouchableOpacity
                      style={styles.modalListItemModern}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modalListItemLeft}>
                        <View style={styles.modalAvatar}>
                          <Text style={styles.modalAvatarText}>{initials}</Text>
                        </View>
                        <View style={styles.modalItemInfo}>
                          <Text style={styles.itemTitle}>{item.name}</Text>
                          <Text style={styles.itemSubtitle}>
                            User ID: {item.id} • Mobile: {item.mobile}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0914",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#6C4DF6",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  toggleTextActive: {
    color: "#FFF",
  },
  row: {
    flexDirection: "row",
  },
  submitBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C4DF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  // Premium cards
  cardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6C4DF6",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  cardBody: {},
  emptyPlayerSlot: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(108, 77, 246, 0.3)",
    backgroundColor: "rgba(108, 77, 246, 0.02)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPlayerSlotContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  plusIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(108, 77, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  emptyPlayerText: {
    color: "#6C4DF6",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedPlayerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 12,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarText: {
    color: "#A594FF",
    fontSize: 14,
    fontWeight: "700",
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerNameText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  playerMetaText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  playerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  changePlayerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 77, 246, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  changePlayerBtnText: {
    color: "#A594FF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  clearPlayerBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputModern: {
    flex: 1,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 14,
  },
  switchRowModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  switchLabelModern: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  switchSubLabelModern: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  switchToggleModern: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 2,
    justifyContent: "center",
  },
  switchToggleActiveModern: {
    backgroundColor: "#6C4DF6",
  },
  switchKnobModern: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF",
  },
  switchKnobActiveModern: {
    alignSelf: "flex-end",
  },
  bottomFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F0D1C",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F0D1C",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 15,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  itemSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 40,
    fontSize: 15,
  },
  modalListItemModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  modalListItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalAvatarText: {
    color: "#A594FF",
    fontSize: 12,
    fontWeight: "700",
  },
  modalItemInfo: {
    flex: 1,
  },
});

export default CreateMatchScreen;
