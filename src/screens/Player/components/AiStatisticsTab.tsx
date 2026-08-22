import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SkeletonLoader from "./SkeletonLoader";
import PerformanceChart from "./PerformanceChart";
import {
  usePlayerProfileControllerGetStatistics,
  usePlayerProfileControllerGetAiInsights,
  usePlayerProfileControllerGetSportStatistics,
  usePlayerProfileControllerGetPerformanceHistory,
  usePlayerProfileControllerGetForm,
  usePlayerProfileControllerGetSkillRating,
  usePlayerProfileControllerGetAchievements,
  usePlayerProfileControllerGetRankings,
} from "../../../Api/playVerseComponents";
import SizedBox from "../../../Components/atoms/SizeBox";

// ── Static pools (Cricket + Pickleball combined) ──────────────────────────────
const STATIC_STRENGTHS: string[] = [
  "Strong hand-eye coordination transferable across both cricket and pickleball",
  "Advanced pickleball footwork enhances fielding agility in cricket",
  "High dink volume indicates exceptional touch and net control",
  "Consistent batting form shows disciplined shot selection",
  "Quick reflexes from pickleball rallies improve cricket catching speed",
  "Powerful serve delivery creates strong first-strike advantage",
  "Tactical awareness — reading opponent patterns in both sports",
  "High volley count reflects excellent reaction time at the net",
  "Endurance to compete across long innings and extended pickleball matches",
  "Cross-sport strategic thinking: applying cricket match awareness on the pickleball court",
];

const STATIC_DRILLS: string[] = [
  "Shadow batting + pickleball wall drills — 20 min alternating sessions",
  "Multi-ball feed drill to sharpen reaction time for both sports",
  "Footwork ladder drills combining cricket crease movement and pickleball split steps",
  "Dink consistency drill: 100 cross-court dinks without error",
  "Cricket throw-down sessions targeting low-trajectory balls (mimics pickleball low shots)",
  "Serve + third-shot drop combo drill for 15 minutes daily",
  "Cone agility circuit for fielding and court coverage improvement",
  "Video analysis of top pickleball players — focus on kitchen strategy",
  "Core strength circuit: planks, rotational medicine ball throws, and lateral band walks",
  "Match simulation: alternate 2 sets of pickleball with 1 hour net practice in cricket",
];

const pickRandom = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
// ──────────────────────────────────────────────────────────────────────────────

const SPORTS_OPTIONS = [
  { id: 1, name: "Cricket", icon: "🏏" },
  { id: 2, name: "Football", icon: "⚽" },
  { id: 5, name: "Pickleball", icon: "🏓" },
  { id: 6, name: "Badminton", icon: "🏸" },
];

interface AiStatisticsTabProps {
  playerId: number;
}

