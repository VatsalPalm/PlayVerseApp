import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';
import {
  useMatchControllerGetMatchHistory,
  useMatchControllerStartMatch,
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['ALL', 'SCHEDULED', 'LIVE', 'COMPLETED'];

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
  const [activeTab, setActiveTab] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const queryParams: any = { limit: 100 };
  if (activeTab !== 'ALL') {
    queryParams.status = activeTab;
  }

  const { data: historyResponse, isLoading, refetch } = useMatchControllerGetMatchHistory<any>({
    queryParams,
  });

  const startMatchMutation = useMatchControllerStartMatch();

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

  const renderMatchCard = ({ item }: { item: any }) => {
    // Get player names
    const homeNames = item.homePlayers?.map((p: any) => p.display_name || p.name || `Player ${p.id}`).join(' & ') || 'Home Team';
    const awayNames = item.awayPlayers?.map((p: any) => p.display_name || p.name || `Player ${p.id}`).join(' & ') || 'Away Team';

    const isLive = item.status === 'LIVE';
    const isCompleted = item.status === 'COMPLETED';
    const isScheduled = item.status === 'SCHEDULED';

    // Calculate score details if completed or live
    // e.g. sum of period scores or specific summaries
    const periods = item.periods || [];
    const homeGamesWon = periods.filter((p: any) => p.winner_team_id && p.winner_team_id === item.home_team_id).length;
    const awayGamesWon = periods.filter((p: any) => p.winner_team_id && p.winner_team_id === item.away_team_id).length;

    return (
      <View style={styles.glassCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>{item.matchType} • PICKLEBALL</Text>
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
          📅 {formatDate(item.scheduled_at)} • {formatTime(item.scheduled_at)}
        </Text>
        {item.ground_name && (
          <Text style={styles.groundText}>
            🏟️ {item.ground_name}
          </Text>
        )}

        <SizedBox height={16} />

        {/* Competitors Scoreboard Row */}
        <View style={styles.matchTeamsRow}>
          <View style={[styles.teamContainer, isCompleted && homeGamesWon > awayGamesWon && styles.winnerTeam]}>
            <Text style={styles.teamNameText} numberOfLines={2}>{homeNames}</Text>
            {isCompleted && (
              <Text style={styles.gameScoreText}>{homeGamesWon} {homeGamesWon > awayGamesWon && '🏆'}</Text>
            )}
          </View>

          <Text style={styles.vsText}>VS</Text>

          <View style={[styles.teamContainer, isCompleted && awayGamesWon > homeGamesWon && styles.winnerTeam]}>
            <Text style={styles.teamNameText} numberOfLines={2}>{awayNames}</Text>
            {isCompleted && (
              <Text style={styles.gameScoreText}>{awayGamesWon} {awayGamesWon > homeGamesWon && '🏆'}</Text>
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
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleStartMatch(item.id)}
            disabled={startMatchMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Start Match (Make Live)</Text>
          </TouchableOpacity>
        )}

        {isLive && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('LiveScoring', { matchId: item.id })}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>⚡ Score Live Engine</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedFooter}>
            <Text style={styles.completedLabel}>Match Ended</Text>
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => showMessage({ message: 'Scorecard expanded details', type: 'info' })}
            >
              <Text style={styles.detailsBtnText}>View Stats</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const matches = historyResponse?.data || [];

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
