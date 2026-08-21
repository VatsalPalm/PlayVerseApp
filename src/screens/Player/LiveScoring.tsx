import React, { useEffect, useState } from 'react';
import { storage } from '../../services/mmkv';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import FloatingOrbs from '../../Components/atoms/FloatingOrbs';
import { showMessage } from 'react-native-flash-message';
import { useMatchSocket } from '../../hooks/useMatchSocket';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LiveScoringScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const { matchId } = (route.params || {}) as { matchId: number };

  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = storage.getString('userProfile');
      if (stored) {
        const userObj = JSON.parse(stored);
        setUserId(userObj.id);
      }
      const role = storage.getString('userRole');
      setUserRole(role || 'PLAYER');
    } catch (e) {
      console.log('Error parsing profile:', e);
    }
  }, []);

  if (!matchId) {
    showMessage({ message: 'Invalid Match ID', type: 'danger' });
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
        type: 'danger',
        duration: 3000,
      });
      clearError();
    }
  }, [error, clearError]);

  // Extract variables
  const match = matchState;
  const isCompleted = match?.status === 'COMPLETED';

  // Determine if the user is authorized to perform scoring inputs
  const isAllowedToScore = (() => {
    if (route.params?.canScore !== undefined) {
      return route.params.canScore;
    }
    if (match?.tournamentId) {
      return userRole === 'TOURNAMENT_ORGANIZER' || userRole === 'PLAYER';
    }
    if (match) {
      const isPlayer = match.homePlayers?.some((p: any) => p.user_id === userId) || 
                       match.awayPlayers?.some((p: any) => p.user_id === userId);
      return isPlayer || userRole === 'TOURNAMENT_ORGANIZER' || userRole === 'ADMIN' || userRole === 'PLAYER';
    }
    return false;
  })();

  // Get player names
  const homePlayerNames = match?.homePlayers?.map((p: any) => p.display_name || p.name || `Player ${p.id}`) || [];
  const awayPlayerNames = match?.awayPlayers?.map((p: any) => p.display_name || p.name || `Player ${p.id}`) || [];

  const homeNames = homePlayerNames.join(' & ') || 'Home Team';
  const awayNames = awayPlayerNames.join(' & ') || 'Away Team';

  // Active score calculation
  const periods = match?.periods || [];
  const currentPeriod = periods.find((p: any) => !p.ended_at) || periods[periods.length - 1] || {
    home_score: 0,
    away_score: 0,
    period_number: 1,
  };

  const currentHomeScore = currentPeriod.home_score ?? 0;
  const currentAwayScore = currentPeriod.away_score ?? 0;

  // Games won count
  const homeGamesWon = periods.filter((p: any) => p.winner_team_id && p.winner_team_id === match?.home_team_id).length;
  const awayGamesWon = periods.filter((p: any) => p.winner_team_id && p.winner_team_id === match?.away_team_id).length;

  const isServingTeamHome = match?.servingTeamId === match?.home_team_id;
  const isServingTeamAway = match?.servingTeamId === match?.away_team_id;

  // Render player list inside court positions
  // In a standard Singles or Doubles court, players are stationed on Left or Right courts.
  // We determine position highlighting based on `servingTeamId` and `serverSide`
  const isHomeLeftHighlighted = isServingTeamHome && match?.serverSide === 'LEFT';
  const isHomeRightHighlighted = isServingTeamHome && match?.serverSide === 'RIGHT';
  const isAwayLeftHighlighted = isServingTeamAway && match?.serverSide === 'LEFT';
  const isAwayRightHighlighted = isServingTeamAway && match?.serverSide === 'RIGHT';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.syncBtn} onPress={requestSync} activeOpacity={0.7}>
          <Ionicons name="sync" size={20} color="#6C4DF6" />
        </TouchableOpacity>
      </View>

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
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
            
            {/* Set Games Score Header */}
            <View style={styles.gamesWinsCard}>
              <View style={styles.teamWinBox}>
                <Text style={styles.teamWinLabel} numberOfLines={1}>{homeNames}</Text>
                <Text style={styles.gamesCount}>{homeGamesWon} Games</Text>
              </View>
              <View style={styles.vsBox}>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.gameNoBadge}>
                  <Text style={styles.gameNoText}>Game {currentPeriod.period_number}</Text>
                </View>
              </View>
              <View style={styles.teamWinBox}>
                <Text style={styles.teamWinLabel} numberOfLines={1}>{awayNames}</Text>
                <Text style={styles.gamesCount}>{awayGamesWon} Games</Text>
              </View>
            </View>

            {/* Authoritative Live Scoreboard Card */}
            <View style={styles.scoreboardContainer}>
              {/* Home Score */}
              <View style={[styles.scoreBox, isServingTeamHome && styles.servingScoreBox]}>
                {isServingTeamHome && (
                  <View style={styles.serveBallBadge}>
                    <Text style={styles.serveBallText}>🎾 SERVE</Text>
                  </View>
                )}
                <Text style={styles.scoreText}>{currentHomeScore}</Text>
                <Text style={styles.scoreLabel}>Home</Text>
              </View>

              {/* Score Divider / Doubles Server Info */}
              <View style={styles.scoreDividerBox}>
                <Text style={styles.dashText}>—</Text>
                {match.matchType === 'DOUBLES' && match.serverNumber && (
                  <View style={styles.serverNumberBadge}>
                    <Text style={styles.serverNumberText}>Server {match.serverNumber}</Text>
                  </View>
                )}
              </View>

              {/* Away Score */}
              <View style={[styles.scoreBox, isServingTeamAway && styles.servingScoreBox]}>
                {isServingTeamAway && (
                  <View style={styles.serveBallBadge}>
                    <Text style={styles.serveBallText}>🎾 SERVE</Text>
                  </View>
                )}
                <Text style={styles.scoreText}>{currentAwayScore}</Text>
                <Text style={styles.scoreLabel}>Away</Text>
              </View>
            </View>

            {/* VISUAL PICKLEBALL COURT */}
            <View style={styles.courtWrapper}>
              <Text style={styles.courtHeaderTitle}>Pickleball Court Layout</Text>
              
              <View style={styles.courtBorder}>
                {/* AWAY COURT (Top half) */}
                <View style={styles.courtHalf}>
                  <View style={[styles.courtQuadrant, isAwayLeftHighlighted && styles.courtQuadrantActive]}>
                    <Text style={styles.courtQuadrantLabel}>Away Left</Text>
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {awayPlayerNames[1] || 'Away 2'}
                    </Text>
                    {isAwayLeftHighlighted && <Text style={styles.servingIndicator}>🎾 Serving</Text>}
                  </View>
                  <View style={[styles.courtQuadrant, isAwayRightHighlighted && styles.courtQuadrantActive]}>
                    <Text style={styles.courtQuadrantLabel}>Away Right</Text>
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {awayPlayerNames[0] || 'Away 1'}
                    </Text>
                    {isAwayRightHighlighted && <Text style={styles.servingIndicator}>🎾 Serving</Text>}
                  </View>
                </View>

                {/* THE KITCHEN (Non-Volley Zone in center) */}
                <View style={styles.kitchenZone}>
                  <Text style={styles.kitchenLabel}>THE KITCHEN (NVZ)</Text>
                  <View style={styles.netLine} />
                </View>

                {/* HOME COURT (Bottom half) */}
                <View style={styles.courtHalf}>
                  <View style={[styles.courtQuadrant, isHomeLeftHighlighted && styles.courtQuadrantActive]}>
                    {isHomeLeftHighlighted && <Text style={styles.servingIndicator}>🎾 Serving</Text>}
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {homePlayerNames[1] || 'Home 2'}
                    </Text>
                    <Text style={styles.courtQuadrantLabel}>Home Left</Text>
                  </View>
                  <View style={[styles.courtQuadrant, isHomeRightHighlighted && styles.courtQuadrantActive]}>
                    {isHomeRightHighlighted && <Text style={styles.servingIndicator}>🎾 Serving</Text>}
                    <Text style={styles.courtPlayerName} numberOfLines={1}>
                      {homePlayerNames[0] || 'Home 1'}
                    </Text>
                    <Text style={styles.courtQuadrantLabel}>Home Right</Text>
                  </View>
                </View>
              </View>
            </View>

            <SizedBox height={10} />

            {/* ACTION CONTROLS */}
            {isAllowedToScore ? (
              <View style={styles.controlsCard}>
                <Text style={styles.controlsHeader}>Score Management</Text>
                
                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={[styles.controlBtn, styles.homePointBtn]}
                    onPress={() => scorePoint(match.home_team_id!, undefined, 'POINT')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.controlBtnIcon}>➕</Text>
                    <Text style={styles.controlBtnText}>Home Point</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlBtn, styles.awayPointBtn]}
                    onPress={() => scorePoint(match.away_team_id!, undefined, 'POINT')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.controlBtnIcon}>➕</Text>
                    <Text style={styles.controlBtnText}>Away Point</Text>
                  </TouchableOpacity>
                </View>

                <SizedBox height={12} />

                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={[styles.controlBtn, styles.faultBtn]}
                    onPress={() => scorePoint(match.servingTeamId!, undefined, 'FAULT')}
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
                  <Text style={styles.spectatorSyncText}>👁️ Spectator Mode</Text>
                </View>

                <SizedBox height={16} />

                <Text style={styles.spectatorStatusTitle}>
                  {match.status === 'LIVE' ? 'Match is active and in progress' : 'Waiting for match to start'}
                </Text>

                <View style={styles.spectatorInfoGrid}>
                  <View style={styles.spectatorInfoBox}>
                    <Text style={styles.spectatorInfoLabel}>Serving Team</Text>
                    <Text style={styles.spectatorInfoValue}>
                      {match.servingTeamId === match.home_team_id ? 'Home Team' : match.servingTeamId === match.away_team_id ? 'Away Team' : 'None'}
                    </Text>
                  </View>

                  <View style={styles.spectatorInfoBox}>
                    <Text style={styles.spectatorInfoLabel}>Format</Text>
                    <Text style={styles.spectatorInfoValue}>{match.matchType || 'SINGLES'}</Text>
                  </View>
                </View>

                {match.events && match.events.length > 0 && (
                  <View style={styles.latestActionBox}>
                    <Text style={styles.latestActionLabel}>Latest Action</Text>
                    <Text style={styles.latestActionText} numberOfLines={1}>
                      {(() => {
                        const lastEv = match.events[match.events.length - 1];
                        const isHome = lastEv.team_id === match.home_team_id;
                        return `${isHome ? 'Home' : 'Away'} scored ${lastEv.event_type || 'POINT'}`;
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
                match.events.slice(-5).reverse().map((ev: any, idx: number) => {
                  const isHomeEvent = ev.team_id === match.home_team_id;
                  const teamName = isHomeEvent ? 'Home' : 'Away';
                  return (
                    <View key={ev.id || idx} style={styles.feedItem}>
                      <Text style={styles.feedItemText}>
                        🟢 {teamName} scored: {ev.event_type}
                      </Text>
                      <Text style={styles.feedItemTime}>
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyFeedText}>No score events logged yet. Let the serving begin!</Text>
              )}
            </View>

            <SizedBox height={40} />
          </ScrollView>

          {/* CELEBRATORY COMPLETION OVERLAY */}
          {isCompleted && (
            <Modal transparent={true} visible={isCompleted} animationType="fade">
              <View style={styles.completionOverlay}>
                <View style={styles.completionCard}>
                  <Text style={styles.congratsIcon}>🏆</Text>
                  <Text style={styles.congratsTitle}>Match Completed!</Text>
                  <Text style={styles.congratsSubtitle}>authoritative final score</Text>

                  <View style={styles.completionScoreBox}>
                    <Text style={styles.completedTeamName}>{homeNames}</Text>
                    <Text style={styles.completedFinalScore}>{homeGamesWon} - {awayGamesWon}</Text>
                    <Text style={styles.completedTeamName}>{awayNames}</Text>
                  </View>

                  <Text style={styles.winnerText}>
                    Winner: {match.winner_team_id === match.home_team_id ? homeNames : awayNames}
                  </Text>

                  <SizedBox height={20} />

                  <TouchableOpacity
                    style={styles.closeOverlayBtn}
                    onPress={() => {
                      navigation.goBack();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeOverlayText}>Back to Match Center</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </View>
      )}
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
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#9CA3AF',
    fontWeight: '700',
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
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 77, 246, 0.15)',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.3)',
  },
  syncingText: {
    color: '#6C4DF6',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  gamesWinsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teamWinBox: {
    flex: 1,
    alignItems: 'center',
  },
  teamWinLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  gamesCount: {
    color: '#6C4DF6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  vsBox: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  vsText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },
  gameNoBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  gameNoText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  scoreboardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
  },
  servingScoreBox: {
    backgroundColor: 'rgba(108, 77, 246, 0.08)',
    borderColor: 'rgba(108, 77, 246, 0.3)',
  },
  serveBallBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#00E676',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serveBallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0B0914',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  scoreDividerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  dashText: {
    fontSize: 24,
    color: '#4B5563',
    fontWeight: '700',
  },
  serverNumberBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  serverNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  // Visual Court Styles
  courtWrapper: {
    marginBottom: 20,
  },
  courtHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  courtBorder: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderWidth: 3,
    borderColor: '#00E676',
    borderRadius: 12,
    padding: 6,
  },
  courtHalf: {
    flexDirection: 'row',
    height: 100,
  },
  courtQuadrant: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    margin: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  courtQuadrantActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
    borderWidth: 1.5,
  },
  courtQuadrantLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  courtPlayerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginVertical: 4,
    textAlign: 'center',
    width: '90%',
  },
  servingIndicator: {
    fontSize: 9,
    color: '#00E676',
    fontWeight: '800',
  },
  kitchenZone: {
    height: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    margin: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  kitchenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  netLine: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFF',
    opacity: 0.6,
  },
  // Controls Styles
  controlsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  controlsHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  controlsRow: {
    flexDirection: 'row',
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  homePointBtn: {
    backgroundColor: '#6C4DF6',
  },
  awayPointBtn: {
    backgroundColor: '#6C4DF6',
  },
  faultBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  undoBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  // Event Feed Styles
  feedBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
  },
  feedHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  feedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  feedItemText: {
    fontSize: 13,
    color: '#FFF',
  },
  feedItemTime: {
    fontSize: 11,
    color: '#4B5563',
  },
  emptyFeedText: {
    textAlign: 'center',
    color: '#4B5563',
    paddingVertical: 10,
    fontSize: 13,
  },
  // Completion Modal Styles
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completionCard: {
    backgroundColor: '#0F0D1C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  congratsIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00E676',
  },
  congratsSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  completionScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
    width: '100%',
    justifyContent: 'space-between',
  },
  completedTeamName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  completedFinalScore: {
    fontSize: 32,
    fontWeight: '900',
    color: '#6C4DF6',
    marginHorizontal: 12,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeOverlayBtn: {
    backgroundColor: '#6C4DF6',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  closeOverlayText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  spectatorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  spectatorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spectatorLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spectatorPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  spectatorLiveText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  spectatorSyncText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '700',
  },
  spectatorStatusTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  spectatorInfoGrid: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  spectatorInfoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
  },
  spectatorInfoLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  spectatorInfoValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  latestActionBox: {
    marginTop: 14,
    backgroundColor: 'rgba(108, 77, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  latestActionLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  latestActionText: {
    color: '#6C4DF6',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default LiveScoringScreen;
