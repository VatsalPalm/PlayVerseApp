import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { SEED_PLAYERS, PlayerOption } from "../../utils/seedPlayers";
import TeamAvatar from "../Tournament/TeamAvatar";
import SizedBox from "../atoms/SizeBox";
import { showMessage } from "react-native-flash-message";
import { stackApiFetch } from "../../stackApiFetcher";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface StartMatchLineupModalProps {
  visible: boolean;
  match: any;
  onClose: () => void;
  onConfirmStart: (
    matchId: number,
    matchType: "SINGLES" | "DOUBLES",
    homePlayerIds: number[],
    awayPlayerIds: number[]
  ) => void;
  loading?: boolean;
}

export const StartMatchLineupModal: React.FC<StartMatchLineupModalProps> = ({
  visible,
  match,
  onClose,
  onConfirmStart,
  loading = false,
}) => {
  if (!match) return null;

  const initialFormat =
    match.matchType === "DOUBLES" || match.match_type === "DOUBLES"
      ? "DOUBLES"
      : "SINGLES";
  const [matchType, setMatchType] = useState<"SINGLES" | "DOUBLES">(initialFormat);

  // Home Team and Away Team names
  const homeTeamName = match.home_team_name || match.homeTeamName || "Home Team";
  const awayTeamName = match.away_team_name || match.awayTeamName || "Opponent Team";
  const homeTeamId = match.home_team_id || match.homeTeamId;
  const awayTeamId = match.away_team_id || match.awayTeamId;
  const tournamentId = match.tournament_id || match.tournamentId;

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [homeTeamMembers, setHomeTeamMembers] = useState<PlayerOption[]>([]);
  const [awayTeamMembers, setAwayTeamMembers] = useState<PlayerOption[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<PlayerOption[]>([]);

  const [homePlayer1, setHomePlayer1] = useState<PlayerOption | null>(null);
  const [homePlayer2, setHomePlayer2] = useState<PlayerOption | null>(null);
  const [awayPlayer1, setAwayPlayer1] = useState<PlayerOption | null>(null);
  const [awayPlayer2, setAwayPlayer2] = useState<PlayerOption | null>(null);

  // Picker Modal State
  const [pickingSlot, setPickingSlot] = useState<"HOME_1" | "HOME_2" | "AWAY_1" | "AWAY_2" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadTeamAndTournamentMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const promises: Promise<any>[] = [];

      // 1. Fetch Home Team Members
      if (homeTeamId) {
        promises.push(
          stackApiFetch<any, any, any, any, any, any>({
            url: "/api/teams/v1/{id}/members",
            method: "GET",
            pathParams: { id: String(homeTeamId) },
          }).catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      // 2. Fetch Away Team Members
      if (awayTeamId) {
        promises.push(
          stackApiFetch<any, any, any, any, any, any>({
            url: "/api/teams/v1/{id}/members",
            method: "GET",
            pathParams: { id: String(awayTeamId) },
          }).catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      // 3. Fetch Tournament Participants if match is in tournament
      if (tournamentId) {
        promises.push(
          stackApiFetch<any, any, any, any, any, any>({
            url: "/api/tournament/v1/{id}/participants",
            method: "GET",
            pathParams: { id: String(tournamentId) },
          }).catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      const [hRes, aRes, tRes] = await Promise.all(promises);

      // Parse Home Team Members
      const rawHList = Array.isArray(hRes) ? hRes : hRes?.members || hRes?.result || hRes?.data || [];
      const hMembers: PlayerOption[] = rawHList.map((m: any) => ({
        id: Number(m.user_id || m.userId || m.id || m.player_id),
        name: m.name || m.display_name || m.user?.name || `Player ${m.id}`,
        mobile: m.mobile || m.phone || m.user?.mobile,
      })).filter((p: PlayerOption) => p.id && !isNaN(p.id));
      setHomeTeamMembers(hMembers);

      // Parse Away Team Members
      const rawAList = Array.isArray(aRes) ? aRes : aRes?.members || aRes?.result || aRes?.data || [];
      const aMembers: PlayerOption[] = rawAList.map((m: any) => ({
        id: Number(m.user_id || m.userId || m.id || m.player_id),
        name: m.name || m.display_name || m.user?.name || `Player ${m.id}`,
        mobile: m.mobile || m.phone || m.user?.mobile,
      })).filter((p: PlayerOption) => p.id && !isNaN(p.id));
      setAwayTeamMembers(aMembers);

      // Parse Tournament Participants
      const rawTList = Array.isArray(tRes) ? tRes : tRes?.participants || tRes?.result || tRes?.data || [];
      const tMembers: PlayerOption[] = rawTList.map((m: any) => ({
        id: Number(m.user_id || m.userId || m.id || m.player_id || m.team_id),
        name: m.name || m.display_name || m.team_name || `Participant ${m.id}`,
        mobile: m.mobile || m.phone,
      })).filter((p: PlayerOption) => p.id && !isNaN(p.id));
      setTournamentParticipants(tMembers);

      // Pre-fill Home Players from registered team members or existing players
      const existingH = match.homePlayers || match.home_players || [];
      const hp1 = existingH[0]
        ? { id: Number(existingH[0].user_id || existingH[0].id), name: existingH[0].display_name || existingH[0].name }
        : hMembers[0] || SEED_PLAYERS[0];
      setHomePlayer1(hp1);

      const hp2 = existingH[1]
        ? { id: Number(existingH[1].user_id || existingH[1].id), name: existingH[1].display_name || existingH[1].name }
        : hMembers[1] || SEED_PLAYERS[2];
      setHomePlayer2(hp2);

      // Pre-fill Away Players from registered team members or existing players
      const existingA = match.awayPlayers || match.away_players || [];
      const ap1 = existingA[0]
        ? { id: Number(existingA[0].user_id || existingA[0].id), name: existingA[0].display_name || existingA[0].name }
        : aMembers[0] || SEED_PLAYERS[1];
      setAwayPlayer1(ap1);

      const ap2 = existingA[1]
        ? { id: Number(existingA[1].user_id || existingA[1].id), name: existingA[1].display_name || existingA[1].name }
        : aMembers[1] || SEED_PLAYERS[3];
      setAwayPlayer2(ap2);
    } catch (e) {
      console.log("Error loading members:", e);
    } finally {
      setLoadingMembers(false);
    }
  }, [homeTeamId, awayTeamId, tournamentId, match]);

  useEffect(() => {
    if (visible && match) {
      const format =
        match.matchType === "DOUBLES" || match.match_type === "DOUBLES"
          ? "DOUBLES"
          : "SINGLES";
      setMatchType(format);
      loadTeamAndTournamentMembers();
    }
  }, [visible, match, loadTeamAndTournamentMembers]);

  // Determine available players for the currently picking slot
  const currentSlotCandidates = useMemo(() => {
    const isHomeSlot = pickingSlot === "HOME_1" || pickingSlot === "HOME_2";
    const teamMembers = isHomeSlot ? homeTeamMembers : awayTeamMembers;

    // Combine team members with tournament participants and pool players, avoiding duplicates
    const combined: (PlayerOption & { isTeamMember?: boolean })[] = [];
    const seenIds = new Set<number>();

    // 1. Prioritize Team Registered Members
    teamMembers.forEach((p) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        combined.push({ ...p, isTeamMember: true });
      }
    });

    // 2. Add Tournament Participants
    tournamentParticipants.forEach((p) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        combined.push(p);
      }
    });

    // 3. Add General Players Pool
    SEED_PLAYERS.forEach((p) => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        combined.push(p);
      }
    });

    if (!searchQuery.trim()) return combined;
    const q = searchQuery.toLowerCase();
    return combined.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.mobile && p.mobile.includes(q))
    );
  }, [pickingSlot, homeTeamMembers, awayTeamMembers, tournamentParticipants, searchQuery]);

  const handleSelectPlayer = (player: PlayerOption) => {
    if (pickingSlot === "HOME_1") setHomePlayer1(player);
    else if (pickingSlot === "HOME_2") setHomePlayer2(player);
    else if (pickingSlot === "AWAY_1") setAwayPlayer1(player);
    else if (pickingSlot === "AWAY_2") setAwayPlayer2(player);
    setPickingSlot(null);
    setSearchQuery("");
  };

  const handleConfirm = () => {
    if (!homePlayer1) {
      showMessage({ message: "Please select Home Team Player 1", type: "warning" });
      return;
    }
    if (!awayPlayer1) {
      showMessage({ message: "Please select Opponent Player 1", type: "warning" });
      return;
    }
    if (matchType === "DOUBLES" && !homePlayer2) {
      showMessage({ message: "Please select Home Team Player 2 for Doubles", type: "warning" });
      return;
    }
    if (matchType === "DOUBLES" && !awayPlayer2) {
      showMessage({ message: "Please select Opponent Player 2 for Doubles", type: "warning" });
      return;
    }

    const homeIds = [homePlayer1.id];
    if (matchType === "DOUBLES" && homePlayer2) homeIds.push(homePlayer2.id);

    const awayIds = [awayPlayer1.id];
    if (matchType === "DOUBLES" && awayPlayer2) awayIds.push(awayPlayer2.id);

    // Verify duplicate players
    const allIds = [...homeIds, ...awayIds];
    const uniqueIds = new Set(allIds);
    if (uniqueIds.size !== allIds.length) {
      showMessage({
        message: "A player cannot be selected multiple times in the match",
        type: "danger",
      });
      return;
    }

    onConfirmStart(match.id, matchType, homeIds, awayIds);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Match Lineup & Players</Text>
              <Text style={styles.sheetSubtitle}>
                Select 2 players (Singles) or 4 players (Doubles)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Match Format Toggle */}
          <View style={styles.formatToggleRow}>
            <TouchableOpacity
              style={[
                styles.formatToggleBtn,
                matchType === "SINGLES" && styles.formatToggleBtnActive,
              ]}
              onPress={() => setMatchType("SINGLES")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.formatToggleText,
                  matchType === "SINGLES" && styles.formatToggleTextActive,
                ]}
              >
                👤 Singles (2 Players)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatToggleBtn,
                matchType === "DOUBLES" && styles.formatToggleBtnActive,
              ]}
              onPress={() => setMatchType("DOUBLES")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.formatToggleText,
                  matchType === "DOUBLES" && styles.formatToggleTextActive,
                ]}
              >
                👥 Doubles (4 Players)
              </Text>
            </TouchableOpacity>
          </View>

          {loadingMembers ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#6C4DF6" />
              <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>
                Loading registered team players...
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* HOME TEAM ROSTER */}
              <View style={styles.teamSection}>
                <View style={styles.teamHeaderRow}>
                  <TeamAvatar
                    team={match.home_team || match.homeTeam || { name: homeTeamName }}
                    size={24}
                  />
                  <Text style={styles.teamSectionTitle} numberOfLines={1}>
                    {homeTeamName} (Home)
                  </Text>
                  {homeTeamMembers.length > 0 && (
                    <View style={styles.memberCountBadge}>
                      <Text style={styles.memberCountBadgeText}>
                        {homeTeamMembers.length} Registered
                      </Text>
                    </View>
                  )}
                </View>

                {/* Home Player 1 */}
                <TouchableOpacity
                  style={styles.playerSlotCard}
                  onPress={() => setPickingSlot("HOME_1")}
                  activeOpacity={0.7}
                >
                  <View style={styles.playerSlotAvatar}>
                    <Text style={styles.playerSlotAvatarText}>
                      {homePlayer1?.name?.charAt(0) || "1"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerSlotRole}>Home Player 1</Text>
                    <Text style={styles.playerSlotName}>
                      {homePlayer1?.name || "Tap to select player"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Home Player 2 (Doubles only) */}
                {matchType === "DOUBLES" && (
                  <TouchableOpacity
                    style={[styles.playerSlotCard, { marginTop: 8 }]}
                    onPress={() => setPickingSlot("HOME_2")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playerSlotAvatar}>
                      <Text style={styles.playerSlotAvatarText}>
                        {homePlayer2?.name?.charAt(0) || "2"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerSlotRole}>Home Player 2</Text>
                      <Text style={styles.playerSlotName}>
                        {homePlayer2?.name || "Tap to select player"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <SizedBox height={16} />

              {/* OPPONENT / AWAY TEAM ROSTER */}
              <View style={styles.teamSection}>
                <View style={styles.teamHeaderRow}>
                  <TeamAvatar
                    team={match.away_team || match.awayTeam || { name: awayTeamName }}
                    size={24}
                  />
                  <Text style={styles.teamSectionTitle} numberOfLines={1}>
                    {awayTeamName} (Opponent)
                  </Text>
                  {awayTeamMembers.length > 0 && (
                    <View
                      style={[
                        styles.memberCountBadge,
                        { backgroundColor: "rgba(0, 210, 255, 0.15)" },
                      ]}
                    >
                      <Text
                        style={[styles.memberCountBadgeText, { color: "#00D2FF" }]}
                      >
                        {awayTeamMembers.length} Registered
                      </Text>
                    </View>
                  )}
                </View>

                {/* Away Player 1 */}
                <TouchableOpacity
                  style={styles.playerSlotCard}
                  onPress={() => setPickingSlot("AWAY_1")}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.playerSlotAvatar,
                      { backgroundColor: "rgba(0, 210, 255, 0.15)" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.playerSlotAvatarText,
                        { color: "#00D2FF" },
                      ]}
                    >
                      {awayPlayer1?.name?.charAt(0) || "1"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerSlotRole}>Opponent Player 1</Text>
                    <Text style={styles.playerSlotName}>
                      {awayPlayer1?.name || "Tap to select player"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Away Player 2 (Doubles only) */}
                {matchType === "DOUBLES" && (
                  <TouchableOpacity
                    style={[styles.playerSlotCard, { marginTop: 8 }]}
                    onPress={() => setPickingSlot("AWAY_2")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.playerSlotAvatar,
                        { backgroundColor: "rgba(0, 210, 255, 0.15)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.playerSlotAvatarText,
                          { color: "#00D2FF" },
                        ]}
                      >
                        {awayPlayer2?.name?.charAt(0) || "2"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerSlotRole}>Opponent Player 2</Text>
                      <Text style={styles.playerSlotName}>
                        {awayPlayer2?.name || "Tap to select player"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}

          {/* Confirm & Start Button */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleConfirm}
            disabled={loading || loadingMembers}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="play-circle" size={20} color="#FFF" />
                <Text style={styles.startBtnText}>Confirm Lineup & Start Match</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* PLAYER PICKER SUB-MODAL */}
        {pickingSlot && (
          <Modal
            visible={Boolean(pickingSlot)}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setPickingSlot(null)}
          >
            <View style={styles.overlay}>
              <View style={[styles.sheetContainer, { maxHeight: "75%" }]}>
                <View style={styles.headerRow}>
                  <View>
                    <Text style={styles.sheetTitle}>
                      Select {pickingSlot.replace("_", " ")}
                    </Text>
                    <Text style={styles.sheetSubtitle}>
                      {pickingSlot.startsWith("HOME")
                        ? `Registered players for ${homeTeamName}`
                        : `Registered players for ${awayTeamName}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPickingSlot(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search players by name or phone..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <FlatList
                  data={currentSlotCandidates}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => handleSelectPlayer(item)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.pickerAvatar,
                          item.isTeamMember && {
                            backgroundColor: "rgba(16, 185, 129, 0.2)",
                            borderColor: "#10B981",
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerAvatarText,
                            item.isTeamMember && { color: "#10B981" },
                          ]}
                        >
                          {item.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.pickerName}>{item.name}</Text>
                          {item.isTeamMember && (
                            <View style={styles.teamMemberBadge}>
                              <Text style={styles.teamMemberBadgeText}>Team Player</Text>
                            </View>
                          )}
                        </View>
                        {item.mobile && (
                          <Text style={styles.pickerSub}>📱 {item.mobile}</Text>
                        )}
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color="#6C4DF6" />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#161325",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  sheetSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  formatToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  formatToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  formatToggleBtnActive: {
    backgroundColor: "rgba(108, 77, 246, 0.2)",
    borderColor: "#6C4DF6",
  },
  formatToggleText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },
  formatToggleTextActive: {
    color: "#FFFFFF",
  },
  teamSection: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  teamHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  teamSectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  memberCountBadge: {
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberCountBadgeText: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "700",
  },
  playerSlotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  playerSlotAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(108, 77, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerSlotAvatarText: {
    color: "#A78BFA",
    fontSize: 14,
    fontWeight: "800",
  },
  playerSlotRole: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  playerSlotName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  pickerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerAvatarText: {
    color: "#A78BFA",
    fontSize: 15,
    fontWeight: "800",
  },
  pickerName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  pickerSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  teamMemberBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamMemberBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
  },
});

export default StartMatchLineupModal;
