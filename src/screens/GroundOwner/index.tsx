import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../utils/types";
import { storage } from "../../services/mmkv";
import SizedBox from "../../Components/atoms/SizeBox";
import { useGroundControllerGetMyGrounds } from "../../Api/playVerseComponents";
import { ActivityIndicator } from "react-native";
import { showMessage } from "react-native-flash-message";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GroundOwnerHomeScreen = () => {
  const navigation = useNavigation<any>();
  const [userName, setUserName] = useState("Owner");

  // Fetch grounds to get AI insights
  const { data: myGroundsData, isLoading, refetch } =
    useGroundControllerGetMyGrounds<any>({
      queryParams: {
        page: 1,
        limit: 10,
      },
    });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.log("Failed to refresh grounds:", e);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const dashboardStats = myGroundsData?.dashboard_stats;
  const aiInsights =
    myGroundsData?.ai_insights || myGroundsData?.data?.ai_insights;

  // Extract owner price and market average dynamically
  const ownerPrice = aiInsights?.price_analysis?.owner_price ?? 500;
  const marketPrice = aiInsights?.price_analysis?.market_average ?? 650;

  // Calculate relative positions for visual gauge (range: 0 to maxPrice * 1.3)
  const maxScaleVal = Math.max(ownerPrice, marketPrice, 100) * 1.3;
  const ownerPos = Math.round((ownerPrice / maxScaleVal) * 100);
  const marketPos = Math.round((marketPrice / maxScaleVal) * 100);

  const parsePercent = (
    text: string,
    keyword: string,
    defaultValue: number,
  ): number => {
    try {
      if (!text) return defaultValue;
      const index = text.toLowerCase().indexOf(keyword.toLowerCase());
      if (index === -1) return defaultValue;
      const sub = text.substring(index - 20, index + 20);
      const match = sub.match(/(\d+)\s*%/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      try {
        const stored = storage.getString("userProfile");
        if (stored) {
          const userObj = JSON.parse(stored);
          if (userObj?.display_name) {
            setUserName(userObj.display_name);
          }
        }
      } catch (e) {
        console.log("Failed to parse user profile:", e);
      }
      refetch();
    }, [refetch])
  );

  const orb1X = useSharedValue(SCREEN_WIDTH * 0.2);
  const orb1Y = useSharedValue(SCREEN_HEIGHT * 0.15);

  useEffect(() => {
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
    navigation.reset({
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

      <Animated.View style={[styles.floatingOrb, styles.orb1, animatedOrb1]} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.greeting} numberOfLines={1}>
              Hello, {userName.split(" ")[0]}! 🏟️
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Manage your grounds and daily bookings
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6C4DF6"
              colors={["#6C4DF6"]}
            />
          }
        >
          {/* Quick Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Grounds</Text>
              <Text style={styles.metricValue}>
                {dashboardStats?.total_grounds}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Today's Bookings</Text>
              <Text style={styles.metricValue}>
                {dashboardStats?.today_bookings}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Revenue (Today)</Text>
              <Text style={[styles.metricValue, styles.revenueText]}>
                {dashboardStats?.today_revenue}
              </Text>
            </View>
          </View>

          <SizedBox height={10} />

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("AddEditGround")}
              >
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionTitle}>Add Ground</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("GroundsList")}
              >
                <Text style={styles.actionIcon}>🏟️</Text>
                <Text style={styles.actionTitle}>My Grounds</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("GroundBookings")}
              >
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionTitle}>Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("EditProfile")}
              >
                <Text style={styles.actionIcon}>👤</Text>
                <Text style={styles.actionTitle}>Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Insights & Pricing Analytics */}
          {isLoading ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#6C4DF6" />
              <SizedBox height={8} />
              <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12 }}>
                Loading AI Insights...
              </Text>
            </View>
          ) : aiInsights ? (
            <View style={styles.section}>
              <View style={styles.aiInsightsHeader}>
                <Text style={styles.sectionTitle}>
                  ✨ PlayVerse AI Insights
                </Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Assistant</Text>
                </View>
              </View>

              {/* Overall Summary Card */}
              <View style={styles.aiSummaryCard}>
                <Text style={styles.aiSummaryText}>
                  {aiInsights.overall_summary ||
                    "Your ground is ready for pricing recommendations."}
                </Text>
              </View>

              <SizedBox height={16} />

              {/* Price Competitiveness Gauge */}
              <View style={styles.aiCard}>
                <View style={styles.priceHeader}>
                  <Text style={styles.aiCardTitle}>Price Competitiveness</Text>
                  <View
                    style={[
                      styles.badge,
                      aiInsights.price_analysis?.competitiveness ===
                      "Overpriced"
                        ? styles.badgeDanger
                        : aiInsights.price_analysis?.competitiveness ===
                            "Underpriced"
                          ? styles.badgeWarning
                          : styles.badgeSuccess,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {aiInsights.price_analysis?.competitiveness ||
                        "Competitive"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.aiCardDesc}>
                  {aiInsights.price_analysis?.comparison_summary}
                </Text>

                <SizedBox height={16} />

                {/* Modern Side-by-Side Comparison Blocks */}
                <View style={styles.priceRow}>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceBlockLabel}>
                      YOUR AVERAGE PRICE
                    </Text>
                    <Text style={styles.priceBlockVal}>₹{ownerPrice}</Text>
                    <Text style={styles.priceBlockSub}>per hour</Text>
                  </View>
                  <View style={styles.priceDivider}>
                    <Text style={styles.priceDividerText}>vs</Text>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text
                      style={[styles.priceBlockLabel, { color: "#FF9100" }]}
                    >
                      MARKET AVERAGE
                    </Text>
                    <Text style={[styles.priceBlockVal, { color: "#FF9100" }]}>
                      ₹{marketPrice}
                    </Text>
                    <Text style={styles.priceBlockSub}>nearby grounds</Text>
                  </View>
                </View>

                <SizedBox height={20} />

                {/* Thicker, Highly Readable Visual Gauge Bar */}
                <View style={styles.sliderContainer}>
                  {/* Background Track */}
                  <View style={styles.sliderTrack} />

                  {/* Fill track up to Owner's Price */}
                  <View
                    style={[styles.sliderFill, { width: `${ownerPos}%` }]}
                  />

                  {/* Marker for Owner Price */}
                  <View
                    style={[
                      styles.sliderMarker,
                      { left: `${ownerPos}%`, marginLeft: -12 },
                    ]}
                  >
                    <View style={styles.markerDotOwner} />
                    <Text style={styles.markerLabelOwner}>You</Text>
                  </View>

                  {/* Marker for Market Price */}
                  <View
                    style={[
                      styles.sliderMarker,
                      { left: `${marketPos}%`, marginLeft: -12 },
                    ]}
                  >
                    <View style={styles.markerDotMarket} />
                    <Text style={styles.markerLabelMarket}>Market</Text>
                  </View>
                </View>

                <SizedBox height={12} />
              </View>

              <SizedBox height={16} />

              {/* Weekday vs Weekend Chart */}
              <View style={styles.aiCard}>
                <Text style={styles.aiCardTitle}>Booking Trends</Text>
                <Text style={styles.aiCardDesc}>
                  {aiInsights.booking_trends?.weekday_vs_weekend_analysis}
                </Text>

                <SizedBox height={24} />

                {/* Custom Visual Bar Chart */}
                <View style={styles.chartContainer}>
                  <View style={styles.chartYAxis}>
                    <Text style={styles.yLabel}>100%</Text>
                    <Text style={styles.yLabel}>50%</Text>
                    <Text style={styles.yLabel}>0%</Text>
                  </View>

                  <View style={styles.chartBarsRow}>
                    {/* Weekday Bar */}
                    <View style={styles.chartBarWrapper}>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[
                            styles.chartBarFill,
                            {
                              height: `${parsePercent(aiInsights.booking_trends?.weekday_vs_weekend_analysis, "weekday", 40)}%`,
                              backgroundColor: "#00D2FF",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartBarLabel}>
                        Weekdays (
                        {parsePercent(
                          aiInsights.booking_trends
                            ?.weekday_vs_weekend_analysis,
                          "weekday",
                          40,
                        )}
                        %)
                      </Text>
                    </View>

                    {/* Weekend Bar */}
                    <View style={styles.chartBarWrapper}>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[
                            styles.chartBarFill,
                            {
                              height: `${parsePercent(aiInsights.booking_trends?.weekday_vs_weekend_analysis, "weekend", 60)}%`,
                              backgroundColor: "#6C4DF6",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartBarLabel}>
                        Weekends (
                        {parsePercent(
                          aiInsights.booking_trends
                            ?.weekday_vs_weekend_analysis,
                          "weekend",
                          60,
                        )}
                        %)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <SizedBox height={16} />

              {/* Slot Insights Row */}
              <View style={styles.slotsRow}>
                <View style={[styles.slotInsightBox, { marginRight: 10 }]}>
                  <Text style={[styles.slotInsightTitle, { color: "#00E676" }]}>
                    🔥 Popular Slots
                  </Text>
                  <SizedBox height={8} />
                  {aiInsights.booking_trends?.most_popular_slots?.map(
                    (slot: string, idx: number) => (
                      <Text key={idx} style={styles.slotInsightText}>
                        • {slot}
                      </Text>
                    ),
                  ) || <Text style={styles.slotInsightText}>N/A</Text>}
                </View>

                <View style={styles.slotInsightBox}>
                  <Text style={[styles.slotInsightTitle, { color: "#FF9100" }]}>
                    ⚠️ Underperforming
                  </Text>
                  <SizedBox height={8} />
                  {aiInsights.booking_trends?.underperforming_slots?.map(
                    (slot: string, idx: number) => (
                      <Text key={idx} style={styles.slotInsightText}>
                        • {slot}
                      </Text>
                    ),
                  ) || <Text style={styles.slotInsightText}>N/A</Text>}
                </View>
              </View>

              <SizedBox height={16} />

              {/* Business Suggestions */}
              {aiInsights.business_suggestions &&
                aiInsights.business_suggestions.length > 0 && (
                  <View style={styles.aiCard}>
                    <Text style={styles.aiCardTitle}>
                      💡 Actionable Suggestions
                    </Text>
                    <SizedBox height={12} />
                    {aiInsights.business_suggestions.map(
                      (suggestion: string, idx: number) => (
                        <View key={idx} style={styles.suggestionRow}>
                          <Text style={styles.suggestionBullet}>✔</Text>
                          <Text style={styles.suggestionText}>
                            {suggestion}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                )}
            </View>
          ) : null}

          <SizedBox height={30} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default GroundOwnerHomeScreen;

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
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  metricLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  revenueText: {
    color: "#00E676",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  approvalCard: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  approvalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  approvalGround: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  approvalTime: {
    color: "#00D2FF",
    fontSize: 11,
    fontWeight: "600",
  },
  approvalUser: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 14,
  },
  approvalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineBtn: {
    backgroundColor: "rgba(255, 62, 62, 0.08)",
    borderColor: "rgba(255, 62, 62, 0.2)",
  },
  declineText: {
    color: "#FF3E3E",
    fontSize: 12,
    fontWeight: "700",
  },
  approveBtn: {
    backgroundColor: "rgba(0, 230, 118, 0.08)",
    borderColor: "rgba(0, 230, 118, 0.2)",
  },
  approveText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "700",
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  aiInsightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  aiBadge: {
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiBadgeText: {
    color: "#a594ff",
    fontSize: 10,
    fontWeight: "700",
  },
  aiSummaryCard: {
    backgroundColor: "rgba(108, 77, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.15)",
    borderRadius: 16,
    padding: 16,
  },
  aiSummaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
  },
  aiCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  aiCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  aiCardDesc: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeWarning: {
    backgroundColor: "rgba(255, 145, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 145, 0, 0.3)",
  },
  badgeDanger: {
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
  badgeSuccess: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  priceBlock: {
    flex: 1,
    alignItems: "center",
  },
  priceBlockLabel: {
    color: "#00D2FF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceBlockVal: {
    color: "#00D2FF",
    fontSize: 22,
    fontWeight: "800",
  },
  priceBlockSub: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },
  priceDivider: {
    paddingHorizontal: 12,
  },
  priceDividerText: {
    color: "rgba(255, 255, 255, 0.15)",
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
  },
  sliderContainer: {
    height: 48,
    justifyContent: "center",
    position: "relative",
    marginTop: 8,
  },
  sliderTrack: {
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 5,
    width: "100%",
  },
  sliderFill: {
    height: 10,
    backgroundColor: "rgba(0, 210, 255, 0.3)",
    borderRadius: 5,
    position: "absolute",
  },
  sliderMarker: {
    position: "absolute",
    alignItems: "center",
    top: 12, // centers vertically: (height 48 - dot 24) / 2 = 12
  },
  markerDotOwner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#00D2FF",
    borderWidth: 4,
    borderColor: "#120E2E",
    shadowColor: "#00D2FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabelOwner: {
    color: "#00D2FF",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  markerDotMarket: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF9100",
    borderWidth: 4,
    borderColor: "#120E2E",
    shadowColor: "#FF9100",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabelMarket: {
    color: "#FF9100",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  chartContainer: {
    flexDirection: "row",
    height: 150,
    alignItems: "stretch",
    marginTop: 10,
  },
  chartYAxis: {
    justifyContent: "space-between",
    paddingRight: 10,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  yLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
  },
  chartBarsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingLeft: 10,
  },
  chartBarWrapper: {
    alignItems: "center",
    width: "40%",
  },
  chartBarTrack: {
    height: 110,
    width: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 12,
  },
  chartBarLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
  },
  slotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  slotInsightBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
  },
  slotInsightTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  slotInsightText: {
    color: "#E5E7EB",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  suggestionBullet: {
    color: "#6C4DF6",
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 8,
  },
  suggestionText: {
    color: "#E5E7EB",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
