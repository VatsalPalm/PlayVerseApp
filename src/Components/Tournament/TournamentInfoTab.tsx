import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SizedBox from "../atoms/SizeBox";

interface TournamentInfoTabProps {
  tournament: any;
  insets: { bottom: number; top: number; left: number; right: number };
  isOrganizer: boolean;
  isMaxTeamsReached: boolean;
  registeredTeamsCount: number;
  maxTeams: number;
  isIndividual: boolean;
  handleRegisterTeam: () => void;
  handleDeleteTournament: () => void;
  styles: any;
}

export const TournamentInfoTab: React.FC<TournamentInfoTabProps> = ({
  tournament,
  insets,
  isOrganizer,
  isMaxTeamsReached,
  registeredTeamsCount,
  maxTeams,
  isIndividual,
  handleRegisterTeam,
  handleDeleteTournament,
  styles,
}) => {
  if (!tournament) return null;

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: "#9CA3AF",
    UPCOMING: "#00D2FF",
    ONGOING: "#00E676",
    COMPLETED: "#A855F7",
    CANCELLED: "#EF4444",
  };
  const statusColor = STATUS_COLORS[tournament.status as string] || "#FFF";

  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabScroll,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroGlassHighlight} />
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: statusColor + "20",
                borderColor: statusColor + "50",
              },
            ]}
          >
            <View
              style={[styles.heroBadgeDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.heroBadgeText, { color: statusColor }]}>
              {tournament.status}
            </Text>
          </View>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: "rgba(108,77,246,0.15)",
                borderColor: "rgba(108,77,246,0.3)",
              },
            ]}
          >
            <Text style={[styles.heroBadgeText, { color: "#6C4DF6" }]}>
              {tournament.format}
            </Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{tournament.name}</Text>
        <Text style={styles.heroSubtitle}>
          Organised by {tournament.organizer_name || "System"}
        </Text>
      </View>

      <SizedBox height={16} />

      {/* Stats Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoGridCard}>
          <Text style={styles.infoGridIcon}>📅</Text>
          <Text style={styles.infoGridLabel}>Start Date</Text>
          <Text style={styles.infoGridVal}>
            {tournament.start_date
              ? new Date(tournament.start_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "TBD"}
          </Text>
        </View>
        <View style={styles.infoGridCard}>
          <Text style={styles.infoGridIcon}>🏁</Text>
          <Text style={styles.infoGridLabel}>End Date</Text>
          <Text style={styles.infoGridVal}>
            {tournament.end_date
              ? new Date(tournament.end_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "TBD"}
          </Text>
        </View>
        <View style={styles.infoGridCard}>
          <Text style={styles.infoGridIcon}>👥</Text>
          <Text style={styles.infoGridLabel}>Max Teams</Text>
          <Text style={styles.infoGridVal}>
            {tournament.config?.maxTeams || tournament.max_teams || 16}
          </Text>
        </View>
        <View style={styles.infoGridCard}>
          <Text style={styles.infoGridIcon}>🔒</Text>
          <Text style={styles.infoGridLabel}>Visibility</Text>
          <Text style={styles.infoGridVal}>
            {tournament.visibility || "PUBLIC"}
          </Text>
        </View>
      </View>

      <SizedBox height={16} />

      {/* Info rows */}
      {tournament.config?.registrationDeadline && (
        <View style={styles.infoRow}>
          <View style={styles.infoRowIcon}>
            <Text>⏰</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoRowLabel}>Registration Deadline</Text>
            <Text style={styles.infoRowVal}>
              {new Date(
                tournament.config.registrationDeadline
              ).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      )}

      <SizedBox height={8} />

      {!isOrganizer &&
        tournament.status === "UPCOMING" &&
        (isMaxTeamsReached ? (
          <View
            style={[
              styles.primaryBtn,
              {
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderColor: "#EF4444",
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={18}
              color="#EF4444"
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.primaryBtnText, { color: "#EF4444" }]}>
              Registration Full ({registeredTeamsCount}/{maxTeams} Teams)
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRegisterTeam}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>
              {isIndividual ? "Register as Individual" : "Register Your Team"}{" "}
              {maxTeams > 0 ? `(${registeredTeamsCount}/${maxTeams})` : ""}
            </Text>
          </TouchableOpacity>
        ))}

      {isOrganizer && (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: "#EF4444", marginTop: 12 },
          ]}
          onPress={handleDeleteTournament}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryBtnText, { color: "#FFF" }]}>
            Delete Tournament
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default TournamentInfoTab;
