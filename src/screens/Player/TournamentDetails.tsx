import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import FloatingOrbs from "../../Components/atoms/FloatingOrbs";
import { showMessage } from "react-native-flash-message";
import { HomeStackParamList } from "../../utils/types";
import { storage } from "../../services/mmkv";
import { stackApiFetch } from "../../stackApiFetcher";
import {
  fetchTournamentControllerGetTournament,
  fetchTournamentControllerGetParticipants,
  fetchTournamentControllerGetFixtures,
  fetchTournamentControllerGetStandings,
  fetchTournamentControllerGetAnalytics,
  fetchTournamentControllerRegisterTeam,
  fetchTournamentControllerApproveRegistration,
  fetchTournamentControllerCancelRegistration,
  fetchTournamentControllerUpdateSeeding,
  fetchTournamentControllerUpdateGroups,
  fetchTournamentControllerGenerateBrackets,
  fetchTournamentControllerAdminCompleteMatch,
  fetchMatchControllerCreateMatch,
  fetchMatchControllerDeleteMatch,
} from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";

const formatInputToIso = (dateStr: string): string => {
  const trimmed = dateStr.trim();
  if (trimmed.includes(" ")) {
    return trimmed.replace(" ", "T") + ":00.000Z";
  }
  return trimmed;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = ["Info", "Participants", "Fixtures", "Standings", "Analytics"];

const statusColors: Record<string, string> = {
  DRAFT: "#9CA3AF",
  UPCOMING: "#00D2FF",
  ONGOING: "#00E676",
  COMPLETED: "#A855F7",
  CANCELLED: "#EF4444",
};

const TournamentDetailsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { tournamentId } = (route.params || {}) as { tournamentId: number };

  const [activeTab, setActiveTab] = useState("Info");
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for Seeding & Groups editing
  const [seedsInput, setSeedsInput] = useState<Record<number, string>>({});
  const [groupsInput, setGroupsInput] = useState<Record<number, string>>({});

  // Bracket Generation form states
  const [groundId, setGroundId] = useState("1"); // Default ground
  const [startDate, setStartDate] = useState("2026-08-25 10:00");

  // Manual Match states
  const [showHomePicker, setShowHomePicker] = useState(false);
  const [showAwayPicker, setShowAwayPicker] = useState(false);
  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(null);
  const [selectedAwayId, setSelectedAwayId] = useState<number | null>(null);
  const [manualMatchDate, setManualMatchDate] = useState("2026-08-25 12:00");

  // Register Team Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeRegTab, setActiveRegTab] = useState<"my" | "create" | "join">(
    "my",
  );
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [loadingUserTeams, setLoadingUserTeams] = useState(false);
  const [loadingTournamentTeams, setLoadingTournamentTeams] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const [tData, pData, fData, sData, aData] = await Promise.all([
        fetchTournamentControllerGetTournament({
          pathParams: { id: tournamentId },
        }).catch(() => null) as Promise<any>,
        fetchTournamentControllerGetParticipants({
          pathParams: { id: tournamentId },
        }).catch(() => []) as Promise<any>,
        fetchTournamentControllerGetFixtures({
          pathParams: { id: tournamentId },
        }).catch(() => []) as Promise<any>,
        fetchTournamentControllerGetStandings({
          pathParams: { id: tournamentId },
        }).catch(() => []) as Promise<any>,
        fetchTournamentControllerGetAnalytics({
          pathParams: { id: tournamentId },
        }).catch(() => null) as Promise<any>,
      ]);

      if (tData) {
        setTournament(tData);
        // Check if current user is the organizer
        const storedProfile = storage.getString("userProfile");
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setUserProfile(profile);
          setIsOrganizer(tData.organizer_id === profile.id);
        }
      }
      if (pData) {
        setParticipants(pData);
        // Pre-populate input states
        const initialSeeds: Record<number, string> = {};
        const initialGroups: Record<number, string> = {};
        pData.forEach((p: any) => {
          initialSeeds[p.team_id] = p.seed ? p.seed.toString() : "";
          initialGroups[p.group_name] = p.group_name || "";
        });
        setSeedsInput(initialSeeds);
        setGroupsInput(initialGroups);
      }
      if (fData) setFixtures(fData);
      if (sData) setStandings(sData);
      if (aData) setAnalytics(aData);
    } catch (e) {
      console.log("Error loading tournament details:", e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData]),
  );

  // Fetch lists for registration modal
  const loadUserTeams = async () => {
    try {
      setLoadingUserTeams(true);
      const res = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/my-teams",
        method: "GET",
      });
      setUserTeams(res?.teams || []);
    } catch (err: any) {
      console.log("Error loading user teams:", err.message);
    } finally {
      setLoadingUserTeams(false);
    }
  };

  const loadTournamentTeams = async () => {
    try {
      setLoadingTournamentTeams(true);
      const res = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/tournament/v1/{id}/teams",
        method: "GET",
        pathParams: { id: String(tournamentId) },
      });
      setTournamentTeams(res?.teams || []);
    } catch (err: any) {
      console.log("Error loading tournament teams:", err.message);
    } finally {
      setLoadingTournamentTeams(false);
    }
  };

  const handleDeleteTournament = () => {
    Alert.alert(
      "Delete Tournament",
      "Are you sure you want to permanently delete this tournament? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await stackApiFetch<any, any, any, any, any, any>({
                url: "/api/tournament/v1/{id}",
                method: "DELETE",
                pathParams: { id: String(tournamentId) }
              });
              showMessage({
                message: "Tournament deleted successfully!",
                type: "success",
              });
              navigation.goBack();
            } catch (err: any) {
              showMessage({
                message: err.message || "Failed to delete tournament",
                type: "danger",
              });
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // Player Action: Register Team
  const handleRegisterTeam = () => {
    setActiveRegTab("my");
    setNewTeamName("");
    setShowRegisterModal(true);
    loadUserTeams();
    loadTournamentTeams();
  };

  const registerMyTeam = async (teamId: number) => {
    try {
      setActionLoading(true);
      setShowRegisterModal(false);
      await fetchTournamentControllerRegisterTeam({
        pathParams: { id: tournamentId },
        body: { teamId },
      });
      showMessage({
        message: "Team registered successfully!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Registration failed",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTeamAndRegister = async () => {
    if (!newTeamName.trim()) {
      showMessage({ message: "Please enter team name", type: "warning" });
      return;
    }
    try {
      setActionLoading(true);
      setShowRegisterModal(false);
      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/tournament/v1/{id}/teams",
        method: "POST",
        pathParams: { id: String(tournamentId) },
        body: { teamName: newTeamName.trim() },
      });
      showMessage({
        message: "Team created and registered successfully!",
        type: "success",
      });
      setNewTeamName("");
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to create team",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinTeam = async (teamId: number) => {
    try {
      setActionLoading(true);
      setShowRegisterModal(false);
      const res = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/join",
        method: "POST",
        pathParams: { id: String(teamId) },
      });
      showMessage({
        message: res?.message || "Joined team successfully!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to join team",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Organizer Actions
  const handleApproveTeam = async (teamId: number) => {
    try {
      setActionLoading(true);
      await fetchTournamentControllerApproveRegistration({
        pathParams: { id: tournamentId },
        body: { teamId },
      });
      showMessage({ message: "Registration approved", type: "success" });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Approval failed",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTeam = async (teamId: number) => {
    try {
      setActionLoading(true);
      await fetchTournamentControllerCancelRegistration({
        pathParams: { id: tournamentId },
        body: { teamId },
      });
      showMessage({ message: "Registration cancelled", type: "info" });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Cancellation failed",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSeeding = async () => {
    try {
      setActionLoading(true);
      const seeds = Object.entries(seedsInput)
        .map(([teamId, val]) => ({
          teamId: parseInt(teamId, 10),
          seed: val ? parseInt(val, 10) : 0,
        }))
        .filter((item) => item.seed > 0);

      await fetchTournamentControllerUpdateSeeding({
        pathParams: { id: tournamentId },
        body: { seeds },
      });
      showMessage({
        message: "Seeding updated successfully!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Seeding update failed",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveGroups = async () => {
    try {
      setActionLoading(true);
      const groups = Object.entries(groupsInput)
        .map(([teamId, val]) => ({
          teamId: parseInt(teamId, 10),
          groupName: val.trim(),
        }))
        .filter((item) => item.groupName !== "");

      await fetchTournamentControllerUpdateGroups({
        pathParams: { id: tournamentId },
        body: { groups },
      });
      showMessage({ message: "Groups updated successfully!", type: "success" });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Groups update failed",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBrackets = async () => {
    try {
      setActionLoading(true);
      await fetchTournamentControllerGenerateBrackets({
        pathParams: { id: tournamentId },
        body: {
          startDate: formatInputToIso(startDate),
          groundId: parseInt(groundId, 10) || 1,
          matchDurationMinutes: 60,
        },
      });
      showMessage({
        message: "Brackets & fixtures generated!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Bracket generation failed",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateManualMatch = async () => {
    if (!selectedHomeId || !selectedAwayId) {
      showMessage({
        message: "Please select both home and away teams",
        type: "warning",
      });
      return;
    }
    if (selectedHomeId === selectedAwayId) {
      showMessage({
        message: "Home and Away teams must be different",
        type: "warning",
      });
      return;
    }

    try {
      setActionLoading(true);

      const homeTeam = participants.find((p) => p.team_id === selectedHomeId);
      const awayTeam = participants.find((p) => p.team_id === selectedAwayId);
      const homeCapId = homeTeam?.captain_id || 1;
      const awayCapId = awayTeam?.captain_id || 2;

      await fetchMatchControllerCreateMatch({
        body: {
          sportId: tournament?.sport_id || 5,
          tournamentId: tournamentId,
          groundId: 1,
          homeTeamId: selectedHomeId,
          awayTeamId: selectedAwayId,
          homePlayerIds: [homeCapId],
          awayPlayerIds: [awayCapId],
          matchType: "SINGLES",
          scheduledAt: formatInputToIso(manualMatchDate),
        },
      } as any);

      showMessage({
        message: "Manual match created successfully!",
        type: "success",
      });
      setSelectedHomeId(null);
      setSelectedAwayId(null);
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to create manual match",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCompleteMatch = async (matchId: number) => {
    Alert.prompt(
      "Complete Match (Admin)",
      "Enter Winner Team ID to force complete match:",
      async (text) => {
        const winTeamId = parseInt(text, 10);
        if (isNaN(winTeamId)) {
          showMessage({ message: "Invalid Team ID", type: "danger" });
          return;
        }

        try {
          setActionLoading(true);
          await fetchTournamentControllerAdminCompleteMatch({
            pathParams: { id: tournamentId, matchId },
            body: { winnerTeamId: winTeamId },
          } as any);
          showMessage({ message: "Match override complete!", type: "success" });
          loadAllData();
        } catch (err: any) {
          showMessage({
            message: err.message || "Match completion override failed",
            type: "danger",
          });
        } finally {
          setActionLoading(false);
        }
      },
      "plain-text",
    );
  };

  const handleDeleteMatch = async (matchId: number) => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match from the tournament?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await fetchMatchControllerDeleteMatch({
                pathParams: { matchId },
              });
              showMessage({ message: "Match deleted successfully", type: "success" });
              loadAllData();
            } catch (err: any) {
              showMessage({
                message: err.message || "Failed to delete match",
                type: "danger",
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!tournament) return;
    try {
      await Share.share({
        message: `Join our tournament "${tournament.name}" on PlayVerse!\nFormat: ${tournament.format}\nStatus: ${tournament.status}\nStart Date: ${tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : "TBD"}\nLet the games begin!`,
      });
    } catch (error: any) {
      console.log("Error sharing:", error);
    }
  };

  const renderInfoTab = () => {
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
                  tournament.config.registrationDeadline,
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

        {!isOrganizer && tournament.status === "UPCOMING" && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRegisterTeam}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Register Your Team </Text>
          </TouchableOpacity>
        )}

        {isOrganizer && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#EF4444', marginTop: 12 }]}
            onPress={handleDeleteTournament}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryBtnText, { color: '#FFF' }]}>Delete Tournament</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const renderParticipantsTab = () => {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.tabScroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionHeader}>
            Registered Teams ({participants.length})
          </Text>
          {tournament.config?.registrationType === "TEAM" && tournament.status === "UPCOMING" && (
            <TouchableOpacity
              style={styles.addTeamBtn}
              onPress={handleRegisterTeam}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFF" />
              <Text style={styles.addTeamBtnText}>Register Team</Text>
            </TouchableOpacity>
          )}
        </View>

        {participants.length === 0 ? (
          <View style={styles.emptyTabBox}>
            <Text style={styles.emptyTabText}>No registered teams yet.</Text>
          </View>
        ) : (
          participants.map((item, index) => (
            <View key={index} style={styles.participantItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.participantName}>{item.team_name}</Text>
                <Text style={styles.participantDetails}>
                  {item.captain_name ? `Captain: ${item.captain_name} • ` : ""}
                  {item.member_count !== undefined ? `${item.member_count} Members • ` : ""}
                  Status: {item.status}{" "}
                  {item.seed ? `• Seed: ${item.seed}` : ""}{" "}
                  {item.group_name ? `• Group: ${item.group_name}` : ""}
                </Text>
              </View>

              {item.status === "PENDING" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.checkBtn}
                    onPress={() => handleApproveTeam(item.team_id)}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#00E676"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.checkBtn}
                    onPress={() => handleCancelTeam(item.team_id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        {participants.length > 0 && (
          <View style={styles.organizerTools}>
            <Text style={styles.toolsTitle}>
              Seeding & Groupings (Organizer Only)
            </Text>

            {participants.map((item, index) => (
              <View key={index} style={styles.seedRow}>
                <Text style={styles.seedTeamName} numberOfLines={1}>
                  {item.team_name}
                </Text>
                <TextInput
                  style={styles.seedInput}
                  placeholder="Seed"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={seedsInput[item.team_id] || ""}
                  onChangeText={(val) =>
                    setSeedsInput((prev) => ({ ...prev, [item.team_id]: val }))
                  }
                />
                <TextInput
                  style={styles.seedInput}
                  placeholder="Group"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                  value={groupsInput[item.team_id] || ""}
                  onChangeText={(val) =>
                    setGroupsInput((prev) => ({ ...prev, [item.team_id]: val }))
                  }
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={handleSaveSeeding}
              >
                <Text style={styles.primaryBtnText}>Save Seeds</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { flex: 1, backgroundColor: "#00D2FF" },
                ]}
                onPress={handleSaveGroups}
              >
                <Text style={styles.primaryBtnText}>Save Groups</Text>
              </TouchableOpacity>
            </View>

            <SizedBox height={20} />

            {/* Bracket Generation Card */}
            {fixtures.length === 0 && (
              <View style={styles.bracketGenCard}>
                <Text style={styles.toolsTitle}>
                  Generate Brackets & Matches
                </Text>
                <SizedBox height={10} />
                <Text style={styles.infoLabel}>Ground ID</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={groundId}
                  onChangeText={setGroundId}
                />
                <SizedBox height={10} />
                <Text style={styles.infoLabel}>Start Date (ISO)</Text>
                <TextInput
                  style={styles.formInput}
                  value={startDate}
                  onChangeText={setStartDate}
                />
                <SizedBox height={16} />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: "#A855F7" }]}
                  onPress={handleGenerateBrackets}
                >
                  <Text style={styles.primaryBtnText}>Generate Fixtures</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderFixturesTab = () => {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.tabScroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>
          Fixtures & Brackets ({fixtures.length})
        </Text>

        {fixtures.length === 0 ? (
          <View style={styles.emptyTabBox}>
            <Text style={styles.emptyTabText}>No matches generated yet.</Text>
          </View>
        ) : (
          fixtures.map((item, index) => (
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

              <View style={styles.teamsRow}>
                <Text
                  style={[
                    styles.teamNameText,
                    item.winner_team_id === item.home_team_id &&
                      styles.winnerBold,
                  ]}
                >
                  {item.home_team_name || "TBD"}
                </Text>
                <Text style={styles.vsText}>VS</Text>
                <Text
                  style={[
                    styles.teamNameText,
                    item.winner_team_id === item.away_team_id &&
                      styles.winnerBold,
                  ]}
                >
                  {item.away_team_name || "TBD"}
                </Text>
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
                    onPress={() =>
                      navigation.navigate("LiveScoring", {
                        matchId: item.id,
                        canScore: true,
                      })
                    }
                  >
                    <Text style={styles.liveScoreBtnText}>Live scoring</Text>
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
                    style={[styles.overrideBtn, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1 }]}
                    onPress={() => handleDeleteMatch(item.id)}
                  >
                    <Text style={[styles.overrideBtnText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {participants.length >= 2 && (
          <View
            style={[styles.bracketGenCard, { marginTop: 24, marginBottom: 20 }]}
          >
            <Text style={styles.toolsTitle}>Add Match Manually</Text>
            <SizedBox height={12} />

            <Text style={styles.infoLabel}>Home Team</Text>
            <TouchableOpacity
              style={styles.teamSelectBtn}
              onPress={() => setShowHomePicker(true)}
            >
              <Text style={styles.teamSelectBtnText}>
                {participants.find((p) => p.team_id === selectedHomeId)
                  ?.team_name || "Select Home Team"}
              </Text>
            </TouchableOpacity>

            <SizedBox height={12} />

            <Text style={styles.infoLabel}>Away Team</Text>
            <TouchableOpacity
              style={styles.teamSelectBtn}
              onPress={() => setShowAwayPicker(true)}
            >
              <Text style={styles.teamSelectBtnText}>
                {participants.find((p) => p.team_id === selectedAwayId)
                  ?.team_name || "Select Away Team"}
              </Text>
            </TouchableOpacity>

            <SizedBox height={12} />

            <Text style={styles.infoLabel}>
              Scheduled Date & Time (YYYY-MM-DD HH:mm)
            </Text>
            <TextInput
              style={styles.formInput}
              value={manualMatchDate}
              onChangeText={setManualMatchDate}
            />

            <SizedBox height={16} />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#6C4DF6" }]}
              onPress={handleCreateManualMatch}
            >
              <Text style={styles.primaryBtnText}>Add Match</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderStandingsTab = () => {
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
            <Text style={styles.emptyTabText}>
              No standings data available.
            </Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCol, { flex: 0.8 }]}>Rank</Text>
              <Text style={[styles.tableCol, { flex: 3 }]}>Team</Text>
              <Text style={[styles.tableCol, { flex: 1 }]}>P</Text>
              <Text style={[styles.tableCol, { flex: 1 }]}>W</Text>
              <Text style={[styles.tableCol, { flex: 1 }]}>L</Text>
              <Text style={[styles.tableCol, { flex: 1 }]}>Pts</Text>
            </View>

            {standings.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableText, { flex: 0.8 }]}>
                  {index + 1}
                </Text>
                <Text
                  style={[styles.tableText, { flex: 3, fontWeight: "700" }]}
                  numberOfLines={1}
                >
                  {item.teamName || "Team"}
                </Text>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {item.played}
                </Text>
                <Text style={[styles.tableText, { flex: 1 }]}>{item.wins}</Text>
                <Text style={[styles.tableText, { flex: 1 }]}>
                  {item.losses}
                </Text>
                <Text
                  style={[
                    styles.tableText,
                    { flex: 1, color: "#00E676", fontWeight: "800" },
                  ]}
                >
                  {item.points}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderAnalyticsTab = () => {
    if (!analytics) {
      return (
        <View style={styles.emptyTabBox}>
          <Text style={styles.emptyTabText}>No analytics available.</Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={[
          styles.tabScroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>Match Analytics</Text>

        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Total Matches</Text>
            <Text style={styles.analyticsVal}>
              {analytics.totalMatches || 0}
            </Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Completed Matches</Text>
            <Text style={styles.analyticsVal}>
              {analytics.completedMatches || 0}
            </Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Average Match Duration</Text>
            <Text style={styles.analyticsVal}>
              {analytics.avgDurationMinutes || 0} min
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
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

      <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#A855F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tournament?.name || "Tournament"}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity style={styles.syncBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#6C4DF6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.syncBtn} onPress={loadAllData}>
            <Ionicons name="refresh" size={20} color="#6C4DF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Loader */}
      {(loading || actionLoading) && (
        <View style={styles.syncingOverlay}>
          <ActivityIndicator size="small" color="#6C4DF6" />
          <Text style={styles.syncingText}>Loading...</Text>
        </View>
      )}

      {/* Main Content */}
      {tournament && (
        <View style={{ flex: 1 }}>
          {/* Tab Selector */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabItem, active && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab View Contents */}
          <View style={{ flex: 1 }}>
            {activeTab === "Info" && renderInfoTab()}
            {activeTab === "Participants" && renderParticipantsTab()}
            {activeTab === "Fixtures" && renderFixturesTab()}
            {activeTab === "Standings" && renderStandingsTab()}
            {activeTab === "Analytics" && renderAnalyticsTab()}
          </View>
        </View>
      )}
      {/* Home Team Modal Picker */}
      <Modal visible={showHomePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Home Team</Text>
            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {participants.map((p) => (
                <TouchableOpacity
                  key={p.team_id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedHomeId(p.team_id);
                    setShowHomePicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{p.team_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowHomePicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Away Team Modal Picker */}
      <Modal visible={showAwayPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Away Team</Text>
            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {participants.map((p) => (
                <TouchableOpacity
                  key={p.team_id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedAwayId(p.team_id);
                    setShowAwayPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{p.team_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAwayPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Register Team Modal */}
      <Modal visible={showRegisterModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[styles.modalContent, { minHeight: 400, paddingBottom: 20 }]}
          >
            <Text style={styles.modalTitle}>Tournament Registration</Text>

            {/* Tab selection */}
            <View style={styles.modalTabRow}>
              {[
                { id: "my", label: "My Teams" },
                { id: "create", label: "Create Team" },
                { id: "join", label: "Join Team" },
              ].map((tab) => {
                const active = activeRegTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.modalTabButton,
                      active && styles.modalTabButtonActive,
                    ]}
                    onPress={() => setActiveRegTab(tab.id as any)}
                  >
                    <Text
                      style={[
                        styles.modalTabButtonText,
                        active && styles.modalTabButtonTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TAB CONTENTS */}
            {activeRegTab === "my" && (
              <View style={{ flex: 1, marginTop: 15 }}>
                {loadingUserTeams ? (
                  <ActivityIndicator
                    size="small"
                    color="#00D2FF"
                    style={{ marginTop: 20 }}
                  />
                ) : userTeams.length === 0 ? (
                  <Text style={styles.modalNoDataText}>
                    You do not belong to any teams yet.
                  </Text>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {userTeams.map((team) => (
                      <View key={team.id} style={styles.teamRegisterItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teamRegisterName}>
                            {team.name}
                          </Text>
                          <Text style={styles.teamRegisterSub}>
                            {team.memberCount} Members • ID: {team.id}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.teamRegisterActionBtn}
                          onPress={() => registerMyTeam(team.id)}
                        >
                          <Text style={styles.teamRegisterActionText}>
                            Register
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {activeRegTab === "create" && (
              <View style={{ flex: 1, marginTop: 20 }}>
                <Text style={styles.modalSubTitle}>
                  Create a new team for this tournament. You will automatically
                  become the captain.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter Team Name"
                  placeholderTextColor="#9CA3AF"
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                />
                <TouchableOpacity
                  style={[
                    styles.modalBtnSubmit,
                    {
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      marginTop: 10,
                    },
                  ]}
                  onPress={handleCreateTeamAndRegister}
                >
                  <Text style={styles.modalSubmitText}>Create & Register</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeRegTab === "join" && (
              <View style={{ flex: 1, marginTop: 15 }}>
                {loadingTournamentTeams ? (
                  <ActivityIndicator
                    size="small"
                    color="#00D2FF"
                    style={{ marginTop: 20 }}
                  />
                ) : tournamentTeams.length === 0 ? (
                  <Text style={styles.modalNoDataText}>
                    No other teams have registered for this tournament yet.
                  </Text>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {tournamentTeams.map((team) => {
                      const isFull = team.status === "FULL";
                      return (
                        <View key={team.id} style={styles.teamRegisterItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.teamRegisterName}>
                              {team.teamName}
                            </Text>
                            <Text style={styles.teamRegisterSub}>
                              {team.memberCount} / {team.teamSize} Players • ID:{" "}
                              {team.id}
                            </Text>
                          </View>
                          {isFull ? (
                            <View
                              style={[
                                styles.teamRegisterActionBtn,
                                { backgroundColor: "rgba(255,255,255,0.05)" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.teamRegisterActionText,
                                  { color: "#9CA3AF" },
                                ]}
                              >
                                Full
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.teamRegisterActionBtn,
                                { backgroundColor: "#A78BFA" },
                              ]}
                              onPress={() => handleJoinTeam(team.id)}
                            >
                              <Text style={styles.teamRegisterActionText}>
                                Join
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.modalBtnCancel,
                {
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 20,
                },
              ]}
              onPress={() => setShowRegisterModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default TournamentDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0914",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  syncBtn: {
    padding: 4,
  },
  syncingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(108, 77, 246, 0.08)",
    paddingVertical: 8,
    gap: 8,
  },
  syncingText: {
    color: "#6C4DF6",
    fontSize: 12,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#6C4DF6",
  },
  tabText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FFF",
    fontWeight: "800",
  },
  tabScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  cardInfo: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 20,
  },
  heroBanner: {
    backgroundColor: "rgba(108, 77, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.2)",
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  heroGlassHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "rgba(108, 77, 246, 0.4)",
  },
  heroTopRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  heroSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 6,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoGridCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 14,
  },
  infoGridIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  infoGridLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  infoGridVal: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  infoRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(108,77,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoRowLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  infoRowVal: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  infoVal: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionHeader: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  participantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  participantName: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  participantDetails: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  checkBtn: {
    padding: 2,
  },
  emptyTabBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyTabText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  organizerTools: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  toolsTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  seedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  seedTeamName: {
    color: "#FFF",
    fontSize: 13,
    flex: 2,
  },
  seedInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    color: "#FFF",
    fontSize: 12,
    height: 36,
    textAlign: "center",
  },
  formInput: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    color: "#FFF",
    fontSize: 13,
    height: 44,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  bracketGenCard: {
    backgroundColor: "rgba(255,255,255,0.01)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 16,
    marginTop: 15,
  },
  fixtureCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  fixtureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  fixtureRound: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  teamsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  teamNameText: {
    color: "#9CA3AF",
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },
  winnerBold: {
    color: "#FFF",
    fontWeight: "800",
  },
  vsText: {
    color: "#6C4DF6",
    fontWeight: "900",
    fontSize: 12,
    marginHorizontal: 10,
  },
  fixtureDate: {
    color: "#6B7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
  fixtureActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingTop: 10,
  },
  liveScoreBtn: {
    backgroundColor: "#6C4DF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  liveScoreBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  overrideBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  overrideBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  tableCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 16,
  },
  tableRowHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableCol: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  tableText: {
    color: "#FFF",
    fontSize: 13,
    textAlign: "center",
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  analyticsLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  analyticsVal: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  teamSelectBtn: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  teamSelectBtnText: {
    color: "#FFF",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F0D1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "60%",
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  modalList: {
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  modalItemText: {
    color: "#FFF",
    fontSize: 14,
  },
  modalCloseBtn: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
  },
  modalCloseText: {
    color: "#FF3E3E",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSubTitle: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalBtnCancel: {
    backgroundColor: "rgba(255,255,255,0.02)",
    marginRight: 10,
  },
  modalBtnSubmit: {
    backgroundColor: "#00D2FF",
    marginLeft: 10,
  },
  modalCancelText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSubmitText: {
    color: "#0F0D1A",
    fontSize: 14,
    fontWeight: "700",
  },
  modalTabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  modalTabButtonActive: {
    backgroundColor: "#00D2FF",
  },
  modalTabButtonText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalTabButtonTextActive: {
    color: "#0F0D1A",
  },
  modalNoDataText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 30,
    fontStyle: "italic",
  },
  teamRegisterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 10,
  },
  teamRegisterName: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  teamRegisterSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  teamRegisterActionBtn: {
    backgroundColor: "#00D2FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  teamRegisterActionText: {
    color: "#0F0D1A",
    fontSize: 13,
    fontWeight: "800",
  },
  addTeamBtn: {
    backgroundColor: '#6C4DF6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addTeamBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
