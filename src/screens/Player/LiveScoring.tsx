import React, { useEffect, useState, useMemo } from "react";
import { storage } from "../../services/mmkv";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import FloatingOrbs from "../../Components/atoms/FloatingOrbs";
import { showMessage } from "react-native-flash-message";
import { useMatchSocket } from "../../hooks/useMatchSocket";
import {
  fetchMatchControllerStartMatch,
  fetchTournamentControllerGetTournament,
} from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";
import JoinRequestsModal from "../../Components/JoinRequestsModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LiveScoringScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const { matchId } = (route.params || {}) as { matchId: number };

  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [tournamentEnded, setTournamentEnded] = useState(false);

  useEffect(() => {
    try {
      const stored = storage.getString("userProfile");
      if (stored) {
        const userObj = JSON.parse(stored);
        const resolvedId =
          userObj.user_id ?? userObj.id ?? userObj.userId ?? null;
        setUserId(resolvedId);
      }
      const role = storage.getString("userRole");
      setUserRole(role || "PLAYER");
    } catch (e) {
      console.log("Error parsing profile:", e);
    }
  }, []);

  if (!matchId) {
    showMessage({ message: "Invalid Match ID", type: "danger" });
    navigation.goBack();
    return null;
  }

  const {
    isConnected,
    matchState,
    error,
    syncing,
    scorePoint,
    undoLastAction,
    requestSync,
    clearError,
  } = useMatchSocket(matchId);

  // Trigger error display via flash messages
  useEffect(() => {
    if (error) {
      showMessage({
        message: error,
        type: "danger",
        duration: 3000,
      });
      clearError();
    }
  }, [error, clearError]);

  // Extract variables
  const match = matchState;
  const isCompleted = match?.status === "COMPLETED";

  const [startingMatchLoading, setStartingMatchLoading] = useState(false);
  const [completionModalDismissed, setCompletionModalDismissed] =
    useState(false);

  // Check if tournament has ended — placed here AFTER matchState is declared
  useEffect(() => {
    const tid = matchState?.tournamentId;
    if (!tid) return;
    fetchTournamentControllerGetTournament({ pathParams: { id: tid } })
      .then((tData: any) => {
        if (tData?.end_date) {
          const closingDate = new Date(tData.end_date);
          closingDate.setHours(23, 59, 59, 999);
          if (Date.now() > closingDate.getTime()) setTournamentEnded(true);
        }
      })
      .catch((err: any) =>
        console.log("Error loading tournament for scoring check:", err),
      );
  }, [matchState?.tournamentId]);

  const isMatchTbd = Boolean(
    match &&
    (!match.home_team_id ||
      !match.away_team_id ||
      match.home_team_name === "TBD" ||
      match.away_team_name === "TBD"),
  );

  // Check if current user is match organizer or team captain
  const isOrganizerOrCaptain = useMemo(() => {
    if (!match) return false;
    const isMatchOrganizer =
      userRole === "TOURNAMENT_ORGANIZER" ||
      userRole === "ORGANIZER" ||
      userRole === "ADMIN" ||
      userRole === "GROUND_OWNER" ||
      (userId &&
        Number((match as any)?.tournament?.organizer_id) === Number(userId)) ||
      (userId &&
        Number((match as any)?.tournament?.created_by) === Number(userId)) ||
      (userId && Number((match as any)?.organizer_id) === Number(userId)) ||
      (userId && Number((match as any)?.created_by) === Number(userId));

    const m = match as any;
    const isCaptain =
      userId &&
      (Number(m?.homeTeam?.captain_id) === Number(userId) ||
        Number(m?.homeTeam?.captainId) === Number(userId) ||
        Number(m?.awayTeam?.captain_id) === Number(userId) ||
        Number(m?.awayTeam?.captainId) === Number(userId) ||
        Number(m?.home_team?.captain_id) === Number(userId) ||
        Number(m?.home_team?.captainId) === Number(userId) ||
        Number(m?.away_team?.captain_id) === Number(userId) ||
        Number(m?.away_team?.captainId) === Number(userId));

    return Boolean(isMatchOrganizer || isCaptain);
  }, [match, userId, userRole]);

  // Determine if the user is authorized to perform scoring inputs
  const isAllowedToScore = (() => {
    if (tournamentEnded) return false;
    if (isMatchTbd) return false;
    if (route.params?.canScore !== undefined) {
      return Boolean(route.params.canScore) && !tournamentEnded;
    }
    if (!match) return false;

    // Check if current logged-in user is an assigned player in this match
    const isPlayerInMatch =
      match.homePlayers?.some(
        (p: any) =>
          (userId && Number(p.user_id) === Number(userId)) ||
          (userId && Number(p.id) === Number(userId)) ||
          (userId && Number(p.player_id) === Number(userId)),
      ) ||
      match.awayPlayers?.some(
        (p: any) =>
          (userId && Number(p.user_id) === Number(userId)) ||
          (userId && Number(p.id) === Number(userId)) ||
          (userId && Number(p.player_id) === Number(userId)),
      );

    return Boolean(isPlayerInMatch || isOrganizerOrCaptain);
  })();

  const handleStartMatchAction = async () => {
    if (isMatchTbd) {
      showMessage({
        message: "Cannot start match: Opponents are not yet decided (TBD)",
        type: "warning",
      });
      return;
    }
    try {
      setStartingMatchLoading(true);
      await fetchMatchControllerStartMatch({
        pathParams: { matchId },
      });
      showMessage({
        message: "Match is now LIVE!",
        type: "success",
      });
      requestSync();
    } catch (err: any) {
      console.log("Error starting match:", err);
      const isBadRequest = err?.statusCode === 400 || err?.status === 400 || err?.message === "Bad Request";
      showMessage({
        message: isBadRequest ? "Tournament has not started yet. Cannot start match." : (err?.message || "Failed to start match"),
        type: "danger",
      });
    } finally {
      setStartingMatchLoading(false);
    }
  };

  const handleSafeScorePoint = async (
    teamId: number,
    playerId?: number,
    type: "POINT" | "FAULT" = "POINT",
  ) => {
    if (isMatchTbd) {
      showMessage({
        message: "Cannot score: Opponents are not yet decided (TBD)",
        type: "warning",
      });
      return;
    }
    if (match?.status !== "LIVE") {
      try {
        setStartingMatchLoading(true);
        await fetchMatchControllerStartMatch({
          pathParams: { matchId },
        });
        showMessage({
          message: "Match started!",
          type: "success",
        });
        requestSync();
      } catch (err: any) {
        console.log("Error auto-starting match before score:", err);
      } finally {
        setStartingMatchLoading(false);
      }
    }
    scorePoint(teamId, playerId, type);
  };

  // Get player names
  const homePlayerNames =
    match?.homePlayers?.map(
      (p: any) => p.display_name || p.name || `Player ${p.id}`,
    ) || [];
  const awayPlayerNames =
    match?.awayPlayers?.map(
      (p: any) => p.display_name || p.name || `Player ${p.id}`,
    ) || [];

  const homeNames = homePlayerNames.join(" & ") || "Home Team";
  const awayNames = awayPlayerNames.join(" & ") || "Away Team";

  const homeTeamDisplayName =
    (match as any)?.home_team_name || (match as any)?.homeTeamName || homeNames;
  const awayTeamDisplayName =
    (match as any)?.away_team_name || (match as any)?.awayTeamName || awayNames;

  // Resolve player IDs for accurate rally attribution
  const homePlayerUserId =
    match?.homePlayers?.[0]?.user_id ??
    match?.homePlayers?.[0]?.userId ??
    match?.homePlayers?.[0]?.player_id ??
    match?.homePlayers?.[0]?.id ??
    undefined;

  const awayPlayerUserId =
    match?.awayPlayers?.[0]?.user_id ??
    match?.awayPlayers?.[0]?.userId ??
    match?.awayPlayers?.[0]?.player_id ??
    match?.awayPlayers?.[0]?.id ??
    undefined;

  // Active score calculation
  const periods = match?.periods || [];
  const currentPeriod = periods.find((p: any) => !p.ended_at) ||
    periods[periods.length - 1] || {
      home_score: 0,
      away_score: 0,
      period_number: 1,
    };

  const currentHomeScore = currentPeriod.home_score ?? 0;
  const currentAwayScore = currentPeriod.away_score ?? 0;

  // Games won count
  const homeGamesWon = periods.filter(
    (p: any) => p.winner_team_id && p.winner_team_id === match?.home_team_id,
  ).length;
  const awayGamesWon = periods.filter(
    (p: any) => p.winner_team_id && p.winner_team_id === match?.away_team_id,
  ).length;

  const isServingTeamHome = match?.servingTeamId === match?.home_team_id;
  const isServingTeamAway = match?.servingTeamId === match?.away_team_id;

  // Render player list inside court positions
  // In a standard Singles or Doubles court, players are stationed on Left or Right courts.
  // We determine position highlighting based on `servingTeamId` and `serverSide`
  const isHomeLeftHighlighted =
    isServingTeamHome && match?.serverSide === "LEFT";
  const isHomeRightHighlighted =
    isServingTeamHome && match?.serverSide === "RIGHT";
  const isAwayLeftHighlighted =
    isServingTeamAway && match?.serverSide === "LEFT";
  const isAwayRightHighlighted =
    isServingTeamAway && match?.serverSide === "RIGHT";

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

      <FloatingOrbs orb1Color="#FF6B35" orb2Color="#6C4DF6" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Authoritative Scoring</Text>
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? "#10B981" : "#EF4444" },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? "LIVE SYNC" : "OFFLINE"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={requestSync}
          activeOpacity={0.7}
        >
          <Ionicons name="sync" size={20} color="#6C4DF6" />
        </TouchableOpacity>
      </View>

      {tournamentEnded && (
        <View
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderColor: "rgba(239, 68, 68, 0.4)",
            borderWidth: 1,
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "700" }}>
            Scoring Disabled: Tournament Closed
          </Text>
        </View>
      )}

      {/* Syncing Overlay Loader */}
      {syncing && (
        <View style={styles.syncingOverlay}>
          <ActivityIndicator size="small" color="#6C4DF6" />
          <Text style={styles.syncingText}>Updating Server...</Text>
        </View>
      )}

      {/* Main Scoring Dashboard */}
      {!match ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6C4DF6" />
          <Text style={styles.loadingText}>Initializing socket session...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 40 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Set Games Score Header */}
            <View style={styles.gamesWinsCard}>
              <View style={styles.teamWinBox}>
                <Text style={styles.teamWinLabel} numberOfLines={1}>
                  {homeTeamDisplayName}
                </Text>
                <Text style={styles.gamesCount}>{homeGamesWon} Games</Text>
              </View>
              <View style={styles.vsBox}>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.gameNoBadge}>
                  <Text style={styles.gameNoText}>
                    Game {currentPeriod.period_number}
                  </Text>
                </View>
              </View>
              <View style={styles.teamWinBox}>
                <Text style={styles.teamWinLabel} numberOfLines={1}>
                  {awayTeamDisplayName}
                </Text>
                <Text style={styles.gamesCount}>{awayGamesWon} Games</Text>
              </View>
            </View>

            {/* Authoritative Live Scoreboard Card */}
            <View style={styles.scoreboardContainer}>
              {/* Home Score */}
              <View
                style={[
                  styles.scoreBox,
                  isServingTeamHome && styles.servingScoreBox,
                ]}
              >
                {isServingTeamHome && (
                  <View style={styles.serveBallBadge}>
                    <Text style={styles.serveBallText}>🎾 SERVE</Text>
                  </View>
                )}
                <Text style={styles.scoreText}>{currentHomeScore}</Text>
                <Text style={styles.scoreLabel} numberOfLines={1}>
                  {homeTeamDisplayName}
                </Text>
              </View>

              {/* Score Divider / Doubles Server Info */}
              <View style={styles.scoreDividerBox}>
                <Text style={styles.dashText}>—</Text>
                {match.matchType === "DOUBLES" && match.serverNumber && (
                  <View style={styles.serverNumberBadge}>
                    <Text style={styles.serverNumberText}>
                      Server {match.serverNumber}
                    </Text>
                  </View>
                )}
              </View>

              {/* Away Score */}
              <View
                style={[
                  styles.scoreBox,
                  isServingTeamAway && styles.servingScoreBox,
                ]}
              >
                {isServingTeamAway && (
                  <View style={styles.serveBallBadge}>
                    <Text style={styles.serveBallText}>🎾 SERVE</Text>
                  </View>
                )}
                <Text style={styles.scoreText}>{currentAwayScore}</Text>
                <Text style={styles.scoreLabel} numberOfLines={1}>
                  {awayTeamDisplayName}
                </Text>
              </View>
            </View>

            {/* VISUAL PICKLEBALL COURT */}
            <View style={styles.courtWrapper}>
              <Text style={styles.courtHeaderTitle}>
                Pickleball Court Layout
              </Text>

              <View style={styles.courtBorder}>
                {/* AWAY COURT (Top half) */}
                <View style={styles.courtHalf}>
                  <View
                    style={[
                      styles.courtQuadrant,
                      isAwayLeftHighlighted && styles.courtQuadrantActive,
                    ]}
                  >
                    <Text style={styles.courtQuadrantLabel} numberOfLines={1}>
                      {awayTeamDisplayName} Left
                    </Text>
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {awayPlayerNames[1] || awayTeamDisplayName}
                    </Text>
                    {isAwayLeftHighlighted && (
                      <Text style={styles.servingIndicator}>🎾 Serving</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.courtQuadrant,
                      isAwayRightHighlighted && styles.courtQuadrantActive,
                    ]}
                  >
                    <Text style={styles.courtQuadrantLabel} numberOfLines={1}>
                      {awayTeamDisplayName} Right
                    </Text>
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {awayPlayerNames[0] || awayTeamDisplayName}
                    </Text>
                    {isAwayRightHighlighted && (
                      <Text style={styles.servingIndicator}>🎾 Serving</Text>
                    )}
                  </View>
                </View>

                {/* THE KITCHEN (Non-Volley Zone in center) */}
                <View style={styles.kitchenZone}>
                  <Text style={styles.kitchenLabel}>THE KITCHEN (NVZ)</Text>
                  <View style={styles.netLine} />
                </View>

                {/* HOME COURT (Bottom half) */}
                <View style={styles.courtHalf}>
                  <View
                    style={[
                      styles.courtQuadrant,
                      isHomeLeftHighlighted && styles.courtQuadrantActive,
                    ]}
                  >
                    {isHomeLeftHighlighted && (
                      <Text style={styles.servingIndicator}>🎾 Serving</Text>
                    )}
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {homePlayerNames[1] || homeTeamDisplayName}
                    </Text>
                    <Text style={styles.courtQuadrantLabel} numberOfLines={1}>
                      {homeTeamDisplayName} Left
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.courtQuadrant,
                      isHomeRightHighlighted && styles.courtQuadrantActive,
                    ]}
                  >
                    {isHomeRightHighlighted && (
                      <Text style={styles.servingIndicator}>🎾 Serving</Text>
                    )}
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {homePlayerNames[0] || homeTeamDisplayName}
                    </Text>
                    <Text style={styles.courtQuadrantLabel} numberOfLines={1}>
                      {homeTeamDisplayName} Right
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <SizedBox height={10} />

            {/* TBD MATCH WARNING BANNER */}
            {isMatchTbd && (
              <View
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={32}
                  color="#F59E0B"
                  style={{ marginBottom: 6 }}
                />
                <Text
                  style={{
                    color: "#F59E0B",
                    fontSize: 16,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  Opponents Pending (TBD)
                </Text>
                <Text
                  style={{
                    color: "#D1D5DB",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 6,
                    lineHeight: 18,
                  }}
                >
                  This match fixture cannot be started yet because opponents
                  have not been determined. It will automatically unlock once
                  the preceding match finishes.
                </Text>
              </View>
            )}

            {/* Organizer Requests Management Card */}
            {isOrganizerOrCaptain && (
              <View style={[styles.controlsCard, { marginBottom: 16 }]}>
                <Text style={styles.controlsHeader}>Requests Management</Text>
                <TouchableOpacity
                  style={styles.viewRequestsBtn}
                  onPress={() => setShowRequestsModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people-outline" size={18} color="#FFF" />
                  <Text style={styles.viewRequestsBtnText}>
                    View Join Requests
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ACTION CONTROLS */}
            {isAllowedToScore ? (
              <View style={styles.controlsCard}>
                <Text style={styles.controlsHeader}>Score Management</Text>

                {/* Match Not Started Banner Action */}
                {match?.status !== "LIVE" && !isCompleted && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#10B981",
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                      marginBottom: 16,
                    }}
                    onPress={handleStartMatchAction}
                    disabled={startingMatchLoading}
                    activeOpacity={0.8}
                  >
                    {startingMatchLoading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="play-circle-outline"
                          size={20}
                          color="#FFF"
                        />
                        <Text
                          style={{
                            color: "#FFF",
                            fontSize: 15,
                            fontWeight: "800",
                          }}
                        >
                          Start Match (Make Live)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Scoring Rule Explanation Banner */}
                <View style={styles.scoringExplanationBanner}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#A78BFA"
                  />
                  <Text style={styles.scoringExplanationText}>
                    In official rules, only the team on{" "}
                    <Text style={{ color: "#00E676", fontWeight: "800" }}>
                      🎾 SERVE
                    </Text>{" "}
                    gains points. If receiving team wins a rally, serve switches
                    (
                    <Text style={{ color: "#F59E0B", fontWeight: "800" }}>
                      Side Out
                    </Text>
                    ).
                  </Text>
                </View>

                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={[styles.controlBtn, styles.homePointBtn]}
                    onPress={() =>
                      handleSafeScorePoint(
                        match.home_team_id!,
                        homePlayerUserId,
                        "POINT",
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.controlBtnIcon}>➕</Text>
                    <Text style={styles.controlBtnText} numberOfLines={1}>
                      Point {homeTeamDisplayName}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlBtn, styles.awayPointBtn]}
                    onPress={() =>
                      handleSafeScorePoint(
                        match.away_team_id!,
                        awayPlayerUserId,
                        "POINT",
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.controlBtnIcon}>➕</Text>
                    <Text style={styles.controlBtnText} numberOfLines={1}>
                      Point {awayTeamDisplayName}
                    </Text>
                  </TouchableOpacity>
                </View>

                <SizedBox height={12} />

                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={[styles.controlBtn, styles.faultBtn]}
                    onPress={() => {
                      const nonServingTeamId =
                        match.servingTeamId === match.home_team_id
                          ? match.away_team_id
                          : match.home_team_id;
                      const activePlayerUserId =
                        match.servingTeamId === match.home_team_id
                          ? homePlayerUserId
                          : awayPlayerUserId;
                      if (nonServingTeamId) {
                        handleSafeScorePoint(
                          nonServingTeamId,
                          activePlayerUserId || userId || undefined,
                          "FAULT",
                        );
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.controlBtnIcon}>❌</Text>
                    <Text style={styles.controlBtnText}>Fault / Sideout</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlBtn, styles.undoBtn]}
                    onPress={undoLastAction}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.controlBtnIcon}>↩️</Text>
                    <Text style={styles.controlBtnText}>Undo Last</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.spectatorCard}>
                <View style={styles.spectatorHeaderRow}>
                  <View style={styles.spectatorLiveBadge}>
                    <View style={styles.spectatorPulseDot} />
                    <Text style={styles.spectatorLiveText}>LIVE BROADCAST</Text>
                  </View>
                  <Text style={styles.spectatorSyncText}>
                    👁️ Spectator Mode
                  </Text>
                </View>

                <SizedBox height={16} />

                <Text style={styles.spectatorStatusTitle}>
                  {match.status === "LIVE"
                    ? "Match is active and in progress"
                    : "Waiting for match to start"}
                </Text>

                <View style={styles.spectatorInfoGrid}>
                  <View style={styles.spectatorInfoBox}>
                    <Text style={styles.spectatorInfoLabel}>Serving Team</Text>
                    <Text style={styles.spectatorInfoValue}>
                      {match.servingTeamId === match.home_team_id
                        ? "Home Team"
                        : match.servingTeamId === match.away_team_id
                          ? "Away Team"
                          : "None"}
                    </Text>
                  </View>

                  <View style={styles.spectatorInfoBox}>
                    <Text style={styles.spectatorInfoLabel}>Format</Text>
                    <Text style={styles.spectatorInfoValue}>
                      {match.matchType || "SINGLES"}
                    </Text>
                  </View>
                </View>

                {match.events && match.events.length > 0 && (
                  <View style={styles.latestActionBox}>
                    <Text style={styles.latestActionLabel}>Latest Action</Text>
                    <Text style={styles.latestActionText} numberOfLines={1}>
                      {(() => {
                        const lastEv = match.events[match.events.length - 1];
                        const isHome = lastEv.team_id === match.home_team_id;
                        return `${isHome ? "Home" : "Away"} scored ${lastEv.event_type || "POINT"}`;
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* EVENT FEED / LOG */}
            <View style={styles.feedBox}>
              <Text style={styles.feedHeader}>Scoring Event Log</Text>
              {match.events && match.events.length > 0 ? (
                match.events
                  .slice(-5)
                  .reverse()
                  .map((ev: any, idx: number) => {
                    const isHomeEvent = ev.team_id === match.home_team_id;
                    const teamName = isHomeEvent ? "Home" : "Away";
                    return (
                      <View key={ev.id || idx} style={styles.feedItem}>
                        <Text style={styles.feedItemText}>
                          🟢 {teamName} scored: {ev.event_type}
                        </Text>
                        <Text style={styles.feedItemTime}>
                          {new Date(ev.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </Text>
                      </View>
                    );
                  })
              ) : (
                <Text style={styles.emptyFeedText}>
                  No score events logged yet. Let the serving begin!
                </Text>
              )}
            </View>

            <SizedBox height={40} />
          </ScrollView>

          {/* CELEBRATORY COMPLETION OVERLAY */}
          {isCompleted && !completionModalDismissed && (
            <Modal
              transparent={true}
              visible={isCompleted && !completionModalDismissed}
              animationType="fade"
              onRequestClose={() => setCompletionModalDismissed(true)}
            >
              <View style={styles.completionOverlay}>
                <View style={styles.completionCard}>
                  <Text style={styles.congratsIcon}>🏆</Text>
                  <Text style={styles.congratsTitle}>Match Completed!</Text>
                  <Text style={styles.congratsSubtitle}>
                    Authoritative Final Score
                  </Text>

                  {(() => {
                    const isHWon = match.winner_team_id === match.home_team_id;
                    const isAWon = match.winner_team_id === match.away_team_id;
                    let hScore = homeGamesWon;
                    let aScore = awayGamesWon;
                    if (hScore === 0 && aScore === 0) {
                      if (isHWon) {
                        hScore = 1;
                        aScore = 0;
                      } else if (isAWon) {
                        aScore = 1;
                        hScore = 0;
                      }
                    }
                    return (
                      <View style={styles.completionScoreBox}>
                        <Text style={styles.completedTeamName}>
                          {homeNames}
                        </Text>
                        <Text style={styles.completedFinalScore}>
                          {hScore} - {aScore}
                        </Text>
                        <Text style={styles.completedTeamName}>
                          {awayNames}
                        </Text>
                      </View>
                    );
                  })()}

                  <Text style={styles.winnerText}>
                    Winner:{" "}
                    {match.winner_team_id === match.home_team_id
                      ? homeNames
                      : match.winner_team_id === match.away_team_id
                        ? awayNames
                        : "Match Concluded"}
                  </Text>

                  <SizedBox height={20} />

                  <View style={{ gap: 10, width: "100%" }}>
                    <TouchableOpacity
                      style={styles.closeOverlayBtn}
                      onPress={() => setCompletionModalDismissed(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeOverlayText}>
                        View Match Scorecard
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.closeOverlayBtn,
                        {
                          backgroundColor: "transparent",
                          borderColor: "rgba(255,255,255,0.2)",
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        navigation.goBack();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.closeOverlayText, { color: "#9CA3AF" }]}
                      >
                        Back to Match Center
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      )}

      <JoinRequestsModal
        visible={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        matchId={matchId}
        onRosterUpdated={() => {
          requestSync(); // Sync roster changes
        }}
      />
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
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  syncBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  syncingOverlay: {
    flexDirection: "row",
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  syncingText: {
    color: "#6C4DF6",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 14,
  },
  gamesWinsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  teamWinBox: {
    flex: 1,
    alignItems: "center",
  },
  teamWinLabel: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  gamesCount: {
    color: "#6C4DF6",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  vsBox: {
    alignItems: "center",
    marginHorizontal: 12,
  },
  vsText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "700",
  },
  gameNoBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  gameNoText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "700",
  },
  scoreboardContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 18,
    alignItems: "center",
    position: "relative",
  },
  servingScoreBox: {
    backgroundColor: "rgba(108, 77, 246, 0.08)",
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  serveBallBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: "#00E676",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serveBallText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0B0914",
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFF",
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 4,
    textTransform: "uppercase",
  },
  scoreDividerBox: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  dashText: {
    fontSize: 24,
    color: "#4B5563",
    fontWeight: "700",
  },
  serverNumberBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  serverNumberText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  // Visual Court Styles
  courtWrapper: {
    marginBottom: 20,
  },
  courtHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  courtBorder: {
    backgroundColor: "rgba(34, 197, 94, 0.05)",
    borderWidth: 3,
    borderColor: "#00E676",
    borderRadius: 12,
    padding: 6,
  },
  courtHalf: {
    flexDirection: "row",
    height: 100,
  },
  courtQuadrant: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
    margin: 3,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  courtQuadrantActive: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: "#00E676",
    borderWidth: 1.5,
  },
  courtQuadrantLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  courtPlayerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    marginVertical: 4,
    textAlign: "center",
    width: "90%",
  },
  servingIndicator: {
    fontSize: 9,
    color: "#00E676",
    fontWeight: "800",
  },
  kitchenZone: {
    height: 50,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    margin: 3,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  kitchenLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EF4444",
    letterSpacing: 1,
  },
  netLine: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFF",
    opacity: 0.6,
  },
  // Controls Styles
  controlsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  controlsHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  viewRequestsBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  viewRequestsBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  controlsRow: {
    flexDirection: "row",
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  homePointBtn: {
    backgroundColor: "#6C4DF6",
  },
  awayPointBtn: {
    backgroundColor: "#6C4DF6",
  },
  faultBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  undoBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  controlBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  // Event Feed Styles
  feedBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 16,
  },
  feedHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  feedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  feedItemText: {
    fontSize: 13,
    color: "#FFF",
  },
  feedItemTime: {
    fontSize: 11,
    color: "#4B5563",
  },
  emptyFeedText: {
    textAlign: "center",
    color: "#4B5563",
    paddingVertical: 10,
    fontSize: 13,
  },
  // Completion Modal Styles
  completionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  completionCard: {
    backgroundColor: "#0F0D1C",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    padding: 24,
    alignItems: "center",
  },
  congratsIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#00E676",
  },
  congratsSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  completionScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
    width: "100%",
    justifyContent: "space-between",
  },
  completedTeamName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    flex: 1,
    textAlign: "center",
  },
  completedFinalScore: {
    fontSize: 32,
    fontWeight: "900",
    color: "#6C4DF6",
    marginHorizontal: 12,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 20,
  },
  closeOverlayBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  closeOverlayText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  spectatorCard: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  spectatorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spectatorLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spectatorPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginRight: 6,
  },
  spectatorLiveText: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  spectatorSyncText: {
    color: "#00D2FF",
    fontSize: 10,
    fontWeight: "700",
  },
  spectatorStatusTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
  spectatorInfoGrid: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  spectatorInfoBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.01)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 10,
  },
  spectatorInfoLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
  },
  spectatorInfoValue: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  latestActionBox: {
    marginTop: 14,
    backgroundColor: "rgba(108, 77, 246, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  latestActionLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  latestActionText: {
    color: "#6C4DF6",
    fontSize: 12,
    fontWeight: "800",
  },
  scoringExplanationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(167, 139, 250, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  scoringExplanationText: {
    color: "#D1D5DB",
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});

export default LiveScoringScreen;