const AiStatisticsTab: React.FC<AiStatisticsTabProps> = ({ playerId }) => {
  const [selectedSportId, setSelectedSportId] = useState<number>(1);

  // Randomly pick 2 strengths and 2 drills once per mount
  const randomStrengths = useMemo(() => pickRandom(STATIC_STRENGTHS, 2), []);
  const randomDrills = useMemo(() => pickRandom(STATIC_DRILLS, 2), []);

  // Collapsible cards state
  const [expandedCard, setExpandedCard] = useState<"strengths" | "improvements" | "recommendations" | null>("strengths");

  // API hooks
  const {
    data: statsData,
    isLoading: isStatsLoading,
  } = usePlayerProfileControllerGetStatistics<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  const {
    data: aiInsightsData,
    isLoading: isAiLoading,
  } = usePlayerProfileControllerGetAiInsights<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  const {
    data: sportStatsData,
    isLoading: isSportLoading,
    refetch: refetchSportStats,
  } = usePlayerProfileControllerGetSportStatistics<any>(
    { pathParams: { playerId, sportId: selectedSportId } },
    { enabled: !!playerId && !!selectedSportId }
  );

  const {
    data: historyData,
    isLoading: isHistoryLoading,
  } = usePlayerProfileControllerGetPerformanceHistory<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  const {
    data: formData,
    isLoading: isFormLoading,
  } = usePlayerProfileControllerGetForm<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  const {
    data: skillData,
    isLoading: isSkillLoading,
  } = usePlayerProfileControllerGetSkillRating<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  const {
    data: achieveData,
    isLoading: isAchieveLoading,
  } = usePlayerProfileControllerGetAchievements<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  const {
    data: rankingsData,
    isLoading: isRankingsLoading,
  } = usePlayerProfileControllerGetRankings<any>(
    { pathParams: { playerId } },
    { enabled: !!playerId }
  );

  // Refetch sport stats when selected sport changes
  useEffect(() => {
    if (playerId && selectedSportId) {
      refetchSportStats();
    }
  }, [selectedSportId]);

  // Fallback / parsed stats
  const stats = statsData?.result || statsData?.data || statsData || {};
  const aiRaw = aiInsightsData?.result || aiInsightsData?.data || aiInsightsData || {};
  const sportStatsRaw = sportStatsData?.result || sportStatsData?.data || sportStatsData || {};
  const historyRaw = historyData?.result || historyData?.data || historyData || {};
  const formRaw = formData?.result || formData?.data || formData || {};
  const skillRaw = skillData?.result || skillData?.data || skillData || {};
  const achieveRaw = achieveData?.result || achieveData?.data || achieveData;
  const rankingsRaw = rankingsData?.result || rankingsData?.data || rankingsData || {};

  // ─── OVERALL STATS ───────────────────────────────────────────────────────────
  // API: { data: { matchesPlayed, wins, losses, draws, aiResponse: { winPercentage } } }
  const totalMatches = stats.matchesPlayed ?? stats.totalMatches ?? stats.total_matches ?? 0;
  const wins = stats.wins ?? 0;
  const losses = stats.losses ?? 0;
  const winPercent = stats.aiResponse?.winPercentage ?? stats.winPercentage ?? stats.win_percentage ?? 0;

  // ─── SPORT STATS ─────────────────────────────────────────────────────────────
  // API: { data: { metrics: [{name, value, percentile}], analysis } }
  const buildMetricsMap = (raw: any): Record<string, number> => {
    const arr: any[] = Array.isArray(raw?.metrics) ? raw.metrics : [];
    const map: Record<string, number> = {};
    arr.forEach((m: any) => {
      if (m?.name) map[m.name.toLowerCase().replace(/\s+/g, "_")] = m.value ?? 0;
    });
    return map;
  };
  const sportMetrics = buildMetricsMap(sportStatsRaw);
  const sportAnalysis: string = sportStatsRaw.analysis ?? "";

  // ─── RECENT FORM ──────────────────────────────────────────────────────────────
  // API: { data: { recentForm: ["W","L",...], winningStreak, losingStreak, performanceTrend } }
  const form: string[] = Array.isArray(formRaw?.recentForm)
    ? formRaw.recentForm
    : Array.isArray(formRaw?.form)
    ? formRaw.form
    : [];
  const winningStreak: number = formRaw.winningStreak ?? formRaw.winning_streak ?? 0;
  const losingStreak: number = formRaw.losingStreak ?? formRaw.losing_streak ?? 0;
  const performanceTrend: string = formRaw.performanceTrend ?? formRaw.trend ?? "";
  const streak: string =
    winningStreak > 1
      ? `🔥 ${winningStreak} Win Streak`
      : losingStreak > 1
      ? `📉 ${losingStreak} Loss Streak`
      : performanceTrend === "DOWN"
      ? "📉 Downward Trend"
      : performanceTrend === "UP"
      ? "🔥 Upward Trend"
      : "No Active Streak";

  // ─── PERFORMANCE HISTORY ──────────────────────────────────────────────────────
  // API: { data: { matchHistory: [{match_id, date, result}], performanceTrends, scoreTrends } }
  const matchHistoryArr: any[] = Array.isArray(historyRaw?.matchHistory) ? historyRaw.matchHistory : [];
  // Convert W/L history to a numeric trend line (cumulative wins)
  let cumWins = 0;
  const trendHistory: number[] = matchHistoryArr.map((m: any) => {
    if (m.result === "Win" || m.result === "W") cumWins++;
    return cumWins;
  });

  // ─── SKILL RATINGS ────────────────────────────────────────────────────────────
  // API: { data: { sportsRatings: [{sportName, ratingName, calculatedSkillScore, rankOrder}], ratingAnalysis } }
  const sportsRatingsArr: any[] = Array.isArray(skillRaw?.sportsRatings) ? skillRaw.sportsRatings : [];
  // Compute average skill score across sports
  const avgSkillScore =
    sportsRatingsArr.length > 0
      ? Math.round(sportsRatingsArr.reduce((s: number, r: any) => s + (r.calculatedSkillScore ?? 0), 0) / sportsRatingsArr.length)
      : 0;
  const skillAnalysis: string = skillRaw.ratingAnalysis ?? "";
  const ratings = {
    Speed: skillRaw.speed ?? 0,
    Power: skillRaw.power ?? 0,
    Control: skillRaw.control ?? 0,
    Tactics: skillRaw.tactics ?? 0,
    overall: avgSkillScore,
  };

  // ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
  // API: { data: [{title, description, dateEarned}] }
  const achievements: any[] = Array.isArray(achieveRaw) ? achieveRaw : Array.isArray(achieveRaw?.achievements) ? achieveRaw.achievements : [];

  // ─── RANKINGS ─────────────────────────────────────────────────────────────────
  // API: { data: { sportRanking, localRanking, tournamentRanking, categoryRanking, totalPoints, rankingSummary } }
  const rankings = {
    overall: rankingsRaw.sportRanking ?? rankingsRaw.globalRank ?? rankingsRaw.overall ?? "—",
    regional: rankingsRaw.localRanking ?? rankingsRaw.regionalRank ?? rankingsRaw.regional ?? "—",
    tournament: rankingsRaw.tournamentRanking ?? "—",
    category: rankingsRaw.categoryRanking ?? "—",
    points: rankingsRaw.totalPoints ?? 0,
    trend: rankingsRaw.trend ?? rankingsRaw.change ?? "",
    summary: rankingsRaw.rankingSummary ?? "",
  };

  // ─── AI INSIGHTS ──────────────────────────────────────────────────────────────
  // API: { data: { playerId, insight, focusAreas: [...] } }
  const aiSummary: string =
    aiRaw.insight ??
    aiRaw.summary ??
    "AI analyst insights are not available. Play more matches to unlock insights.";
  const strengths: string[] = aiRaw.strengths ?? [];
  const improvements: string[] = aiRaw.focusAreas ?? aiRaw.areasForImprovement ?? aiRaw.improvements ?? [];
  const recommendations: string[] = aiRaw.recommendedDrills ?? aiRaw.recommendations ?? [];


  // Sport specific metrics — read from parsed metrics map
  const getSportSpecificMetrics = () => {
    if (selectedSportId === 1) {
      // Cricket
      return [
        { label: "Matches", value: sportMetrics["matches_played"] ?? sportMetrics["matches"] ?? 0 },
        { label: "Runs Scored", value: sportMetrics["runs_scored"] ?? sportMetrics["runs"] ?? 0 },
        { label: "Wickets", value: sportMetrics["wickets"] ?? 0 },
        { label: "Batting Avg", value: sportMetrics["batting_avg"] ?? sportMetrics["batting_average"] ?? 0 },
      ];
    } else if (selectedSportId === 2) {
      // Football
      return [
        { label: "Matches", value: sportMetrics["matches_played"] ?? sportMetrics["matches"] ?? 0 },
        { label: "Goals", value: sportMetrics["goals"] ?? 0 },
        { label: "Assists", value: sportMetrics["assists"] ?? 0 },
        { label: "Passing %", value: sportMetrics["passing_%"] ?? sportMetrics["passing_accuracy"] ?? 0 },
      ];
    } else if (selectedSportId === 5) {
      // Pickleball
      return [
        { label: "Matches", value: sportMetrics["matches_played"] ?? sportMetrics["matches"] ?? 0 },
        { label: "Aces", value: sportMetrics["aces"] ?? 0 },
        { label: "Dinks", value: sportMetrics["dinks"] ?? 0 },
        { label: "Volleys", value: sportMetrics["volleys"] ?? 0 },
        { label: "Points", value: sportMetrics["points"] ?? 0 },
        { label: "Wins", value: sportMetrics["wins"] ?? sportMetrics["matches_won"] ?? 0 },
        { label: "Win Rate", value: `${sportMetrics["win_percentage"] ?? sportMetrics["win_rate"] ?? 0}%` },
      ];
    } else {
      // Badminton
      return [
        { label: "Matches", value: sportMetrics["matches_played"] ?? sportMetrics["matches"] ?? 0 },
        { label: "Smashes", value: sportMetrics["smashes"] ?? 0 },
        { label: "Aces", value: sportMetrics["aces"] ?? 0 },
        { label: "Net Play", value: sportMetrics["net_play"] ?? sportMetrics["net_accuracy"] ?? 0 },
      ];
    }
  };

  const isLoading =
    isStatsLoading ||
    isAiLoading ||
    isHistoryLoading ||
    isFormLoading ||
    isSkillLoading ||
    isAchieveLoading ||
    isRankingsLoading;

  if (isLoading) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <SkeletonLoader style={{ height: 100, borderRadius: 16, marginBottom: 14 }} />
        <SkeletonLoader style={{ height: 150, borderRadius: 16, marginBottom: 14 }} />
        <SkeletonLoader style={{ height: 50, borderRadius: 12, marginBottom: 14 }} />
        <SkeletonLoader style={{ height: 180, borderRadius: 16, marginBottom: 14 }} />
        <SkeletonLoader style={{ height: 200, borderRadius: 16 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Quick Stats Header */}
      <View style={styles.quickStatsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Matches</Text>
          <Text style={styles.statValue}>{totalMatches}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Wins</Text>
          <Text style={[styles.statValue, { color: "#22c55e" }]}>{wins}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Losses</Text>
          <Text style={[styles.statValue, { color: "#EF4444" }]}>{losses}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Win %</Text>
          <Text style={[styles.statValue, { color: "#00D2FF" }]}>{winPercent}%</Text>
        </View>
      </View>

      {/* Sport Specific Metrics */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Sport Statistics</Text>

        {/* Sport selector chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
          {SPORTS_OPTIONS.map((sport) => {
            const isSelected = selectedSportId === sport.id;
            return (
              <TouchableOpacity
                key={sport.id}
                style={[styles.sportTabChip, isSelected && styles.sportTabChipActive]}
                onPress={() => setSelectedSportId(sport.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.sportTabChipEmoji}>{sport.icon}</Text>
                <Text style={[styles.sportTabChipText, isSelected && styles.sportTabChipTextActive]}>
                  {sport.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sport details */}
        {isSportLoading ? (
          <ActivityIndicator size="small" color="#00D2FF" style={{ marginVertical: 20 }} />
        ) : (() => {
          const metrics = getSportSpecificMetrics();
          const hasData = metrics.some((m) => Number(m.value) !== 0 || typeof m.value === "string" && m.value !== "0%");
          if (!hasData) return null;
          return (
            <>
              <View style={styles.sportMetricsGrid}>
                {metrics.map((metric, i) => (
                  <View key={i} style={styles.sportMetricBox}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                  </View>
                ))}
              </View>
              {!!sportAnalysis && (
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 18, marginTop: 10, fontStyle: "italic" }}>
                  {sportAnalysis}
                </Text>
              )}
            </>
          );
        })()}
      </View>

      {/* AI Insights callout */}
      <View style={styles.insightsCard}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="sparkles" size={18} color="#00D2FF" style={{ marginRight: 6 }} />
          <Text style={styles.insightsHeader}>AI Performance Analyst</Text>
        </View>
        <Text style={styles.aiSummary}>{aiSummary}</Text>

        {/* Collapsible strengths */}
        <TouchableOpacity
          style={styles.collapsibleRow}
          onPress={() => setExpandedCard(expandedCard === "strengths" ? null : "strengths")}
          activeOpacity={0.8}
        >
          <Text style={styles.collapsibleLabel}>💪 Key Strengths</Text>
          <Ionicons
            name={expandedCard === "strengths" ? "chevron-up" : "chevron-down"}
            size={16}
            color="#00D2FF"
          />
        </TouchableOpacity>
        {expandedCard === "strengths" && (
          <View style={styles.collapsibleContent}>
            {randomStrengths.map((str: string, i: number) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{str}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Collapsible improvements */}
        <TouchableOpacity
          style={styles.collapsibleRow}
          onPress={() => setExpandedCard(expandedCard === "improvements" ? null : "improvements")}
          activeOpacity={0.8}
        >
          <Text style={styles.collapsibleLabel}>🎯 Areas to Focus</Text>
          <Ionicons
            name={expandedCard === "improvements" ? "chevron-up" : "chevron-down"}
            size={16}
            color="#00D2FF"
          />
        </TouchableOpacity>
        {expandedCard === "improvements" && (
          <View style={styles.collapsibleContent}>
            {improvements.map((imp: string, i: number) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{imp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Collapsible recommendations */}
        <TouchableOpacity
          style={styles.collapsibleRow}
          onPress={() => setExpandedCard(expandedCard === "recommendations" ? null : "recommendations")}
          activeOpacity={0.8}
        >
          <Text style={styles.collapsibleLabel}>💡 Custom Drills & Plan</Text>
          <Ionicons
            name={expandedCard === "recommendations" ? "chevron-up" : "chevron-down"}
            size={16}
            color="#00D2FF"
          />
        </TouchableOpacity>
        {expandedCard === "recommendations" && (
          <View style={styles.collapsibleContent}>
            {randomDrills.map((rec: string, i: number) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent Form */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRowSpace}>
          <Text style={styles.sectionHeader}>Recent Form</Text>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
        {form.length > 0 ? (
          <View style={styles.formRow}>
            {form.map((res: string, i: number) => {
              const isWin = res.toUpperCase() === "W";
              return (
                <View key={i} style={[styles.formBadge, isWin ? styles.formBadgeWin : styles.formBadgeLoss]}>
                  <Text style={styles.formBadgeText}>{res}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 12, marginTop: 4 }}>No recent matches played.</Text>
        )}
      </View>

      {/* Performance History Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Rating History Trend</Text>
        {trendHistory.length > 0 ? (
          <PerformanceChart data={trendHistory} labels={trendHistory.map((_: any, i: number) => `M${i + 1}`)} />
        ) : (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 12 }}>No rating history available.</Text>
          </View>
        )}
      </View>

      {/* Skill rating — show per-sport scores */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRowSpace}>
          <Text style={styles.sectionHeader}>Skill Dashboard</Text>
          <View style={styles.overallRatingBadge}>
            <Text style={styles.overallRatingLabel}>AVG</Text>
            <Text style={styles.overallRatingVal}>{ratings.overall}</Text>
          </View>
        </View>
        <SizedBox height={8} />

        {sportsRatingsArr.length > 0 ? (
          sportsRatingsArr.map((r: any, idx: number) => (
            <View key={idx} style={styles.skillRow}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>
                  {r.sportName}{r.ratingName ? ` · ${r.ratingName}` : ""}
                </Text>
                <Text style={styles.skillValue}>{r.calculatedSkillScore ?? 0}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(r.calculatedSkillScore ?? 0, 100)}%` as any }]} />
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>No skill ratings yet.</Text>
        )}
        {!!skillAnalysis && (
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 17, marginTop: 10, fontStyle: "italic" }}>
            {skillAnalysis}
          </Text>
        )}
      </View>

      {/* Rankings */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Division & Standings</Text>
        <View style={styles.rankingsRow}>
          <View style={styles.rankBox}>
            <Text style={styles.rankTitle}>Sport Rank</Text>
            <Text style={styles.rankNum}>#{rankings.overall}</Text>
          </View>
          <View style={styles.rankSeparator} />
          <View style={styles.rankBox}>
            <Text style={styles.rankTitle}>Local Rank</Text>
            <Text style={styles.rankNum}>#{rankings.regional}</Text>
          </View>
          <View style={styles.rankSeparator} />
          <View style={styles.rankBox}>
            <Text style={styles.rankTitle}>Tournament</Text>
            <Text style={styles.rankNum}>#{rankings.tournament}</Text>
          </View>
          <View style={styles.rankSeparator} />
          <View style={styles.rankBox}>
            <Text style={styles.rankTitle}>Category</Text>
            <Text style={styles.rankNum}>#{rankings.category}</Text>
          </View>
        </View>
        {rankings.points > 0 && (
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 8, textAlign: "center" }}>
            🏅 Total Points: {rankings.points}
          </Text>
        )}
        {!!rankings.summary && (
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 16, marginTop: 6, fontStyle: "italic" }}>
            {rankings.summary}
          </Text>
        )}
      </View>

      {/* Achievements grid */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Milestones & Medals</Text>
        {achievements.length > 0 ? (
          <View style={styles.achieveGrid}>
            {achievements.map((ach: any, idx: number) => (
              <View key={idx} style={styles.achieveBox}>
                <Text style={styles.achieveIcon}>🏆</Text>
                <Text style={styles.achieveName} numberOfLines={2}>
                  {ach.title ?? ach.name}
                </Text>
                <Text style={styles.achieveDesc} numberOfLines={2}>
                  {ach.description ?? ach.desc}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 12, marginTop: 4 }}>No achievements earned yet.</Text>
        )}
      </View>
      <SizedBox height={65} />
    </ScrollView>
  );
};

export default AiStatisticsTab;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  insightsCard: {
    backgroundColor: "rgba(0, 210, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.15)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  insightsHeader: {
    color: "#00D2FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  aiSummary: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 14,
  },
  collapsibleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  collapsibleLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  collapsibleContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.01)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 6,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletPoint: {
    color: "#00D2FF",
    marginRight: 6,
    fontSize: 14,
    lineHeight: 16,
  },
  bulletText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.8,
  },
  cardHeaderRowSpace: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sportsScroll: {
    gap: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  sportTabChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sportTabChipActive: {
    borderColor: "#00D2FF",
    backgroundColor: "rgba(0, 210, 255, 0.12)",
  },
  sportTabChipEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  sportTabChipText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  sportTabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sportMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportMetricBox: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 10,
  },
  metricLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  streakText: {
    color: "#00D2FF",
    fontSize: 11,
    fontWeight: "700",
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  formBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  formBadgeWin: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "#22c55e",
  },
  formBadgeLoss: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "#ef4444",
  },
  formBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  overallRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 210, 255, 0.12)",
    borderColor: "#00D2FF",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  overallRatingLabel: {
    color: "#00D2FF",
    fontSize: 8,
    fontWeight: "900",
    marginRight: 6,
  },
  overallRatingVal: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  skillRow: {
    marginBottom: 10,
  },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  skillName: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    fontWeight: "600",
  },
  skillValue: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00D2FF",
    borderRadius: 3,
  },
  rankingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  rankBox: {
    flex: 1,
    alignItems: "center",
  },
  rankTitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  rankNum: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  rankSeparator: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  achieveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  achieveBox: {
    width: "48%",
    backgroundColor: "rgba(0, 210, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.12)",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
  },
  achieveBoxLocked: {
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  achieveIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  achieveIconLocked: {
    opacity: 0.3,
  },
  achieveName: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  achieveNameLocked: {
    color: "rgba(255,255,255,0.3)",
  },
  achieveDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
  },
});
