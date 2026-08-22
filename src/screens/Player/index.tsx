import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import {
  useNavigation,
  useFocusEffect,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, HomeStackParamList } from "../../utils/types";
import { storage } from "../../services/mmkv";
import { showMessage } from "react-native-flash-message";
import SizedBox from "../../Components/atoms/SizeBox";
import MyTeamsModal from "../../Components/MyTeamsModal";
import EditProfileScreen from "../GroundOwner/EditProfile";
import { useMatchSocket } from "../../hooks/useMatchSocket";
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
  if (!raw) return "—";
  let date: Date;
  if (raw.includes("T")) {
    date = new Date(raw);
  } else {
    const [y, m, d] = raw.split("-").map(Number);
    date = new Date(y, m - 1, d);
  }
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const PlayerHomeScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState("User");
  const [activeBottomTab, setActiveBottomTab] = useState<
    "dashboard" | "profile"
  >("dashboard");
  const [selectedSport, setSelectedSport] = useState("Cricket");
  const [showSportModal, setShowSportModal] = useState(false);
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
      if (selectedSport === "All Sports" || selectedSport === "All")
        return true;
      const sName = (m.sport_name || m.sportName || "").toLowerCase();
      const sId = Number(m.sport_id || m.sportId || 0);

      if (selectedSport === "Cricket")
        return sId === 1 || sName.includes("cricket");
      if (selectedSport === "Football")
        return sId === 2 || sName.includes("football");
      if (selectedSport === "Pickleball")
        return sId === 5 || sName.includes("pickle");
      if (selectedSport === "Badminton")
        return sId === 6 || sName.includes("badminton");
      return sName.includes(selectedSport.toLowerCase());
    });

    return (
      matchesForSport.find((m: any) => m.status === "LIVE") ||
      matchesForSport.find((m: any) => m.status === "SCHEDULED") ||
      matchesForSport[0] ||
      null
    );
  }, [allMatchesList, selectedSport]);

  // Connect socket for live match real-time score updates on home screen
  const matchIdForSocket = activeSportMatch?.id || 0;
  const { matchState: socketMatchState } = useMatchSocket(matchIdForSocket);

  // Combine initial REST match data with real-time Socket.IO match state updates
  const currentLiveMatch = useMemo(() => {
    if (!activeSportMatch) return null;
    const baseObj = socketMatchState
      ? { ...activeSportMatch, ...socketMatchState }
      : activeSportMatch;

    const homeTeamName =
      socketMatchState?.home_team_name ||
      activeSportMatch.home_team_name ||
      activeSportMatch.homeTeamName ||
      activeSportMatch.home_team?.name ||
      activeSportMatch.homeTeam?.name;

    const awayTeamName =
      socketMatchState?.away_team_name ||
      activeSportMatch.away_team_name ||
      activeSportMatch.awayTeamName ||
      activeSportMatch.away_team?.name ||
      activeSportMatch.awayTeam?.name;

    return {
      ...baseObj,
      home_team_name: homeTeamName,
      away_team_name: awayTeamName,
      homePlayers:
        (socketMatchState?.homePlayers?.length
          ? socketMatchState.homePlayers
          : activeSportMatch.homePlayers) || [],
      awayPlayers:
        (socketMatchState?.awayPlayers?.length
          ? socketMatchState.awayPlayers
          : activeSportMatch.awayPlayers) || [],
      periods:
        (socketMatchState?.periods?.length
          ? socketMatchState.periods
          : activeSportMatch.periods) || [],
    };
  }, [activeSportMatch, socketMatchState]);

  // Filter tournaments dynamically for selected sport
  const filteredTournaments = useMemo(() => {
    if (selectedSport === "All Sports" || selectedSport === "All")
      return myTournaments;
    return myTournaments.filter((t: any) => {
      const sName = (t.sport_name || t.sportName || "").toLowerCase();
      const sId = Number(t.sport_id || t.sportId || 0);
      if (selectedSport === "Cricket")
        return sId === 1 || sName.includes("cricket");
      if (selectedSport === "Football")
        return sId === 2 || sName.includes("football");
      if (selectedSport === "Pickleball")
        return sId === 5 || sName.includes("pickle");
      if (selectedSport === "Badminton")
        return sId === 6 || sName.includes("badminton");
      return sName.includes(selectedSport.toLowerCase());
    });
  }, [myTournaments, selectedSport]);

  // Filter bookings dynamically for selected sport
  const filteredBookings = useMemo(() => {
    const rawList = myBookingsData?.data || myBookingsData?.result || [];
    if (selectedSport === "All Sports" || selectedSport === "All")
      return rawList;
    return rawList.filter((b: any) => {
      const sName = (
        b.sport_name ||
        b.sportName ||
        b.ground_name ||
        ""
      ).toLowerCase();
      if (selectedSport === "Cricket") return sName.includes("cricket");
      if (selectedSport === "Football") return sName.includes("football");
      if (selectedSport === "Pickleball") return sName.includes("pickle");
      if (selectedSport === "Badminton") return sName.includes("badminton");
      return true;
    });
  }, [myBookingsData, selectedSport]);

  const loadPlayerTournaments = async (pId: number) => {
    try {
      setTournamentsLoading(true);
      const res = (await fetchTournamentControllerListTournaments({
        queryParams: {
          limit: 30,
          offset: 0,
        },
      })) as any;

      const listArray = res?.data || [];
      const matched: any[] = [];

      const promises = listArray.slice(0, 8).map(async (t: any) => {
        try {
          const parts = (await fetchTournamentControllerGetParticipants({
            pathParams: { id: t.id },
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
      console.log("Failed to load player tournaments:", e);
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
    }, []),
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
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.reset({
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

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {activeBottomTab === "profile" ? (
          <View style={{ flex: 1 }}>
            <EditProfileScreen
              hideBack
              showSignOut
              onSignOut={handleLocalLogout}
            />
          </View>
        ) : (
          <>
            {/* App Bar Header with Sport Selector */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>
                  Hello, {userName.split(" ")[0]}! 👋
                </Text>
                <Text style={styles.headerSubtitle}>
                  {selectedSport} Overview • Ready for victory?
                </Text>
              </View>

              {/* App Bar Sport Selector Pill */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowSportModal(true)}
                style={styles.sportHeaderBtn}
              >
                <Text style={styles.sportHeaderEmoji}>
                  {selectedSport === "Cricket"
                    ? "🏏"
                    : selectedSport === "Football"
                      ? "⚽"
                      : selectedSport === "Pickleball"
                        ? "🏓"
                        : selectedSport === "Badminton"
                          ? "🏸"
                          : "🏆"}
                </Text>
                <Text style={styles.sportHeaderText}>{selectedSport}</Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#00D2FF"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Live Match Card */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{selectedSport} Match</Text>
                  <View
                    style={[
                      styles.liveBadge,
                      currentLiveMatch?.status === "LIVE"
                        ? null
                        : { backgroundColor: "rgba(108, 77, 246, 0.15)" },
                    ]}
                  >
                    {currentLiveMatch?.status === "LIVE" && (
                      <View style={styles.liveDot} />
                    )}
                    <Text
                      style={[
                        styles.liveBadgeText,
                        currentLiveMatch?.status === "LIVE"
                          ? null
                          : { color: "#6C4DF6" },
                      ]}
                    >
                      {currentLiveMatch?.status || "LIVE"}
                    </Text>
                  </View>
                </View>

                {currentLiveMatch ? (
                  (() => {
                    const homePlayerNames = currentLiveMatch.homePlayers
                      ?.map(
                        (p: any) =>
                          p.display_name ||
                          p.displayName ||
                          p.name ||
                          p.user_name ||
                          p.user?.display_name ||
                          p.user?.name ||
                          (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : null)
                      )
                      .filter(Boolean)
                      .join(" & ");
                    const awayPlayerNames = currentLiveMatch.awayPlayers
                      ?.map(
                        (p: any) =>
                          p.display_name ||
                          p.displayName ||
                          p.name ||
                          p.user_name ||
                          p.user?.display_name ||
                          p.user?.name ||
                          (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : null)
                      )
                      .filter(Boolean)
                      .join(" & ");

                    const homeName =
                      currentLiveMatch.home_team_name ||
                      currentLiveMatch.homeTeamName ||
                      (homePlayerNames ? homePlayerNames : "Team 1");

                    const awayName =
                      currentLiveMatch.away_team_name ||
                      currentLiveMatch.awayTeamName ||
                      (awayPlayerNames ? awayPlayerNames : "Team 2");

                    const periods = currentLiveMatch.periods || [];
                    const currentPeriod = periods.find(
                      (p: any) => !p.ended_at,
                    ) ||
                      periods[periods.length - 1] || {
                        home_score: 0,
                        away_score: 0,
                      };

                    const homePointScore = currentPeriod.home_score ?? 0;
                    const awayPointScore = currentPeriod.away_score ?? 0;

                    const homeGamesWon = periods.filter(
                      (p: any) =>
                        p.winner_team_id &&
                        p.winner_team_id ===
                          (currentLiveMatch.home_team_id ||
                            currentLiveMatch.homeTeamId),
                    ).length;
                    const awayGamesWon = periods.filter(
                      (p: any) =>
                        p.winner_team_id &&
                        p.winner_team_id ===
                          (currentLiveMatch.away_team_id ||
                            currentLiveMatch.awayTeamId),
                    ).length;

                    const homeScoreVal =
                      currentLiveMatch.home_score !== undefined &&
                      currentLiveMatch.home_score !== null
                        ? currentLiveMatch.home_score
                        : homeGamesWon > 0
                          ? homeGamesWon
                          : homePointScore;

                    const awayScoreVal =
                      currentLiveMatch.away_score !== undefined &&
                      currentLiveMatch.away_score !== null
                        ? currentLiveMatch.away_score
                        : awayGamesWon > 0
                          ? awayGamesWon
                          : awayPointScore;

                    return (
                      <View style={styles.glassCard}>
                        <Text style={styles.matchSub}>
                          {currentLiveMatch.matchType || "MATCH"} •{" "}
                          {formatDate(
                            currentLiveMatch.created_at ||
                              currentLiveMatch.scheduled_at,
                          )}
                        </Text>

                        <View style={styles.teamsRow}>
                          <View style={styles.teamContainer}>
                            <Text style={styles.teamName}>{homeName}</Text>
                            <Text style={styles.teamScore}>{homeScoreVal}</Text>
                          </View>

                          <Text style={styles.vsText}>VS</Text>

                          <View style={styles.teamContainer}>
                            <Text style={styles.teamName}>{awayName}</Text>
                            <Text style={styles.teamScore}>{awayScoreVal}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.matchCenterBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (
                              currentLiveMatch.status === "LIVE" ||
                              currentLiveMatch.status === "COMPLETED"
                            ) {
                              navigation.navigate("LiveScoring", {
                                matchId: currentLiveMatch.id,
                              });
                            } else {
                              navigation.navigate("MatchHistory");
                            }
                          }}
                        >
                          <Text style={styles.matchCenterText}>
                            Match Center
                          </Text>
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
                      <Text
                        style={[
                          styles.matchSub,
                          { textAlign: "center", marginTop: 4 },
                        ]}
                      >
                        There are currently no active live matches for{" "}
                        {selectedSport}.
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.matchCenterBtn,
                          { paddingHorizontal: 20, marginTop: 14 },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate("MatchHistory")}
                      >
                        <Text style={styles.matchCenterText}>
                          Explore {selectedSport} Matches
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* AI Find Game Promoted Banner */}
              <View style={[styles.section, { marginBottom: 4 }]}>
                <TouchableOpacity
                  style={styles.aiBannerCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate("FindMatch")}
                >
                  <View style={styles.aiBannerLeft}>
                    <View style={styles.aiBannerBadge}>
                      <Ionicons name="sparkles" size={12} color="#FFF" />
                      <Text style={styles.aiBannerBadgeText}>NEW FEATURE</Text>
                    </View>
                    <Text style={styles.aiBannerTitle}>Find Game with AI</Text>
                    <Text style={styles.aiBannerSub}>
                      Tell us when and what you want to play, and our AI will match you instantly.
                    </Text>
                  </View>
                  <View style={styles.aiBannerRight}>
                    <View style={styles.aiBannerIconCircle}>
                      <Ionicons name="sparkles-sharp" size={20} color="#6C4DF6" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Quick Actions Grid */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                  {[
                    { title: "Live Matches", icon: "⚡" },
                    { title: "Book Ground", icon: "🏟️" },
                    { title: "Find Match", icon: "🔍" },
                    { title: "Tournaments", icon: "🏆" },
                    { title: "My Teams", icon: "👥" },
                  ].map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.actionCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (action.title === "Book Ground") {
                          navigation.navigate("GroundsList");
                        } else if (action.title === "Live Matches") {
                          navigation.navigate("MatchHistory");
                        } else if (action.title === "Tournaments") {
                          navigation.navigate("TournamentList");
                        } else if (action.title === "My Teams") {
                          setShowMyTeamsModal(true);
                        } else if (action.title === "Find Match") {
                          navigation.navigate("FindMatch");
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
                      style={{
                        color: "#6C4DF6",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                {tournamentsLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#6C4DF6"
                    style={{ marginVertical: 20 }}
                  />
                ) : filteredTournaments.length === 0 ? (
                  <View style={styles.emptyBookingsBox}>
                    <Text style={styles.emptyBookingsText}>
                      No tournaments found for {selectedSport}.
                    </Text>
                  </View>
                ) : (
                  filteredTournaments.map((item) => {
                    const isLive = item.status === "ONGOING";
                    const isUpcoming = item.status === "UPCOMING";
                    const statusColorVal = isLive
                      ? "#22c55e"
                      : isUpcoming
                        ? "#00D2FF"
                        : "#9CA3AF";

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.bookingItem}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate("TournamentDetails", {
                            tournamentId: item.id,
                          })
                        }
                      >
                        <View style={styles.bookingLeft}>
                          <Text style={styles.bookingGround} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.bookingDate}>
                            Sport: {item.sport_name || "Pickleball"} • Format:{" "}
                            {item.format}
                          </Text>
                          <Text
                            style={[
                              styles.bookingDate,
                              { fontSize: 10, opacity: 0.8 },
                            ]}
                          >
                            Starts:{" "}
                            {item.start_date
                              ? new Date(item.start_date).toLocaleDateString()
                              : "TBD"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor: statusColorVal + "40",
                              backgroundColor: statusColorVal + "12",
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: statusColorVal,
                              fontSize: 9,
                              fontWeight: "900",
                            }}
                          >
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
                      style={{
                        color: "#6C4DF6",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
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
                ) : !filteredBookings || filteredBookings.length === 0 ? (
                  <View style={styles.emptyBookingsBox}>
                    <Text style={styles.emptyBookingsText}>
                      No bookings found for {selectedSport}. Try booking a slot
                      below!
                    </Text>
                  </View>
                ) : (
                  [...filteredBookings]
                    .sort((a, b) => {
                      const dateA = new Date(a.booking_date || 0).getTime();
                      const dateB = new Date(b.booking_date || 0).getTime();
                      if (dateB !== dateA) return dateB - dateA;
                      return (b.id || 0) - (a.id || 0);
                    })
                    .slice(0, 3)
                    .map((item: any, idx: number) => {
                      const statusCol =
                        statusColor[item.booking_status] || "#9CA3AF";
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
                              {formatDate(item.booking_date)} •{" "}
                              {item.slot_start} – {item.slot_end}
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
                                {
                                  color: statusCol,
                                  fontSize: 10,
                                  fontWeight: "700",
                                },
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
          </>
        )}

        {/* Sport Selector Modal */}
        <Modal
          transparent
          visible={showSportModal}
          animationType="fade"
          onRequestClose={() => setShowSportModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSportModal(false)}
          >
            <View style={styles.sportModalContent}>
              <Text style={styles.sportModalTitle}>Choose Sport</Text>
              <Text style={styles.sportModalSub}>
                Filter dashboard matches, tournaments & bookings
              </Text>
              <SizedBox height={14} />

              {[
                { name: "Cricket", emoji: "🏏" },
                { name: "Football", emoji: "⚽" },
                { name: "Pickleball", emoji: "🏓" },
                { name: "Badminton", emoji: "🏸" },
              ].map((item) => {
                const isSelected = selectedSport === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.sportModalOption,
                      isSelected && styles.sportModalOptionActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedSport(item.name);
                      setShowSportModal(false);
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 20, marginRight: 12 }}>
                        {item.emoji}
                      </Text>
                      <Text
                        style={[
                          styles.sportModalOptionText,
                          isSelected && styles.sportModalOptionTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#00D2FF"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Bottom Navigation Bar */}
        <View
          style={[
            styles.bottomTabBar,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBarItem,
              activeBottomTab === "dashboard" && styles.tabBarItemActive,
            ]}
            onPress={() => setActiveBottomTab("dashboard")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeBottomTab === "dashboard" ? "grid" : "grid-outline"}
              size={20}
              color={activeBottomTab === "dashboard" ? "#A78BFA" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.tabBarLabel,
                activeBottomTab === "dashboard" && styles.tabBarLabelActive,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBarItem,
              activeBottomTab === "profile" && styles.tabBarItemActive,
            ]}
            onPress={() => setActiveBottomTab("profile")}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeBottomTab === "profile" ? "person" : "person-outline"}
              size={20}
              color={activeBottomTab === "profile" ? "#A78BFA" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.tabBarLabel,
                activeBottomTab === "profile" && styles.tabBarLabelActive,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#9CA3AF",
    fontSize: 11,
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
  sportHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 210, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sportHeaderEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  sportHeaderText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sportModalContent: {
    backgroundColor: "#120E2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sportModalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  sportModalSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },
  sportModalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  sportModalOptionActive: {
    backgroundColor: "rgba(0, 210, 255, 0.12)",
    borderColor: "#00D2FF",
  },
  sportModalOptionText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
  sportModalOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(22, 14, 42, 0.98)",
    borderTopWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.25)",
    paddingTop: 10,
    paddingHorizontal: 30,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabBarItem: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabBarItemActive: {
    backgroundColor: "rgba(108, 77, 246, 0.18)",
    borderColor: "rgba(167, 139, 250, 0.4)",
  },
  tabBarLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  tabBarLabelActive: {
    color: "#A78BFA",
    fontWeight: "700",
  },
  aiBannerCard: {
    backgroundColor: "#1D113C",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 6,
  },
  aiBannerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  aiBannerBadge: {
    backgroundColor: "#6C4DF6",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 6,
  },
  aiBannerBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
  },
  aiBannerTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  aiBannerSub: {
    color: "#9CA3AF",
    fontSize: 11,
    lineHeight: 15,
  },
  aiBannerRight: {
    justifyContent: "center",
    alignItems: "center",
  },
  aiBannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PlayerHomeScreen;
