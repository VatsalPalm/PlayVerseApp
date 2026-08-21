import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { HomeStackParamList } from '../../utils/types';
import { storage } from '../../services/mmkv';
import { fetchTournamentControllerListTournaments } from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPORT_NAMES: Record<number, string> = {
  1: 'Cricket',
  2: 'Football',
  5: 'Pickleball',
  6: 'Badminton',
};

const statusColors: Record<string, string> = {
  DRAFT: '#9CA3AF',
  UPCOMING: '#00D2FF',
  ONGOING: '#00E676',
  COMPLETED: '#A855F7',
  CANCELLED: '#EF4444',
};

const SPORT_COLORS: Record<string, string> = {
  Cricket: '#FF7A00',
  Football: '#00E676',
  Pickleball: '#00D2FF',
  Badminton: '#A855F7',
};

const SPORT_BG: Record<string, string> = {
  Cricket: 'rgba(255, 122, 0, 0.12)',
  Football: 'rgba(0, 230, 118, 0.12)',
  Pickleball: 'rgba(0, 210, 255, 0.12)',
  Badminton: 'rgba(168, 85, 247, 0.12)',
};

const TournamentListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [userRole, setUserRole] = useState('PLAYER');
  const LIMIT = 10;

  const orb1X = useSharedValue(SCREEN_WIDTH * 0.1);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.2);

  const orb2X = useSharedValue(SCREEN_WIDTH * 0.7);
  const orb2Y = useSharedValue(SCREEN_HEIGHT * 0.7);

  useEffect(() => {
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.45, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.05, { duration: 15000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb2X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.35, { duration: 18000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 0.85, { duration: 18000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb1X.value },
      { translateY: orb1Y.value },
    ],
  }));

  const animatedOrb2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb2X.value },
      { translateY: orb2Y.value },
    ],
  }));

  const loadTournaments = async (isRefresh = false) => {
    const currentOffset = isRefresh ? 0 : offset;
    
    if (isRefresh) {
      setRefreshing(true);
    } else if (currentOffset > 0) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetchTournamentControllerListTournaments({
        queryParams: {
          limit: LIMIT,
          offset: currentOffset,
        },
      }) as any;

      const listArray = res?.data || [];
      
      const activeSportIds = [1, 2, 5, 6];
      const validNew = listArray.filter((item: any) => activeSportIds.includes(item.sport_id));

      if (isRefresh) {
        setTournaments(validNew);
        setOffset(validNew.length > 0 ? LIMIT : 0);
        setHasMore(listArray.length === LIMIT);
      } else {
        setTournaments((prev) => {
          const combined = [...prev, ...validNew];
          const unique = combined.filter((item, index, self) => 
            self.findIndex(t => t.id === item.id) === index
          );
          return unique;
        });
        setOffset((prev) => prev + LIMIT);
        setHasMore(listArray.length === LIMIT);
      }
    } catch (err) {
      console.log('Error loading tournaments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadTournaments(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const role = storage.getString('userRole') || 'PLAYER';
      setUserRole(role);
      loadTournaments(true);
    }, [])
  );

  const filteredTournaments = tournaments.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.organizer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const sportName = SPORT_NAMES[item.sport_id] || '';
    const matchesSport = selectedSport === 'All' || sportName === selectedSport;

    return matchesSearch && matchesSport;
  });

  const renderItem = ({ item }: { item: any }) => {
    const sportName = SPORT_NAMES[item.sport_id] || 'Sports';
    const statusColor = statusColors[item.status] || '#FFF';
    const sportColor = SPORT_COLORS[sportName] || '#6C4DF6';
    const sportBg = SPORT_BG[sportName] || 'rgba(108, 77, 246, 0.1)';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TournamentDetails', { tournamentId: item.id })}
      >
        <View style={styles.cardGlassHighlight} />
        
        <View style={styles.cardHeader}>
          <View style={[styles.sportBadge, { backgroundColor: sportBg }]}>
            <Text style={[styles.sportBadgeText, { color: sportColor }]}>
              {sportName.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusTag, { 
            borderColor: statusColor + '40', 
            backgroundColor: statusColor + '12',
            borderWidth: 1, 
          }]}>
            <Text style={[styles.statusTagText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <SizedBox height={12} />
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <SizedBox height={6} />
        <Text style={styles.cardOrganizer} numberOfLines={1}>
          Hosted by: {item.organizer_name || 'System Organizer'}
        </Text>

        <SizedBox height={16} />
        <View style={styles.cardFooter}>
          <View style={styles.dateBox}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.footerVal}>
              {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBD'}
            </Text>
          </View>
          <View style={styles.teamBox}>
            <Ionicons name="people-outline" size={14} color="#9CA3AF" />
            <Text style={styles.footerVal}>
              {item.max_teams || 16} slots
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#0F0D1A" />
              <Stop offset="100%" stopColor="#030206" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
        </Svg>
      </View>

      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />
      <Animated.View style={[styles.floatingOrb, styles.orb2, animatedOrb2]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <TouchableOpacity style={styles.syncBtn} onPress={() => loadTournaments(true)}>
          <Ionicons name="refresh" size={20} color="#6C4DF6" />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tournaments..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Sports Filter */}
        <View style={styles.sportsFilterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['All', 'Cricket', 'Football', 'Pickleball', 'Badminton']}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.sportsList}
            renderItem={({ item }) => {
              const active = selectedSport === item;
              return (
                <TouchableOpacity
                  style={[styles.sportTab, active && styles.sportTabActive]}
                  onPress={() => setSelectedSport(item)}
                >
                  <Text style={[styles.sportTabText, active && styles.sportTabTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Tournament List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6C4DF6" />
          <Text style={styles.loadingText}>Fetching tournaments...</Text>
        </View>
      ) : filteredTournaments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trophy-outline" size={64} color="#4B5563" />
          <Text style={styles.emptyTitle}>No Tournaments Found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your search filters or check back later.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTournaments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={() => loadTournaments(true)}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator size="small" color="#6C4DF6" />
              </View>
            ) : null
          }
        />
      )}

      {/* Create Tournament Button for Both Players and Organizers */}
      {(userRole === 'TOURNAMENT_ORGANIZER' || userRole === 'PLAYER') && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateTournament')}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default TournamentListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  syncBtn: {
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  sportsFilterContainer: {
    marginTop: 12,
    marginHorizontal: -20,
  },
  sportsList: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  sportTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sportTabActive: {
    backgroundColor: '#6C4DF6',
    borderColor: '#6C4DF6',
  },
  sportTabText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  sportTabTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  listFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  cardGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  statusTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardOrganizer: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerVal: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  detailText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C4DF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 9999,
    width: 280,
    height: 280,
    opacity: 0.12,
  },
  orb1: {
    backgroundColor: '#6C4DF6',
    top: -50,
    left: -50,
  },
  orb2: {
    backgroundColor: '#00D2FF',
    bottom: -50,
    right: -50,
  },
});
