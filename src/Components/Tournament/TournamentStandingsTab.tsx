import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import TeamAvatar from "./TeamAvatar";

interface TournamentStandingsTabProps {
  standings: any[];
  tournamentTeams: any[];
  participants: any[];
  insets: { bottom: number; top: number; left: number; right: number };
  styles: any;
}

export const TournamentStandingsTab: React.FC<TournamentStandingsTabProps> = ({
  standings,
  tournamentTeams,
  participants,
  insets,
  styles,
}) => {
  const getTeamObj = (item: any) => {
    const teamId = item.team_id || item.teamId || item.id;
    const fromParticipants = participants.find(
      (p) => String(p.team_id || p.id) === String(teamId)
    );
    const fromTeams = tournamentTeams.find(
      (t) => String(t.id || t.teamId) === String(teamId)
    );
    return fromParticipants || fromTeams || item;
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabScroll,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionHeader}>Tournament Standings</Text>

      {standings.length === 0 ? (
        <View style={styles.emptyTabBox}>
          <Text style={styles.emptyTabText}>No standings data available.</Text>
        </View>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCol, { flex: 0.8 }]}>Rank</Text>
            <Text style={[styles.tableCol, { flex: 3.5 }]}>Team</Text>
            <Text style={[styles.tableCol, { flex: 1 }]}>P</Text>
            <Text style={[styles.tableCol, { flex: 1 }]}>W</Text>
            <Text style={[styles.tableCol, { flex: 1 }]}>L</Text>
            <Text style={[styles.tableCol, { flex: 1 }]}>Pts</Text>
          </View>

          {standings.map((item: any, index: number) => {
            const teamObj = getTeamObj(item);
            const teamName = item.teamName || item.team_name || item.name || "Team";

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableText, { flex: 0.8 }]}>
                  {index + 1}
                </Text>
                <View style={{ flex: 3.5, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TeamAvatar
                    team={teamObj}
                    size={22}
                    fallbackText={teamName}
                  />
                  <Text
                    style={[styles.tableText, { flex: 1, fontWeight: "700" }]}
                    numberOfLines={1}
                  >
                    {teamName}
                  </Text>
                </View>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {item.played ?? item.p ?? 0}
                </Text>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {item.wins ?? item.w ?? 0}
                </Text>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {item.losses ?? item.l ?? 0}
                </Text>
                <Text
                  style={[
                    styles.tableText,
                    { flex: 1, color: "#00E676", fontWeight: "800" },
                  ]}
                >
                  {item.points ?? item.pts ?? 0}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

export default TournamentStandingsTab;
