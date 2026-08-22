import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showMessage } from "react-native-flash-message";
import SizedBox from "../atoms/SizeBox";
import TeamAvatar from "./TeamAvatar";
import StartMatchLineupModal from "../Match/StartMatchLineupModal";

interface TournamentFixturesTabProps {
  fixtures: any[];
  participants: any[];
  tournamentTeams: any[];
  insets: { bottom: number; top: number; left: number; right: number };
  isOrganizer: boolean;
  handleGenerateBrackets: () => void;
  statusColors: Record<string, string>;
  navigation: any;
  handleAdminCompleteMatch: (matchId: number) => void;
  handleDeleteMatch: (matchId: number) => void;
  selectedHomeId: number | null;
  setSelectedHomeId: (id: number | null) => void;
  selectedAwayId: number | null;
  setSelectedAwayId: (id: number | null) => void;
  manualMatchDate: string;
  setManualMatchDate: (date: string) => void;
  handleCreateManualMatch: () => void;
  actionLoading: boolean;
  styles: any;
}

export const TournamentFixturesTab: React.FC<TournamentFixturesTabProps> = ({
  fixtures,
  participants,
  tournamentTeams,
  insets,
  isOrganizer,
  handleGenerateBrackets,
  statusColors,
  navigation,
  handleAdminCompleteMatch,
  handleDeleteMatch,
  selectedHomeId,
  setSelectedHomeId,
  selectedAwayId,
  setSelectedAwayId,
  manualMatchDate,
  setManualMatchDate,
  handleCreateManualMatch,
  actionLoading,
  styles,
}) => {
  const [lineupModalMatch, setLineupModalMatch] = useState<any | null>(null);

  const getTeamObj = (teamId: any) => {
    if (!teamId) return null;
    const fromParticipants = participants.find(
      (p) => String(p.team_id || p.id) === String(teamId)
    );
    const fromTeams = tournamentTeams.find(
      (t) => String(t.id || t.teamId) === String(teamId)
    );
    return fromParticipants || fromTeams;
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabScroll,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Text
          style={[styles.sectionHeader, { flex: 1, marginRight: 8, marginBottom: 0 }]}
          numberOfLines={1}
        >
          Fixtures & Brackets ({fixtures.length})
        </Text>

        {isOrganizer && (
          <TouchableOpacity
            style={{
              backgroundColor:
                fixtures.length > 0
                  ? "rgba(0, 210, 255, 0.12)"
                  : "#6C4DF6",
              borderColor: fixtures.length > 0 ? "rgba(0, 210, 255, 0.4)" : "#7C5CFF",
              borderWidth: 1,
              height: 36,
              borderRadius: 18,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 5,
              flexShrink: 0,
            }}
            onPress={handleGenerateBrackets}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                fixtures.length > 0
                  ? "refresh-outline"
                  : "calendar-outline"
              }
              size={14}
              color={fixtures.length > 0 ? "#00D2FF" : "#FFF"}
            />
            <Text
              style={{
                color: fixtures.length > 0 ? "#00D2FF" : "#FFF",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {fixtures.length > 0 ? "Regenerate" : "Generate"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {fixtures.length === 0 ? (
        <View style={styles.emptyTabBox}>
          <Text style={styles.emptyTabText}>No matches generated yet.</Text>
        </View>
      ) : (
        fixtures.map((item, index) => {
          const homeTeamObj = getTeamObj(item.home_team_id);
          const awayTeamObj = getTeamObj(item.away_team_id);

          return (
            <View key={index} style={styles.fixtureCard}>
              <View style={styles.fixtureHeader}>
                <Text style={styles.fixtureRound}>
                  Match {index + 1} ({item.match_type || "SINGLES"})
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      borderColor: (statusColors[item.status] || "#FFF") + "40",
                      backgroundColor:
                        (statusColors[item.status] || "#FFF") + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColors[item.status] || "#FFF" },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={[styles.teamsRow, { alignItems: "center", justifyContent: "space-between" }]}>
                {/* Home Team */}
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <Text
                    style={[
                      styles.teamNameText,
                      item.winner_team_id === item.home_team_id && styles.winnerBold,
                      { textAlign: "right" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.home_team_name || "TBD"}
                  </Text>
                  <TeamAvatar
                    team={homeTeamObj}
                    size={28}
                    fallbackText={item.home_team_name}
                  />
                </View>

                <Text style={[styles.vsText, { marginHorizontal: 10 }]}>VS</Text>

                {/* Away Team */}
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-start" }}>
                  <TeamAvatar
                    team={awayTeamObj}
                    size={28}
                    fallbackText={item.away_team_name}
                  />
                  <Text
                    style={[
                      styles.teamNameText,
                      item.winner_team_id === item.away_team_id && styles.winnerBold,
                      { textAlign: "left" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.away_team_name || "TBD"}
                  </Text>
                </View>
              </View>

              <Text style={styles.fixtureDate}>
                {item.scheduled_at
                  ? new Date(item.scheduled_at).toLocaleString()
                  : "Date TBD"}
              </Text>

              <View style={styles.fixtureActions}>
                {item.status !== "COMPLETED" && (
                  <TouchableOpacity
                    style={styles.liveScoreBtn}
                    onPress={() => {
                      const isTbd =
                        !item.home_team_id ||
                        !item.away_team_id ||
                        item.home_team_name === "TBD" ||
                        item.away_team_name === "TBD" ||
                        item.is_bye === true ||
                        item.is_bye === 1;

                      if (isTbd) {
                        showMessage({
                          message: "Cannot start match: Opponents are not yet decided (TBD)",
                          type: "warning",
                        });
                        return;
                      }

                      if (item.status === "SCHEDULED") {
                        setLineupModalMatch(item);
                      } else {
                        navigation.navigate("LiveScoring", {
                          matchId: item.id,
                          canScore: true,
                        });
                      }
                    }}
                  >
                    <Text style={styles.liveScoreBtnText}>
                      {item.status === "SCHEDULED" ? "Start Match" : "Live Scoring"}
                    </Text>
                  </TouchableOpacity>
                )}

                {item.status !== "COMPLETED" && (
                  <TouchableOpacity
                    style={styles.overrideBtn}
                    onPress={() => handleAdminCompleteMatch(item.id)}
                  >
                    <Text style={styles.overrideBtnText}>Admin Complete</Text>
                  </TouchableOpacity>
                )}

                {isOrganizer && item.status === "SCHEDULED" && (
                  <TouchableOpacity
                    style={[
                      styles.overrideBtn,
                      {
                        backgroundColor: "rgba(239,68,68,0.1)",
                        borderColor: "rgba(239,68,68,0.3)",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleDeleteMatch(item.id)}
                  >
                    <Text style={[styles.overrideBtnText, { color: "#EF4444" }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {isOrganizer && participants.length >= 2 && (
        <View
          style={{
            marginTop: 24,
            marginBottom: 20,
            backgroundColor: "#161325",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "rgba(108, 77, 246, 0.35)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "800", marginBottom: 12 }}>
            Add Match Manually
          </Text>

          <Text style={{ color: "#D1D5DB", fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
            Select Home Team
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {participants.map((p) => {
              const id = p.team_id || p.id;
              const name = p.team_name || p.name || `Team ${id}`;
              const isSelected = selectedHomeId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: isSelected
                      ? "#6C4DF6"
                      : "rgba(255, 255, 255, 0.06)",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "#00D2FF"
                      : "rgba(255, 255, 255, 0.12)",
                  }}
                  onPress={() => setSelectedHomeId(id)}
                  activeOpacity={0.8}
                >
                  <TeamAvatar team={p} size={22} style={{ marginRight: 6 }} />
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#D1D5DB",
                      fontSize: 13,
                      fontWeight: isSelected ? "800" : "600",
                    }}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={{ color: "#D1D5DB", fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
            Select Away Team
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {participants.map((p) => {
              const id = p.team_id || p.id;
              const name = p.team_name || p.name || `Team ${id}`;
              const isSelected = selectedAwayId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: isSelected
                      ? "#6C4DF6"
                      : "rgba(255, 255, 255, 0.06)",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "#00D2FF"
                      : "rgba(255, 255, 255, 0.12)",
                  }}
                  onPress={() => setSelectedAwayId(id)}
                  activeOpacity={0.8}
                >
                  <TeamAvatar team={p} size={22} style={{ marginRight: 6 }} />
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#D1D5DB",
                      fontSize: 13,
                      fontWeight: isSelected ? "800" : "600",
                    }}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={{ color: "#D1D5DB", fontSize: 13, fontWeight: "700", marginBottom: 6 }}>
            Match Date & Time (YYYY-MM-DD HH:MM)
          </Text>
          <TextInput
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              color: "#FFFFFF",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              fontWeight: "600",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
              marginBottom: 16,
            }}
            value={manualMatchDate}
            onChangeText={setManualMatchDate}
            placeholder="2026-08-25 14:00"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={{
              height: 48,
              backgroundColor: "#6C4DF6",
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleCreateManualMatch}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "800" }}>
                Create Match
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* START MATCH LINEUP & PLAYERS SELECTION MODAL */}
      <StartMatchLineupModal
        visible={Boolean(lineupModalMatch)}
        match={lineupModalMatch}
        onClose={() => setLineupModalMatch(null)}
        onConfirmStart={(matchId, matchType, homePlayerIds, awayPlayerIds) => {
          setLineupModalMatch(null);
          navigation.navigate("LiveScoring", {
            matchId,
            canScore: true,
          });
        }}
      />
    </ScrollView>
  );
};

export default TournamentFixturesTab;
