import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
  fetchTournamentControllerApproveRegistration,
  fetchTournamentControllerCancelRegistration,
  fetchTournamentControllerUpdateSeeding,
  fetchTournamentControllerUpdateGroups,
  fetchTournamentControllerGenerateBrackets,
  fetchTournamentControllerAdminCompleteMatch,
  fetchMatchControllerCreateMatch,
  fetchMatchControllerDeleteMatch,
  fetchUploadControllerUploadFile,
} from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";
import TeamAvatar from "../../Components/Tournament/TeamAvatar";
import TournamentInfoTab from "../../Components/Tournament/TournamentInfoTab";
import TournamentParticipantsTab from "../../Components/Tournament/TournamentParticipantsTab";
import TournamentFixturesTab from "../../Components/Tournament/TournamentFixturesTab";
import TournamentStandingsTab from "../../Components/Tournament/TournamentStandingsTab";
import TournamentAnalyticsTab from "../../Components/Tournament/TournamentAnalyticsTab";

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
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
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
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
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
    backgroundColor: "#6C4DF6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addTeamBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
  addPlayerBox: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  addPlayerTitle: {
    color: "#00D2FF",
    fontSize: 13,
    fontWeight: "700",
  },
  captainBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  captainBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  doneBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

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
  const [newTeamShortName, setNewTeamShortName] = useState("");
  const [newTeamCity, setNewTeamCity] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [loadingUserTeams, setLoadingUserTeams] = useState(false);
  const [loadingTournamentTeams, setLoadingTournamentTeams] = useState(false);

  // Add Member & Individual Player modal states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<
    any | null
  >(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [individualPlayerName, setIndividualPlayerName] = useState("");

  // Custom Theme Confirmation & Prompt Modal States
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    visible: boolean;
    title: string;
    description: string;
    icon?: string;
    iconColor?: string;
    confirmText: string;
    confirmButtonColor?: string;
    cancelText?: string;
    isPrompt?: boolean;
    promptPlaceholder?: string;
    onConfirm: (promptValue?: string) => void;
  }>({
    visible: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    onConfirm: () => {},
  });
  const [confirmPromptInput, setConfirmPromptInput] = useState("");

  const combinedParticipants = useMemo(() => {
    const list = [...participants];
    const participantTeamIds = new Set(
      list.map((p: any) => String(p.team_id || p.id)),
    );

    tournamentTeams.forEach((t: any) => {
      const tId = String(t.id || t.teamId);
      if (!participantTeamIds.has(tId)) {
        list.push({
          id: t.id,
          team_id: t.id,
          team_name: t.teamName || t.name,
          short_name: t.shortName,
          city: t.city,
          description: t.description,
          logo: t.logo || t.image,
          captain_name: t.captainName,
          member_count: t.memberCount,
          team_size: t.teamSize,
          status: t.status || "REGISTERED",
        });
      }
    });
    return list;
  }, [participants, tournamentTeams]);

  const maxTeams = Number(
    tournament?.config?.maxTeams ||
      tournament?.max_teams ||
      tournament?.maxTeams ||
      0,
  );
  const registeredTeamsCount = Math.max(
    combinedParticipants.length,
    participants.length,
    tournamentTeams.length,
  );
  const isMaxTeamsReached = maxTeams > 0 && registeredTeamsCount >= maxTeams;
  const isIndividual = tournament?.config?.registrationType === "INDIVIDUAL";

  const isTournamentEnded = (() => {
    if (!tournament?.end_date) return false;
    const closingDate = new Date(tournament.end_date);
    closingDate.setHours(23, 59, 59, 999);
    return Date.now() > closingDate.getTime();
  })();

  const isTournamentStarted = (() => {
    if (!tournament?.start_date) return true;
    const startDate = new Date(tournament.start_date);
    startDate.setHours(0, 0, 0, 0);
    return Date.now() >= startDate.getTime();
  })();

  const handlePickTeamLogo = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showMessage({
          message: "Permission Required",
          description:
            "Permission to access media gallery is required to pick a team logo.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setNewTeamLogo(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Error picking team logo:", e);
    }
  };

  // Team Details & Player Management Modal states
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [selectedTeamForDetails, setSelectedTeamForDetails] =
    useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [newPlayerInput, setNewPlayerInput] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const [tData, pData, fData, sData, aData, teamsRes] = await Promise.all([
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
        stackApiFetch<any, any, any, any, any, any>({
          url: "/api/tournament/v1/{id}/teams",
          method: "GET",
          pathParams: { id: String(tournamentId) },
        }).catch(() => null) as Promise<any>,
      ]);

      if (teamsRes?.teams) setTournamentTeams(teamsRes.teams);

      if (tData) {
        setTournament(tData);
        // Check if current user is the organizer
        const storedProfile = storage.getString("userProfile");
        const storedRole = storage.getString("userRole") || "PLAYER";
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          setUserProfile(profile);
          const pId = profile.user_id ?? profile.id ?? profile.userId;
          const isCreatorOrOrg =
            Number(tData.organizer_id) === Number(pId) ||
            storedRole === "TOURNAMENT_ORGANIZER" ||
            storedRole === "ORGANIZER" ||
            storedRole === "ADMIN";
          setIsOrganizer(Boolean(isCreatorOrOrg));
        } else {
          setIsOrganizer(
            storedRole === "TOURNAMENT_ORGANIZER" ||
              storedRole === "ORGANIZER" ||
              storedRole === "ADMIN",
          );
        }
      }
      if (pData) {
        setParticipants(pData);
        // Pre-populate input states
        const initialSeeds: Record<number, string> = {};
        const initialGroups: Record<number, string> = {};
        pData.forEach((p: any) => {
          if (p.team_id) {
            initialSeeds[p.team_id] = p.seed ? p.seed.toString() : "";
            initialGroups[p.team_id] = p.group_name || "";
          }
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

  const safeErrorMessage = (err: any, defaultMsg: string): string => {
    if (!err) return defaultMsg;
    if (typeof err === "string") return err;
    if (typeof err.message === "string") return err.message;
    if (Array.isArray(err.message)) return err.message.join(", ");
    if (typeof err.error === "string") return err.error;
    if (typeof err.message === "object" && err.message !== null) {
      return JSON.stringify(err.message);
    }
    return defaultMsg;
  };

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

  const loadTeamMembers = async (teamId: number) => {
    try {
      setLoadingTeamMembers(true);
      const res = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/members",
        method: "GET",
        pathParams: { id: String(teamId) },
      });
      const list = Array.isArray(res) ? res : res?.members || res?.data || [];
      setTeamMembers(list);
    } catch (err: any) {
      console.log("Error loading team members:", err.message);
      setTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleOpenTeamDetails = (team: any) => {
    let tId = team.id || team.team_id;
    if (typeof tId === "object" && tId !== null) {
      tId = tId.teamId || tId.id;
    }
    const tName = team.name || team.team_name;
    if (tId) {
      setShowRegisterModal(false);
      navigation.navigate("TeamDetails", {
        teamId: Number(tId),
        teamName: tName,
      });
    }
  };

  const handleDeleteUserTeam = (teamId: number, teamName: string) => {
    setConfirmModalConfig({
      visible: true,
      title: "Delete Team",
      description: `Are you sure you want to delete or leave "${teamName}"?`,
      icon: "trash-outline",
      iconColor: "#EF4444",
      confirmText: "Delete",
      confirmButtonColor: "#EF4444",
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        try {
          setActionLoading(true);
          try {
            await stackApiFetch<any, any, any, any, any, any>({
              url: "/api/teams/v1/{id}",
              method: "DELETE",
              pathParams: { id: String(teamId) },
            });
          } catch (e) {
            await stackApiFetch<any, any, any, any, any, any>({
              url: "/api/teams/v1/{id}/members/me",
              method: "DELETE",
              pathParams: { id: String(teamId) },
            });
          }
          showMessage({
            message: "Team deleted / removed successfully",
            type: "success",
          });
          loadUserTeams();
        } catch (err: any) {
          showMessage({
            message: safeErrorMessage(err, "Failed to delete team"),
            type: "danger",
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDeleteTournament = () => {
    setConfirmModalConfig({
      visible: true,
      title: "Delete Tournament",
      description:
        "Are you sure you want to permanently delete this tournament? This action cannot be undone.",
      icon: "alert-circle-outline",
      iconColor: "#EF4444",
      confirmText: "Delete Tournament",
      confirmButtonColor: "#EF4444",
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        try {
          setActionLoading(true);
          await stackApiFetch<any, any, any, any, any, any>({
            url: "/api/tournament/v1/{id}",
            method: "DELETE",
            pathParams: { id: String(tournamentId) },
          });
          showMessage({
            message: "Tournament deleted successfully!",
            type: "success",
          });
          navigation.goBack();
        } catch (err: any) {
          showMessage({
            message: safeErrorMessage(err, "Failed to delete tournament"),
            type: "danger",
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Player Action: Register Team or Individual
  const handleRegisterTeam = () => {
    if (isTournamentEnded) {
      showMessage({
        message: "Registration Closed: The tournament has already ended.",
        type: "warning",
      });
      return;
    }
    if (isMaxTeamsReached) {
      showMessage({
        message: `Registration Closed: Maximum limit (${registeredTeamsCount}/${maxTeams}) reached for this tournament.`,
        type: "warning",
      });
      return;
    }
    if (isIndividual) {
      setIndividualPlayerName("");
      setShowAddPlayerModal(true);
      return;
    }
    setActiveRegTab("my");
    setNewTeamName("");
    setShowRegisterModal(true);
    loadUserTeams();
    loadTournamentTeams();
  };

  const registerMyTeam = async (teamIdInput: any) => {
    let targetId = teamIdInput;
    if (typeof targetId === "object" && targetId !== null) {
      targetId = targetId.teamId || targetId.id;
    }
    targetId = Number(targetId);

    if (isMaxTeamsReached) {
      showMessage({
        message: `Registration Closed: Maximum team limit (${maxTeams}) has been reached.`,
        type: "warning",
      });
      return;
    }
    try {
      setActionLoading(true);
      setShowRegisterModal(false);
      await stackApiFetch<any, any, any, any, any, any>({
        url: `/api/tournament/v1/${tournamentId}/register`,
        method: "POST",
        body: { teamId: targetId },
      });
      showMessage({
        message: "Team registered successfully!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Registration failed"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTeamAndRegister = async () => {
    if (isMaxTeamsReached) {
      showMessage({
        message: `Registration Closed: Maximum team limit (${maxTeams}) has been reached.`,
        type: "warning",
      });
      return;
    }
    if (!newTeamName.trim()) {
      showMessage({ message: "Please enter team name", type: "warning" });
      return;
    }
    try {
      setActionLoading(true);
      setShowRegisterModal(false);

      let logoUrlToSave = newTeamLogo;
      if (
        newTeamLogo &&
        (newTeamLogo.startsWith("file://") ||
          newTeamLogo.startsWith("content://") ||
          newTeamLogo.startsWith("ph://"))
      ) {
        try {
          const formData = new FormData();
          formData.append("file", {
            uri:
              Platform.OS === "android"
                ? newTeamLogo
                : newTeamLogo.replace("file://", ""),
            name: `team_logo_${Date.now()}.jpg`,
            type: "image/jpeg",
          } as any);

          const uploadRes: any = await fetchUploadControllerUploadFile({
            body: formData as any,
          });
          const result = uploadRes?.data || uploadRes?.result || uploadRes;
          const uploadedUrl =
            typeof result === "string"
              ? result
              : result?.url || result?.fileUrl || result?.path || result?.location;
          if (uploadedUrl) {
            logoUrlToSave = uploadedUrl;
          }
        } catch (uploadErr) {
          console.log("Error uploading team logo during team creation:", uploadErr);
        }
      }

      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/tournament/v1/{id}/teams",
        method: "POST",
        pathParams: { id: String(tournamentId) },
        body: {
          teamName: newTeamName.trim(),
          shortName: newTeamShortName.trim() || undefined,
          city: newTeamCity.trim() || undefined,
          description: newTeamDescription.trim() || undefined,
          logo: logoUrlToSave || undefined,
          sportId: tournament?.sport_id || 1,
          skipAutoAddMember: true,
        },
      });
      showMessage({
        message: "Team created and registered successfully!",
        type: "success",
      });
      setNewTeamName("");
      setNewTeamShortName("");
      setNewTeamCity("");
      setNewTeamDescription("");
      setNewTeamLogo("");
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Failed to create team"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareTeamInvite = async (team: any) => {
    const tName = team.team_name || team.name || "Team";
    const tId = team.team_id || team.id;
    try {
      await Share.share({
        message: `Join our team "${tName}" for tournament "${tournament?.name}" on PlayVerse!\nTeam ID / Code: ${tId}\nOpen PlayVerse app to join!`,
      });
    } catch (err) {
      console.log("Error sharing team invite:", err);
    }
  };

  const handleAddMemberToTeam = async () => {
    if (!selectedTeamForMember) {
      showMessage({ message: "Please select a team", type: "warning" });
      return;
    }
    const val = memberUserId.trim();
    if (!val) {
      showMessage({
        message: "Please enter Mobile Number",
        type: "warning",
      });
      return;
    }
    try {
      setActionLoading(true);
      const targetTeamId =
        selectedTeamForMember.team_id || selectedTeamForMember.id;
      const isShortId = !isNaN(Number(val)) && val.length <= 6;
      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/invitations",
        method: "POST",
        pathParams: { id: String(targetTeamId) },
        body: {
          phoneNumber: val,
          mobileNumber: val,
          userIdOrEmail: val,
          playerId: isShortId ? Number(val) : undefined,
        },
      });

      showMessage({ message: "Player invited successfully!", type: "success" });
      setShowAddMemberModal(false);
      setSelectedTeamForMember(null);
      setMemberUserId("");
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Failed to invite player"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddIndividualPlayer = async () => {
    try {
      setActionLoading(true);
      await stackApiFetch<any, any, any, any, any, any>({
        url: `/api/tournament/v1/${tournamentId}/register`,
        method: "POST",
        body: {
          playerName: individualPlayerName.trim() || undefined,
          userId: parseInt(individualPlayerName, 10) || undefined,
        },
      });
      showMessage({
        message: "Registered for tournament successfully!",
        type: "success",
      });
      setShowAddPlayerModal(false);
      setIndividualPlayerName("");
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Failed to register player"),
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
        message: safeErrorMessage(err, "Failed to join team"),
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
        message: safeErrorMessage(err, "Approval failed"),
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
        message: safeErrorMessage(err, "Cancellation failed"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoRandomizeSeedingAndGroups = async () => {
    if (combinedParticipants.length === 0) {
      showMessage({
        message: "No registered participants to randomize",
        type: "warning",
      });
      return;
    }
    try {
      setActionLoading(true);
      const shuffled = [...combinedParticipants].sort(
        () => Math.random() - 0.5,
      );
      const groupLetters = ["A", "B", "C", "D"];
      const newSeeds: { teamId: number; seed: number }[] = [];
      const newGroups: { teamId: number; groupName: string }[] = [];
      const newSeedsInput: Record<number, string> = {};
      const newGroupsInput: Record<number, string> = {};

      shuffled.forEach((p: any, idx: number) => {
        let tId = p.team_id || p.id;
        if (typeof tId === "object" && tId !== null) tId = tId.teamId || tId.id;
        tId = Number(tId);

        const seedNum = idx + 1;
        const groupLetter = groupLetters[idx % 2];

        newSeeds.push({ teamId: tId, seed: seedNum });
        newGroups.push({ teamId: tId, groupName: groupLetter });

        newSeedsInput[tId] = String(seedNum);
        newGroupsInput[tId] = groupLetter;
      });

      await fetchTournamentControllerUpdateSeeding({
        pathParams: { id: tournamentId },
        body: { seeds: newSeeds },
      });
      await fetchTournamentControllerUpdateGroups({
        pathParams: { id: tournamentId },
        body: { groups: newGroups },
      });

      setSeedsInput(newSeedsInput);
      setGroupsInput(newGroupsInput);

      showMessage({
        message: "Randomized seeds & groups assigned successfully!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Auto-assignment failed"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRanksAndGroups = async () => {
    try {
      setActionLoading(true);
      const seeds = Object.entries(seedsInput)
        .map(([teamId, val]) => ({
          teamId: parseInt(teamId, 10),
          seed: val ? parseInt(val, 10) : 0,
        }))
        .filter((item) => item.seed > 0 && !isNaN(item.teamId));

      const groups = Object.entries(groupsInput)
        .map(([teamId, val]) => ({
          teamId: parseInt(teamId, 10),
          groupName: val.trim(),
        }))
        .filter((item) => item.groupName !== "" && !isNaN(item.teamId));

      const promises = [];
      if (seeds.length > 0) {
        promises.push(
          fetchTournamentControllerUpdateSeeding({
            pathParams: { id: tournamentId },
            body: { seeds },
          }),
        );
      }
      if (groups.length > 0) {
        promises.push(
          fetchTournamentControllerUpdateGroups({
            pathParams: { id: tournamentId },
            body: { groups },
          }),
        );
      }

      if (promises.length === 0) {
        showMessage({
          message: "No rank or group changes to save",
          type: "info",
        });
        return;
      }

      await Promise.all(promises);
      showMessage({
        message: "Ranks & Groups saved successfully!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Failed to save ranks & groups"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const executeGenerateBrackets = async () => {
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
        message:
          fixtures.length > 0
            ? "Brackets & fixtures regenerated!"
            : "Brackets & fixtures generated!",
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      showMessage({
        message: safeErrorMessage(err, "Bracket generation failed"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBrackets = () => {
    if (fixtures.length > 0) {
      setConfirmModalConfig({
        visible: true,
        title: "Regenerate Match Fixtures",
        description:
          "Existing fixtures will be reset and recalculated to include all current participants. Do you want to continue?",
        icon: "refresh-circle-outline",
        iconColor: "#00D2FF",
        confirmText: "Regenerate",
        confirmButtonColor: "#6C4DF6",
        onConfirm: () => {
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
          executeGenerateBrackets();
        },
      });
    } else {
      executeGenerateBrackets();
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
      const homeCapId = Number(homeTeam?.captain_id || 1);
      const awayCapId = Number(awayTeam?.captain_id || 2);

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
        message: safeErrorMessage(err, "Failed to create manual match"),
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCompleteMatch = (matchId: number) => {
    setConfirmPromptInput("");
    setConfirmModalConfig({
      visible: true,
      title: "Complete Match (Admin)",
      description: "Enter Winner Team ID to force complete match:",
      icon: "trophy-outline",
      iconColor: "#F59E0B",
      confirmText: "Submit Override",
      confirmButtonColor: "#6C4DF6",
      isPrompt: true,
      promptPlaceholder: "Winner Team ID (e.g. 5)",
      onConfirm: async (textVal?: string) => {
        const winTeamId = parseInt(textVal || "", 10);
        if (isNaN(winTeamId)) {
          showMessage({ message: "Invalid Team ID", type: "danger" });
          return;
        }
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
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
            message: safeErrorMessage(err, "Match completion override failed"),
            type: "danger",
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDeleteMatch = (matchId: number) => {
    setConfirmModalConfig({
      visible: true,
      title: "Delete Match",
      description:
        "Are you sure you want to delete this match from the tournament?",
      icon: "trash-outline",
      iconColor: "#EF4444",
      confirmText: "Delete Match",
      confirmButtonColor: "#EF4444",
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        try {
          setActionLoading(true);
          await fetchMatchControllerDeleteMatch({
            pathParams: { matchId },
          });
          showMessage({
            message: "Match deleted successfully",
            type: "success",
          });
          loadAllData();
        } catch (err: any) {
          showMessage({
            message: safeErrorMessage(err, "Failed to delete match"),
            type: "danger",
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
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

  const renderInfoTab = () => (
    <TournamentInfoTab
      tournament={tournament}
      insets={insets}
      isOrganizer={isOrganizer}
      isMaxTeamsReached={isMaxTeamsReached}
      registeredTeamsCount={registeredTeamsCount}
      maxTeams={maxTeams}
      isIndividual={isIndividual}
      handleRegisterTeam={handleRegisterTeam}
      handleDeleteTournament={handleDeleteTournament}
      isTournamentEnded={isTournamentEnded}
      isTournamentStarted={isTournamentStarted}
      styles={styles}
    />
  );

  const renderParticipantsTab = () => (
    <TournamentParticipantsTab
      tournament={tournament}
      insets={insets}
      isIndividual={isIndividual}
      isOrganizer={isOrganizer}
      isMaxTeamsReached={isMaxTeamsReached}
      handleRegisterTeam={handleRegisterTeam}
      combinedParticipants={combinedParticipants}
      tournamentTeams={tournamentTeams}
      handleOpenTeamDetails={handleOpenTeamDetails}
      userProfile={userProfile}
      handleJoinTeam={handleJoinTeam}
      handleApproveTeam={handleApproveTeam}
      setSelectedTeamForMember={setSelectedTeamForMember}
      setShowAddMemberModal={setShowAddMemberModal}
      handleShareTeamInvite={handleShareTeamInvite}
      handleCancelTeam={handleCancelTeam}
      seedsInput={seedsInput}
      groupsInput={groupsInput}
      setSeedsInput={setSeedsInput}
      setGroupsInput={setGroupsInput}
      handleSaveRanksAndGroups={handleSaveRanksAndGroups}
      handleAutoRandomizeSeedingAndGroups={handleAutoRandomizeSeedingAndGroups}
      isTournamentEnded={isTournamentEnded}
      actionLoading={actionLoading}
      styles={styles}
    />
  );

  const renderFixturesTab = () => (
    <TournamentFixturesTab
      fixtures={fixtures}
      participants={participants}
      tournamentTeams={tournamentTeams}
      insets={insets}
      isOrganizer={isOrganizer}
      handleGenerateBrackets={handleGenerateBrackets}
      statusColors={statusColors}
      navigation={navigation}
      handleAdminCompleteMatch={handleAdminCompleteMatch}
      handleDeleteMatch={handleDeleteMatch}
      selectedHomeId={selectedHomeId}
      setSelectedHomeId={setSelectedHomeId}
      selectedAwayId={selectedAwayId}
      setSelectedAwayId={setSelectedAwayId}
      manualMatchDate={manualMatchDate}
      setManualMatchDate={setManualMatchDate}
      handleCreateManualMatch={handleCreateManualMatch}
      isTournamentEnded={isTournamentEnded}
      isTournamentStarted={isTournamentStarted}
      actionLoading={actionLoading}
      styles={styles}
    />
  );

  const renderStandingsTab = () => (
    <TournamentStandingsTab
      standings={standings}
      tournamentTeams={tournamentTeams}
      participants={participants}
      insets={insets}
      styles={styles}
    />
  );

  const renderAnalyticsTab = () => (
    <TournamentAnalyticsTab
      analytics={analytics}
      insets={insets}
      styles={styles}
    />
  );

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

      {/* Add Member To Team Modal */}
      <Modal visible={showAddMemberModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Player to Team</Text>
            <Text style={styles.modalSubTitle}>
              {selectedTeamForMember
                ? `Target Team: ${selectedTeamForMember.team_name || selectedTeamForMember.name}`
                : "Select a team below:"}
            </Text>

            {!selectedTeamForMember && (
              <ScrollView
                style={{ maxHeight: 160, marginVertical: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {combinedParticipants.map((team) => (
                  <TouchableOpacity
                    key={team.team_id || team.id}
                    style={styles.modalItem}
                    onPress={() => setSelectedTeamForMember(team)}
                  >
                    <Text style={styles.modalItemText}>
                      {team.team_name || team.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Mobile Number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={memberUserId}
              onChangeText={setMemberUserId}
            />

            <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnSubmit,
                  { flex: 1, backgroundColor: "#6C4DF6", marginLeft: 0 },
                ]}
                onPress={handleAddMemberToTeam}
              >
                <Text style={[styles.modalSubmitText, { color: "#FFFFFF" }]}>
                  Add Player
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnCancel,
                  { flex: 1, marginRight: 0 },
                ]}
                onPress={() => {
                  setShowAddMemberModal(false);
                  setSelectedTeamForMember(null);
                  setMemberUserId("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Individual Player Modal */}
      <Modal visible={showAddPlayerModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              {
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 24,
                paddingBottom: Math.max(insets.bottom + 20, 24),
                paddingTop: 24,
              },
            ]}
          >
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(108, 77, 246, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(108, 77, 246, 0.4)",
                }}
              >
                <Ionicons name="person-add" size={24} color="#6C4DF6" />
              </View>
            </View>

            <Text
              style={[styles.modalTitle, { marginBottom: 6, fontSize: 18 }]}
            >
              Individual Player Registration
            </Text>
            <Text
              style={[
                styles.modalSubTitle,
                { marginBottom: 20, fontSize: 13, color: "#9CA3AF" },
              ]}
            >
              Register yourself or enter a player name for this tournament.
            </Text>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: "#9CA3AF",
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Player Name
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    height: 48,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderColor: "rgba(255, 255, 255, 0.12)",
                  },
                ]}
                placeholder="Enter player name "
                placeholderTextColor="#6B7280"
                value={individualPlayerName}
                onChangeText={setIndividualPlayerName}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    flex: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.12)",
                  },
                ]}
                onPress={() => {
                  setShowAddPlayerModal(false);
                  setIndividualPlayerName("");
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{ color: "#E5E7EB", fontSize: 15, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { flex: 1, backgroundColor: "#6C4DF6" },
                ]}
                onPress={handleAddIndividualPlayer}
                activeOpacity={0.8}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}
                >
                  Register Player
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Register Team Modal */}
      <Modal visible={showRegisterModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { height: "85%", maxHeight: "88%", paddingBottom: 24 },
            ]}
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
                    {userTeams.map((team) => {
                      let rawId = team.id || team.team_id;
                      if (typeof rawId === "object" && rawId !== null) {
                        rawId = rawId.teamId || rawId.id;
                      }
                      const teamIdNum = Number(rawId);
                      return (
                        <View
                          key={String(teamIdNum || Math.random())}
                          style={styles.teamRegisterItem}
                        >
                          <TeamAvatar team={team} size={34} style={{ marginRight: 10 }} />
                          <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => handleOpenTeamDetails(team)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Text style={styles.teamRegisterName}>
                                {team.name}
                              </Text>
                              {team.isCaptain && (
                                <View style={styles.captainBadge}>
                                  <Text style={styles.captainBadgeText}>
                                    👑 Captain
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.teamRegisterSub}>
                              {team.memberCount || team.members?.length || 1}{" "}
                              Members • Tap to manage
                            </Text>
                          </TouchableOpacity>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <TouchableOpacity
                              style={styles.teamRegisterActionBtn}
                              onPress={() => registerMyTeam(teamIdNum)}
                            >
                              <Text style={styles.teamRegisterActionText}>
                                Register
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.teamRegisterActionBtn,
                                {
                                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                                  borderWidth: 1,
                                  borderColor: "rgba(239, 68, 68, 0.3)",
                                  paddingHorizontal: 10,
                                },
                              ]}
                              onPress={() =>
                                handleDeleteUserTeam(teamIdNum, team.name)
                              }
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#EF4444"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {activeRegTab === "create" && (
              <ScrollView
                style={{ flex: 1, marginTop: 15 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalSubTitle}>
                  Create a team for this tournament (0 members initially). You
                  can add players manually or share a join link.
                </Text>

                {/* Team Logo Image Picker */}
                <View style={{ alignItems: "center", marginVertical: 12 }}>
                  <TouchableOpacity
                    onPress={handlePickTeamLogo}
                    activeOpacity={0.8}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: "#1F1B2E",
                      borderWidth: 2,
                      borderColor: "#6C4DF6",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {newTeamLogo ? (
                      <Image
                        source={{ uri: newTeamLogo }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <View style={{ alignItems: "center" }}>
                        <Ionicons
                          name="camera-outline"
                          size={24}
                          color="#6C4DF6"
                        />
                        <Text
                          style={{
                            color: "#9CA3AF",
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          Add Logo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Team Name (Required)"
                  placeholderTextColor="#9CA3AF"
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="Short Code (e.g. MUM)"
                    placeholderTextColor="#9CA3AF"
                    value={newTeamShortName}
                    onChangeText={setNewTeamShortName}
                    autoCapitalize="characters"
                    maxLength={5}
                  />
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="City (e.g. Mumbai)"
                    placeholderTextColor="#9CA3AF"
                    value={newTeamCity}
                    onChangeText={setNewTeamCity}
                  />
                </View>

                <TextInput
                  style={[
                    styles.modalInput,
                    { height: 70, textAlignVertical: "top" },
                  ]}
                  placeholder="Description / About Team"
                  placeholderTextColor="#9CA3AF"
                  value={newTeamDescription}
                  onChangeText={setNewTeamDescription}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    styles.modalBtnSubmit,
                    {
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      marginTop: 10,
                      marginBottom: 20,
                    },
                  ]}
                  onPress={handleCreateTeamAndRegister}
                >
                  <Text style={styles.modalSubmitText}>
                    Create & Register Team
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
                          <TeamAvatar team={team} size={34} style={{ marginRight: 10 }} />
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

      {/* PlayVerse Custom Theme Confirmation & Prompt Modal */}
      <Modal
        visible={confirmModalConfig.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }))
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.modalOverlay,
            { justifyContent: "center", paddingHorizontal: 20 },
          ]}
        >
          <View
            style={{
              backgroundColor: "#161325",
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(108, 77, 246, 0.35)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {confirmModalConfig.icon && (
              <View
                style={{
                  alignSelf: "center",
                  marginBottom: 14,
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor:
                    (confirmModalConfig.iconColor || "#6C4DF6") + "1F",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor:
                    (confirmModalConfig.iconColor || "#6C4DF6") + "35",
                }}
              >
                <Ionicons
                  name={confirmModalConfig.icon as any}
                  size={30}
                  color={confirmModalConfig.iconColor || "#6C4DF6"}
                />
              </View>
            )}
            <Text
              style={{
                color: "#FFF",
                fontSize: 18,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {confirmModalConfig.title}
            </Text>
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
                marginBottom: confirmModalConfig.isPrompt ? 16 : 24,
              }}
            >
              {confirmModalConfig.description}
            </Text>

            {confirmModalConfig.isPrompt && (
              <TextInput
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  color: "#FFF",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  marginBottom: 20,
                }}
                placeholder={
                  confirmModalConfig.promptPlaceholder || "Enter value..."
                }
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={confirmPromptInput}
                onChangeText={setConfirmPromptInput}
              />
            )}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() =>
                  setConfirmModalConfig((prev) => ({ ...prev, visible: false }))
                }
                activeOpacity={0.8}
              >
                <Text
                  style={{ color: "#E5E7EB", fontSize: 14, fontWeight: "700" }}
                >
                  {confirmModalConfig.cancelText || "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor:
                    confirmModalConfig.confirmButtonColor || "#6C4DF6",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
                onPress={() =>
                  confirmModalConfig.onConfirm(confirmPromptInput)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}
                  numberOfLines={1}
                >
                  {confirmModalConfig.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default TournamentDetailsScreen;

