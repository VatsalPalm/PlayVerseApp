import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { storage } from '../../services/mmkv';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import FloatingOrbs from '../../Components/atoms/FloatingOrbs';
import { showMessage } from 'react-native-flash-message';
import {
  useMatchControllerGetMatchHistory,
  useMatchControllerStartMatch,
  useMatchControllerDeleteMatch,
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';
import TeamAvatar from '../../Components/Tournament/TeamAvatar';
import StartMatchLineupModal from '../../Components/Match/StartMatchLineupModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['LIVE', 'COMPLETED', 'SCHEDULED'];

const statusColor: Record<string, string> = {
  SCHEDULED: '#F59E0B',
  LIVE: '#10B981',
  COMPLETED: '#6C4DF6',
  CANCELLED: '#EF4444',
};

const statusBg: Record<string, string> = {
  SCHEDULED: 'rgba(245,158,11,0.12)',
  LIVE: 'rgba(16,185,129,0.12)',
  COMPLETED: 'rgba(108,77,246,0.12)',
  CANCELLED: 'rgba(239,68,68,0.12)',
};

/** Format date string -> "Tue, 25 Aug 2026" */
const formatDate = (raw: string): string => {
  if (!raw) return '—';
  const date = new Date(raw);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/** Format time string -> "6:00 PM" */
const formatTime = (raw: string): string => {
  if (!raw) return '';
  const date = new Date(raw);
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

const MatchHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState('LIVE');
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<any | null>(null);
  const [lineupModalMatch, setLineupModalMatch] = useState<any | null>(null);

  useEffect(() => {
    try {
      const stored = storage.getString('userProfile');
      if (stored) {
        const userObj = JSON.parse(stored);
        const resolvedId = userObj.user_id ?? userObj.id ?? userObj.userId ?? null;
        setUserId(resolvedId);
      }
    } catch (e) {
      console.log('Error reading userProfile:', e);
    }
  }, []);

  // Queries
  const queryParams: any = { limit: 100, status: activeTab };

  const { data: historyResponse, isLoading, refetch } = useMatchControllerGetMatchHistory<any>({
    queryParams,
  });

  const startMatchMutation = useMatchControllerStartMatch();
  const deleteMatchMutation = useMatchControllerDeleteMatch();

  // Refetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch, activeTab])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleStartMatch = (matchId: number) => {
    console.log('Starting match:', matchId);
    startMatchMutation.mutate(
      { pathParams: { matchId } },
      {
        onSuccess: () => {
          showMessage({
            message: 'Match is now LIVE!',
            type: 'success',
          });
          refetch();
          // Navigate directly to live scoring
          navigation.navigate('LiveScoring', { matchId });
        },
        onError: (err: any) => {
          showMessage({
            message: err?.message || 'Failed to start match',
            type: 'danger',
          });
        },
      }
    );
  };

  const handleDeleteMatch = (matchId: number) => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this scheduled match?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMatchMutation.mutate(
              { pathParams: { matchId } },
              {
                onSuccess: () => {
                  showMessage({
                    message: "Match deleted successfully",
                    type: "success",
                  });
                  refetch();
                },
                onError: (err: any) => {
                  showMessage({
                    message: err?.message || "Failed to delete match",
                    type: "danger",
                  });
                },
              }
            );
          },
        },
      ]
    );
  };

  const renderMatchCard = ({ item }: { item: any }) => {
    // Get team names
    const homePlayerNames = item.homePlayers?.map((p: any) => p.display_name || p.name).filter(Boolean).join(' & ');
    const awayPlayerNames = item.awayPlayers?.map((p: any) => p.display_name || p.name).filter(Boolean).join(' & ');

    const homeTeamDisplayName = item.home_team_name || item.homeTeamName || homePlayerNames || 'Home Team';
    const awayTeamDisplayName = item.away_team_name || item.awayTeamName || awayPlayerNames || 'Away Team';

    const isLive = item.status === 'LIVE';
    const isCompleted = item.status === 'COMPLETED';
    const isScheduled = item.status === 'SCHEDULED';

    // Calculate score details if completed or live
    const periods = item.periods || [];
    const homeTeamId = item.home_team_id || item.homeTeamId;
    const awayTeamId = item.away_team_id || item.awayTeamId;

    const homeGamesWon = periods.filter(
      (p: any) =>
        (p.winner_team_id || p.winnerTeamId) &&
        Number(p.winner_team_id || p.winnerTeamId) === Number(homeTeamId)
    ).length;
    const awayGamesWon = periods.filter(
      (p: any) =>
        (p.winner_team_id || p.winnerTeamId) &&
        Number(p.winner_team_id || p.winnerTeamId) === Number(awayTeamId)
    ).length;

    const totalHomePoints = periods.reduce(
      (sum: number, p: any) => sum + (p.home_score ?? p.homeScore ?? 0),
      0
    );
    const totalAwayPoints = periods.reduce(
      (sum: number, p: any) => sum + (p.away_score ?? p.awayScore ?? 0),
      0
    );

    const displayHomeScore =
      homeGamesWon > 0 || awayGamesWon > 0
        ? homeGamesWon
        : (item.home_score ??
          item.homeScore ??
          (item.metadata as any)?.homeGameWins ??
          (periods.length > 0 ? totalHomePoints : 0));

    const displayAwayScore =
      homeGamesWon > 0 || awayGamesWon > 0
        ? awayGamesWon
        : (item.away_score ??
          item.awayScore ??
          (item.metadata as any)?.awayGameWins ??
          (periods.length > 0 ? totalAwayPoints : 0));

    const rawDate =
      item.scheduled_at ||
      item.started_at ||
      item.ended_at ||
      item.created_at ||
      item.createdAt;

    const isMyMatchCard = (() => {
      if (!userId) return false;
      const numUid = Number(userId);
      const playersList = [
        ...(item.players || []),
        ...(item.homePlayers || []),
        ...(item.awayPlayers || []),
        ...(item.home_players || []),
        ...(item.away_players || []),
        ...(item.match_players || []),
        ...(item.matchPlayers || []),
      ];
      const isPlayerInMatch = playersList.some((p: any) => {
        const pId = p.user_id ?? p.userId ?? p.id ?? p.player_id;
        return Number(pId) === numUid;
      });
      const isCaptainOrOrg =
        Number(item.home_team_captain_id || item.homeTeamCaptainId) === numUid ||
        Number(item.away_team_captain_id || item.awayTeamCaptainId) === numUid ||
        Number(item.created_by || item.createdBy) === numUid ||
        Number(item.organizer_id || item.organizerId) === numUid ||
        Number(item.tournament?.organizer_id || item.tournament?.created_by) === numUid;

      return Boolean(isPlayerInMatch || isCaptainOrOrg);
    })();

    const homeTeamObj = item.home_team || item.homeTeam || { logo: item.home_team_logo || item.homeTeamLogo, name: homeTeamDisplayName };
    const awayTeamObj = item.away_team || item.awayTeam || { logo: item.away_team_logo || item.awayTeamLogo, name: awayTeamDisplayName };

    const winnerTeamId =
      item.winner_team_id ??
      item.winnerTeamId ??
      (item.metadata as any)?.winnerTeamId;
    const isHomeWinner = Boolean(
      winnerTeamId && Number(winnerTeamId) === Number(homeTeamId)
    );
    const isAwayWinner = Boolean(
      winnerTeamId && Number(winnerTeamId) === Number(awayTeamId)
    );

    let homeScoreVal = displayHomeScore;
    let awayScoreVal = displayAwayScore;

    if (isCompleted && homeScoreVal === 0 && awayScoreVal === 0) {
      if (isHomeWinner) {
        homeScoreVal = 1;
        awayScoreVal = 0;
      } else if (isAwayWinner) {
        awayScoreVal = 1;
        homeScoreVal = 0;
      }
    }

    const isHomeTeamWinning = isCompleted
      ? isHomeWinner || homeScoreVal > awayScoreVal
      : homeScoreVal > awayScoreVal;
    const isAwayTeamWinning = isCompleted
      ? isAwayWinner || awayScoreVal > homeScoreVal
      : awayScoreVal > homeScoreVal;

    return (
      <View style={styles.glassCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{item.matchType || "SINGLES"} • PICKLEBALL</Text>
            </View>
            {isMyMatchCard && (
              <View
                style={{
                  backgroundColor: "rgba(108, 77, 246, 0.2)",
                  borderColor: "rgba(108, 77, 246, 0.5)",
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#A78BFA", fontSize: 10, fontWeight: "800" }}>
                  👤 My Match
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg[item.status] || 'rgba(255,255,255,0.05)' }]}>
            {isLive && <View style={styles.liveDot} />}
            <Text style={[styles.statusText, { color: statusColor[item.status] || '#FFF' }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Date / Location */}
        <Text style={styles.dateTimeText}>
          📅 {formatDate(rawDate)} • {formatTime(rawDate)}
        </Text>
        {item.ground_name && (
          <Text style={styles.groundText}>
            🏟️ {item.ground_name}
          </Text>
        )}

        <SizedBox height={16} />

        {/* Competitors Scoreboard Row */}
        <View style={styles.matchTeamsRow}>
          <View
            style={[
              styles.teamContainer,
              isCompleted && isHomeTeamWinning && styles.winnerTeam,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <TeamAvatar team={homeTeamObj} size={24} />
              <Text
                style={[
                  styles.teamNameText,
                  { flex: 1 },
                  isCompleted && isHomeTeamWinning && { color: "#10B981", fontWeight: "800" },
                ]}
                numberOfLines={2}
              >
                {homeTeamDisplayName}
              </Text>
            </View>
            {(isCompleted || isLive) && (
              <Text
                style={[
                  styles.gameScoreText,
                  isCompleted && isHomeTeamWinning && { color: "#10B981" },
                ]}
              >
                {homeScoreVal} {isCompleted && isHomeTeamWinning ? "🏆" : ""}
              </Text>
            )}
          </View>

          <Text style={styles.vsText}>VS</Text>

          <View
            style={[
              styles.teamContainer,
              isCompleted && isAwayTeamWinning && styles.winnerTeam,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <TeamAvatar team={awayTeamObj} size={24} />
              <Text
                style={[
                  styles.teamNameText,
                  { flex: 1 },
                  isCompleted && isAwayTeamWinning && { color: "#10B981", fontWeight: "800" },
                ]}
                numberOfLines={2}
              >
                {awayTeamDisplayName}
              </Text>
            </View>
            {(isCompleted || isLive) && (
              <Text
                style={[
                  styles.gameScoreText,
                  isCompleted && isAwayTeamWinning && { color: "#10B981" },
                ]}
              >
                {awayScoreVal} {isCompleted && isAwayTeamWinning ? "🏆" : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Scoreboard per Period display if live or completed */}
        {periods.length > 0 && (
          <View style={styles.periodsBox}>
            <Text style={styles.periodHeader}>Game Scores:</Text>
            <View style={styles.periodsRow}>
              {periods.map((p: any, idx: number) => (
                <View key={p.id || idx} style={styles.periodScoreBubble}>
                  <Text style={styles.periodBubbleText}>
                    G{p.period_number}: {p.home_score} - {p.away_score}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.cardDivider} />

        {/* Action Button */}
        {isScheduled && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { flex: 4 }]}
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
                setLineupModalMatch(item);
              }}
              disabled={startMatchMutation.isPending || deleteMatchMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Start Match (Make Live)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', borderWidth: 1 }]}
              onPress={() => handleDeleteMatch(item.id)}
              disabled={startMatchMutation.isPending || deleteMatchMutation.isPending}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ alignSelf: 'center' }} />
            </TouchableOpacity>
          </View>
        )}

        {isLive && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
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
                  message: "Cannot start scoring: Opponents are not yet decided (TBD)",
                  type: "warning",
                });
                return;
              }
              navigation.navigate('LiveScoring', { matchId: item.id });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>⚡ Score Live Engine</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedFooter}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
              <Text style={styles.completedLabel}>
                {isHomeWinner
                  ? `${homeTeamDisplayName} Won`
                  : isAwayWinner
                    ? `${awayTeamDisplayName} Won`
                    : "Match Ended"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.detailsBtn, { flexDirection: "row", alignItems: "center", gap: 4 }]}
              onPress={() => setSelectedMatchForStats(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.detailsBtnText}>View Stats</Text>
              <Ionicons name="chevron-forward" size={14} color="#A78BFA" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const rawMatches: any[] = Array.isArray(historyResponse)
    ? historyResponse
    : historyResponse?.data || historyResponse?.matches || [];

  const matches = rawMatches;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

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

      <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#00D2FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Center</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('CreateMatch')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color="#6C4DF6" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C4DF6" />
          <Text style={styles.loadingText}>Fetching matches...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎾</Text>
          <Text style={styles.emptyTitle}>No Matches Found</Text>
          <Text style={styles.emptyDesc}>
            There are no {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} matches scheduled yet.
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateMatch')}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>Schedule a Match</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMatchCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* MATCH STATS & SUMMARY MODAL */}
      {selectedMatchForStats && (
        <Modal
          visible={Boolean(selectedMatchForStats)}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedMatchForStats(null)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: "#161325",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: "85%",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 32,
                borderWidth: 1,
                borderColor: "rgba(108, 77, 246, 0.3)",
              }}
            >
              {/* Header Bar */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>
                    Match Summary
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg[selectedMatchForStats.status] || 'rgba(255,255,255,0.05)' }]}>
                    <Text style={[styles.statusText, { color: statusColor[selectedMatchForStats.status] || '#FFF' }]}>
                      {selectedMatchForStats.status}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedMatchForStats(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => {
                  const m = selectedMatchForStats;
                  const homeP = m.homePlayers?.map((p: any) => p.display_name || p.name).filter(Boolean).join(" & ");
                  const awayP = m.awayPlayers?.map((p: any) => p.display_name || p.name).filter(Boolean).join(" & ");
                  const hName = m.home_team_name || m.homeTeamName || homeP || "Home Team";
                  const aName = m.away_team_name || m.awayTeamName || awayP || "Away Team";
                  const hId = m.home_team_id || m.homeTeamId;
                  const aId = m.away_team_id || m.awayTeamId;

                  const pList = m.periods || [];
                  const hWins = pList.filter((p: any) => (p.winner_team_id || p.winnerTeamId) && Number(p.winner_team_id || p.winnerTeamId) === Number(hId)).length;
                  const aWins = pList.filter((p: any) => (p.winner_team_id || p.winnerTeamId) && Number(p.winner_team_id || p.winnerTeamId) === Number(aId)).length;
                  const winId = m.winner_team_id ?? m.winnerTeamId ?? (m.metadata as any)?.winnerTeamId;
                  const isHWon = Boolean(winId && Number(winId) === Number(hId));
                  const isAWon = Boolean(winId && Number(winId) === Number(aId));

                  let hScore = hWins > 0 || aWins > 0 ? hWins : (m.home_score ?? m.homeScore ?? (pList.length > 0 ? pList[0]?.home_score : 0));
                  let aScore = hWins > 0 || aWins > 0 ? aWins : (m.away_score ?? m.awayScore ?? (pList.length > 0 ? pList[0]?.away_score : 0));
                  if (m.status === 'COMPLETED' && hScore === 0 && aScore === 0) {
                    if (isHWon) { hScore = 1; aScore = 0; }
                    else if (isAWon) { aScore = 1; hScore = 0; }
                  }

                  const mDate = m.scheduled_at || m.started_at || m.ended_at || m.created_at;
                  const hObj = m.home_team || m.homeTeam || { logo: m.home_team_logo || m.homeTeamLogo, name: hName };
                  const aObj = m.away_team || m.awayTeam || { logo: m.away_team_logo || m.awayTeamLogo, name: aName };

                  return (
                    <View>
                      {/* Winner Banner */}
                      {m.status === "COMPLETED" && (isHWon || isAWon) && (
                        <View
                          style={{
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            borderColor: "#10B981",
                            borderWidth: 1,
                            borderRadius: 16,
                            padding: 14,
                            alignItems: "center",
                            marginBottom: 16,
                          }}
                        >
                          <Text style={{ fontSize: 24, marginBottom: 2 }}>🏆</Text>
                          <Text style={{ color: "#10B981", fontSize: 16, fontWeight: "800" }}>
                            Winner: {isHWon ? hName : aName}
                          </Text>
                          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                            {isHWon ? `${hName} defeated ${aName}` : `${aName} defeated ${hName}`}
                          </Text>
                        </View>
                      )}

                      {/* Main Scorecard Card */}
                      <View
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderRadius: 18,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.08)",
                          marginBottom: 16,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          {/* Home */}
                          <View style={{ flex: 1, alignItems: "center" }}>
                            <TeamAvatar team={hObj} size={42} style={{ marginBottom: 8 }} />
                            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
                              {hName}
                            </Text>
                            <Text style={{ color: isHWon ? "#10B981" : "#FFF", fontSize: 28, fontWeight: "900", marginTop: 6 }}>
                              {hScore}
                            </Text>
                          </View>

                          <View style={{ alignItems: "center", paddingHorizontal: 12 }}>
                            <Text style={{ color: "#9CA3AF", fontSize: 12, fontWeight: "800" }}>VS</Text>
                            <Text style={{ color: "#6C4DF6", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                              {m.matchType || "SINGLES"}
                            </Text>
                          </View>

                          {/* Away */}
                          <View style={{ flex: 1, alignItems: "center" }}>
                            <TeamAvatar team={aObj} size={42} style={{ marginBottom: 8 }} />
                            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
                              {aName}
                            </Text>
                            <Text style={{ color: isAWon ? "#10B981" : "#FFF", fontSize: 28, fontWeight: "900", marginTop: 6 }}>
                              {aScore}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Match Meta Information */}
                      <View
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          borderRadius: 14,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.06)",
                          marginBottom: 16,
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 14 }}>📅</Text>
                          <Text style={{ color: "#D1D5DB", fontSize: 13 }}>
                            {formatDate(mDate)} at {formatTime(mDate)}
                          </Text>
                        </View>
                        {m.ground_name && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ fontSize: 14 }}>🏟️</Text>
                            <Text style={{ color: "#D1D5DB", fontSize: 13 }}>{m.ground_name}</Text>
                          </View>
                        )}
                        {m.tournament_name && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ fontSize: 14 }}>🏆</Text>
                            <Text style={{ color: "#D1D5DB", fontSize: 13 }}>{m.tournament_name}</Text>
                          </View>
                        )}
                      </View>

                      {/* Period / Game Score Breakdown */}
                      {pList.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700", marginBottom: 8 }}>
                            Game Scores Breakdown
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            {pList.map((p: any, idx: number) => (
                              <View
                                key={p.id || idx}
                                style={{
                                  backgroundColor: "rgba(108, 77, 246, 0.12)",
                                  borderColor: "rgba(108, 77, 246, 0.3)",
                                  borderWidth: 1,
                                  borderRadius: 10,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                }}
                              >
                                <Text style={{ color: "#A78BFA", fontSize: 11, fontWeight: "700" }}>
                                  Game {p.period_number}
                                </Text>
                                <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "800", marginTop: 2 }}>
                                  {p.home_score} - {p.away_score}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Close Button */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#6C4DF6",
                          borderRadius: 14,
                          paddingVertical: 14,
                          alignItems: "center",
                          marginTop: 8,
                        }}
                        onPress={() => setSelectedMatchForStats(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "800" }}>
                          Close Summary
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* START MATCH LINEUP & PLAYERS SELECTION MODAL */}
      <StartMatchLineupModal
        visible={Boolean(lineupModalMatch)}
        match={lineupModalMatch}
        onClose={() => setLineupModalMatch(null)}
        onConfirmStart={(matchId, matchType, homePlayerIds, awayPlayerIds) => {
          setLineupModalMatch(null);
          handleStartMatch(matchId);
        }}
        loading={startMatchMutation.isPending}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(108,77,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108,77,246,0.3)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#6C4DF6',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createBtn: {
    backgroundColor: '#6C4DF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formatBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateTimeText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  groundText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  winnerTeam: {
    borderColor: 'rgba(108,77,246,0.3)',
    backgroundColor: 'rgba(108,77,246,0.04)',
  },
  teamNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  gameScoreText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6C4DF6',
    marginTop: 6,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginHorizontal: 10,
  },
  periodsBox: {
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
  },
  periodHeader: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  periodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  periodScoreBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  periodBubbleText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  actionBtn: {
    backgroundColor: '#6C4DF6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  completedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  detailsBtnText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default MatchHistoryScreen;
