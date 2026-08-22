import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useNavigation, useFocusEffect, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, HomeStackParamList } from "../../utils/types";
import { storage } from "../../services/mmkv";
import { showMessage } from "react-native-flash-message";
import SizedBox from "../../Components/atoms/SizeBox";
import MyTeamsModal from "../../Components/MyTeamsModal";
import { 
  useBookingControllerGetMyBookings,
  fetchTournamentControllerListTournaments,
  fetchTournamentControllerGetParticipants,
  useMatchControllerGetMatchHistory,
} from "../../Api/playVerseComponents";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const statusColor: Record<string, string> = {
  CONFIRMED: "#22c55e",
  PENDING: "#f59e0b",
  CANCELLED: "#ef4444",
};

const statusBg: Record<string, string> = {
  CONFIRMED: "rgba(34,197,94,0.12)",
  PENDING: "rgba(245,158,11,0.12)",
  CANCELLED: "rgba(239,68,68,0.12)",
};

const formatDate = (raw: string): string => {
  if (!raw) return '—';
  let date: Date;
  if (raw.includes('T')) {
    date = new Date(raw);
  } else {
    const [y, m, d] = raw.split('-').map(Number);
    date = new Date(y, m - 1, d);
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const PlayerHomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [userName, setUserName] = useState("User");
  const [selectedSport, setSelectedSport] = useState("Cricket");
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch actual recent bookings
  const {
    data: myBookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useBookingControllerGetMyBookings<any>(
    { queryParams: { limit: 5 } },
    { retry: false },
  );

  // Fetch matches list for live match per sport
  const {
    data: allMatchesData,
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = useMatchControllerGetMatchHistory<any>(
    { queryParams: { limit: 50 } },
    { retry: false },
  );

  // Refetch when screen is focused
  useFocusEffect(
    useCallback(() => {
      refetchBookings();
      refetchMatches();
    }, [refetchBookings, refetchMatches]),
  );

  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [showMyTeamsModal, setShowMyTeamsModal] = useState(false);

  const allMatchesList: any[] = allMatchesData?.data || [];

  // Filter matches dynamically for the selected sport
  const activeSportMatch = useMemo(() => {
    if (!allMatchesList.length) return null;

    const matchesForSport = allMatchesList.filter((m: any) => {
      const sName = (m.sport_name || m.sportName || "").toLowerCase();
      const sId = Number(m.sport_id || m.sportId || 0);

      if (selectedSport === "Cricket") return sId === 1 || sName.includes("cricket");
      if (selectedSport === "Football") return sId === 2 || sName.includes("football");
      if (selectedSport === "Pickleball") return sId === 5 || sName.includes("pickle");
      if (selectedSport === "Badminton") return sId === 6 || sName.includes("badminton");
      return sName.includes(selectedSport.toLowerCase());
    });

    return (
      matchesForSport.find((m: any) => m.status === "LIVE") ||
      matchesForSport.find((m: any) => m.status === "SCHEDULED") ||
      matchesForSport[0] ||
      null
    );
  }, [allMatchesList, selectedSport]);

  const loadPlayerTournaments = async (pId: number) => {
    try {
      setTournamentsLoading(true);
      const res = await fetchTournamentControllerListTournaments({
        queryParams: {
          limit: 30,
          offset: 0,
        },
      }) as any;

      const listArray = res?.data || [];
      const matched: any[] = [];
      
      const promises = listArray.slice(0, 8).map(async (t: any) => {
        try {
          const parts = (await fetchTournamentControllerGetParticipants({
            pathParams: { id: t.id }
          }).catch(() => null)) as any;
          
          const isParticipant = parts?.some((p: any) => p.captain_id === pId);
          if (isParticipant || t.organizer_id === pId) {
            matched.push(t);
          }
        } catch {
          // Ignore
        }
      });

      await Promise.all(promises);
      setMyTournaments(matched);
    } catch (e) {
      console.log('Failed to load player tournaments:', e);
    } finally {
      setTournamentsLoading(false);
    }
  };

  // Load user name from stored profile
  useFocusEffect(
    useCallback(() => {
      try {
        const stored = storage.getString("userProfile");
        if (stored) {
          const userObj = JSON.parse(stored);
          if (userObj?.display_name) {
            setUserName(userObj.display_name);
          } else if (userObj?.full_name) {
            setUserName(userObj.full_name);
          }
          if (userObj?.id) {
            loadPlayerTournaments(userObj.id);
          }
        }
      } catch (e) {
        console.log("Failed to parse user profile:", e);
      }
    }, [])
  );

  // Shared values for background orbs
  const orb1X = useSharedValue(SCREEN_WIDTH * 0.2);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.15);

  useEffect(() => {
    // Orb animations
    orb1X.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 0.35, {
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(SCREEN_WIDTH * 0.15, {
          duration: 10000,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(SCREEN_HEIGHT * 0.1, {
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(SCREEN_HEIGHT * 0.25, {
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
  }, []);

  const handleLocalLogout = () => {
    storage.delete("accessToken");
    storage.delete("refreshToken");
    storage.delete("userProfile");
    storage.delete("userRole");
    showMessage({
      message: "Signed Out",
      description: "You have logged out successfully.",
      type: "info",
    });
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      {/* Floating glowing orbs */}
      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {userName.split(" ")[0]}! 👋
            </Text>
            <Text style={styles.headerSubtitle}>
              Ready to lead your team to victory?
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLocalLogout}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Choose Your Sport Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Sport</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sportsScroll}
            >
              {[
                "Cricket",
                "Football",
                "Pickleball",
                "Badminton",
              ].map((sport) => {
                const isSelected = selectedSport === sport;
                const emoji =
                  sport === "Cricket"
                    ? "🏏"
                    : sport === "Football"
                      ? "⚽"
                      : sport === "Pickleball"
                        ? "🏓"
                        : "🏸";
                return (
                  <TouchableOpacity
                    key={sport}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSport(sport)}
                    style={[
                      styles.sportTab,
                      isSelected && styles.sportTabActive,
                    ]}
                  >
                    <Text style={styles.sportEmoji}>{emoji}</Text>
                    <Text
                      style={[
                        styles.sportText,
                        isSelected && styles.sportTextActive,
                      ]}
                    >
                      {sport}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Live Match Card */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedSport} Match
              </Text>
              <View
                style={[
                  styles.liveBadge,
                  activeSportMatch?.status === "LIVE"
                    ? null
                    : { backgroundColor: "rgba(108, 77, 246, 0.15)" },
                ]}
              >
                {activeSportMatch?.status === "LIVE" && <View style={styles.liveDot} />}
                <Text
                  style={[
                    styles.liveBadgeText,
                    activeSportMatch?.status === "LIVE"
                      ? null
                      : { color: "#6C4DF6" },
                  ]}
                >
                  {activeSportMatch?.status || "LIVE"}
                </Text>
              </View>
            </View>

            {activeSportMatch ? (
              (() => {
                const homePlayerNames = activeSportMatch.homePlayers
                  ?.map((p: any) => p.display_name || p.name)
                  .filter(Boolean)
                  .join(" & ");
                const awayPlayerNames = activeSportMatch.awayPlayers
                  ?.map((p: any) => p.display_name || p.name)
                  .filter(Boolean)
                  .join(" & ");

                const homeName =
                  activeSportMatch.home_team_name ||
                  activeSportMatch.homeTeamName ||
                  homePlayerNames ||
                  "Home Team";
                const awayName =
                  activeSportMatch.away_team_name ||
                  activeSportMatch.awayTeamName ||
                  awayPlayerNames ||
                  "Away Team";

                const periods = activeSportMatch.periods || [];
                const homeGamesWon = periods.filter(
                  (p: any) => p.winner_team_id && p.winner_team_id === activeSportMatch.home_team_id
                ).length;
                const awayGamesWon = periods.filter(
                  (p: any) => p.winner_team_id && p.winner_team_id === activeSportMatch.away_team_id
                ).length;

                return (
                  <View style={styles.glassCard}>
                    <Text style={styles.matchSub}>
                      {activeSportMatch.matchType || "MATCH"} • {formatDate(activeSportMatch.created_at || activeSportMatch.scheduled_at)}
                    </Text>

                    <View style={styles.teamsRow}>
                      <View style={styles.teamContainer}>
                        <Text style={styles.teamName}>{homeName}</Text>
                        <Text style={styles.teamScore}>
                          {selectedSport === "Cricket"
                            ? `${activeSportMatch.home_score || homeGamesWon} / 0`
                            : `${homeGamesWon}`}
                        </Text>
                        <Text style={styles.teamOvers}>
                          {selectedSport === "Cricket" ? "Overs: 0.0" : "Games Won"}
                        </Text>
                      </View>

                      <Text style={styles.vsText}>VS</Text>

                      <View style={styles.teamContainer}>
                        <Text style={styles.teamName}>{awayName}</Text>
                        <Text style={styles.teamScore}>
                          {selectedSport === "Cricket"
                            ? `${activeSportMatch.away_score || awayGamesWon} / 0`
                            : `${awayGamesWon}`}
                        </Text>
                        <Text style={styles.teamOvers}>
                          {selectedSport === "Cricket" ? "Overs: 0.0" : "Games Won"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.matchCenterBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (activeSportMatch.status === "LIVE" || activeSportMatch.status === "COMPLETED") {
                          navigation.navigate("LiveScoring", { matchId: activeSportMatch.id });
                        } else {
                          navigation.navigate("MatchHistory");
                        }
                      }}
                    >
                      <Text style={styles.matchCenterText}>Match Center</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            ) : (
              <View style={styles.glassCard}>
                <View style={{ alignItems: "center", paddingVertical: 10 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>
                    {selectedSport === "Cricket"
                      ? "🏏"
                      : selectedSport === "Football"
                        ? "⚽"
                        : selectedSport === "Pickleball"
                          ? "🏓"
                          : "🏸"}
                  </Text>
                  <Text style={[styles.teamName, { textAlign: "center" }]}>
                    No Live {selectedSport} Match
                  </Text>
                  <Text style={[styles.matchSub, { textAlign: "center", marginTop: 4 }]}>
                    There are currently no active live matches for {selectedSport}.
                  </Text>
                  <TouchableOpacity
                    style={[styles.matchCenterBtn, { paddingHorizontal: 20, marginTop: 14 }]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("MatchHistory")}
                  >
                    <Text style={styles.matchCenterText}>Explore {selectedSport} Matches</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {[
                { title: "Live Scoring", icon: "⚡" },
                { title: "Book Ground", icon: "🏟️" },
                { title: "Tournaments", icon: "🏆" },
                { title: "My Teams", icon: "👥" },
                { title: "My Profile", icon: "👤" },
              ].map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (action.title === "Book Ground") {
                      navigation.navigate("GroundsList");
                    } else if (action.title === "Live Scoring") {
                      navigation.navigate("MatchHistory");
                    } else if (action.title === "Tournaments") {
                      navigation.navigate("TournamentList");
                    } else if (action.title === "My Teams") {
                      setShowMyTeamsModal(true);
                    } else if (action.title === "My Profile") {
                      navigation.navigate("EditProfile");
                    } else {
                      showMessage({
                        message: `${action.title} coming soon!`,
                        type: "info",
                      });
                    }
                  }}
                >
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* My Tournaments */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Tournaments</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("TournamentList")}
              >
                <Text
                  style={{ color: "#6C4DF6", fontSize: 13, fontWeight: "600" }}
                >
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {tournamentsLoading ? (
              <ActivityIndicator size="small" color="#6C4DF6" style={{ marginVertical: 20 }} />
            ) : myTournaments.length === 0 ? (
              <View style={styles.emptyBookingsBox}>
                <Text style={styles.emptyBookingsText}>
                  You haven't registered in any tournaments yet.
                </Text>
              </View>
            ) : (
              myTournaments.map((item) => {
                const isLive = item.status === 'ONGOING';
                const isUpcoming = item.status === 'UPCOMING';
                const statusColorVal = isLive ? '#22c55e' : isUpcoming ? '#00D2FF' : '#9CA3AF';
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.bookingItem}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('TournamentDetails', { tournamentId: item.id })}
                  >
                    <View style={styles.bookingLeft}>
                      <Text style={styles.bookingGround} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.bookingDate}>
                        Sport: {item.sport_name || 'Pickleball'} • Format: {item.format}
                      </Text>
                      <Text style={[styles.bookingDate, { fontSize: 10, opacity: 0.8 }]}>
                        Starts: {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBD'}
                      </Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { 
                      borderColor: statusColorVal + '40', 
                      backgroundColor: statusColorVal + '12',
                      borderWidth: 1,
                    }]}>
                      <Text style={{ color: statusColorVal, fontSize: 9, fontWeight: '900' }}>
                        {item.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Recent Bookings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Bookings</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("MyBookings")}
              >
                <Text
                  style={{ color: "#6C4DF6", fontSize: 13, fontWeight: "600" }}
                >
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {bookingsLoading ? (
              <ActivityIndicator
                size="small"
                color="#6C4DF6"
                style={{ marginVertical: 12 }}
              />
            ) : !myBookingsData?.data || myBookingsData.data.length === 0 ? (
              <View style={styles.emptyBookingsBox}>
                <Text style={styles.emptyBookingsText}>
                  No bookings found. Try booking a slot below!
                </Text>
              </View>
            ) : (
              [...myBookingsData.data]
                .sort((a, b) => {
                  const dateA = new Date(a.booking_date || 0).getTime();
                  const dateB = new Date(b.booking_date || 0).getTime();
                  if (dateB !== dateA) return dateB - dateA;
                  return (b.id || 0) - (a.id || 0);
                })
                .slice(0, 3)
                .map((item: any, idx: number) => {
                const statusCol = statusColor[item.booking_status] || "#9CA3AF";
                const statusBgCol =
                  statusBg[item.booking_status] || "rgba(0,0,0,0.1)";
                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.bookingItem}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("MyBookings")}
                  >
                    <View style={styles.bookingLeft}>
                      <Text style={styles.bookingGround}>
                        {item.ground_name}
                      </Text>
                      <Text style={styles.bookingDate}>
                        {formatDate(item.booking_date)} • {item.slot_start} –{" "}
                        {item.slot_end}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusBgCol,
                          borderColor: statusCol,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusCol, fontSize: 10, fontWeight: "700" },
                        ]}
                      >
                        {item.booking_status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
      <MyTeamsModal
        visible={showMyTeamsModal}
        onClose={() => setShowMyTeamsModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080612",
  },
  safeArea: {
    flex: 1,
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 9999,
    width: 280,
    height: 280,
    opacity: 0.12,
  },
  orb1: {
    backgroundColor: "#6C4DF6",
    top: -50,
    left: -50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  logoutBtn: {
    backgroundColor: "rgba(255, 62, 62, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 62, 62, 0.25)",
  },
  logoutBtnText: {
    color: "#FF3E3E",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 62, 62, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3E3E",
    marginRight: 5,
  },
  liveBadgeText: {
    color: "#FF3E3E",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sportsScroll: {
    gap: 10,
    paddingRight: 20,
  },
  sportTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sportTabActive: {
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    borderColor: "#6C4DF6",
  },
  sportEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  sportText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  sportTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
  },
  matchSub: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 12,
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  teamContainer: {
    alignItems: "center",
    flex: 1,
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  teamScore: {
    color: "#00D2FF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  teamOvers: {
    color: "#9CA3AF",
    fontSize: 10,
    marginTop: 2,
  },
  vsText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 10,
  },
  targetContainer: {
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "rgba(108, 77, 246, 0.08)",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.15)",
  },
  targetText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  ballsText: {
    color: "#D2C4FF",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 14,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  playerRole: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "500",
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  matchCenterBtn: {
    height: 44,
    backgroundColor: "#6C4DF6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  matchCenterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "31%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  bookingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  bookingLeft: {
    flex: 1,
  },
  bookingGround: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bookingDate: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusConfirmed: {
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.25)",
  },
  statusPending: {
    backgroundColor: "rgba(255, 145, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 145, 0, 0.25)",
  },
  statusTextConfirmed: {
    color: "#00E676",
    fontSize: 10,
    fontWeight: "700",
  },
  statusTextPending: {
    color: "#FF9100",
    fontSize: 10,
    fontWeight: "700",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  emptyBookingsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  emptyBookingsText: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
  },
  groundCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  groundCardHeader: {
    marginBottom: 10,
  },
  groundCardName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  groundCardLocation: {
    color: "#00D2FF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  groundCardDesc: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  sportsChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  sportCardChip: {
    backgroundColor: "rgba(108, 77, 246, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.25)",
  },
  sportCardChipText: {
    color: "#D2C4FF",
    fontSize: 10,
    fontWeight: "700",
  },
  bookNowBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bookNowText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default PlayerHomeScreen;
