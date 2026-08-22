import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";

interface TournamentAnalyticsTabProps {
  analytics: any;
  insets: { bottom: number; top: number; left: number; right: number };
  styles: any;
}

export const TournamentAnalyticsTab: React.FC<TournamentAnalyticsTabProps> = ({
  analytics,
  insets,
  styles,
}) => {
  if (!analytics) {
    return (
      <View style={styles.emptyTabBox}>
        <Text style={styles.emptyTabText}>No analytics available.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabScroll,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionHeader}>Match Analytics</Text>

      <View style={styles.analyticsGrid}>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Total Matches</Text>
          <Text style={styles.analyticsVal}>{analytics.totalMatches || 0}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Completed Matches</Text>
          <Text style={styles.analyticsVal}>
            {analytics.completedMatches || 0}
          </Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Average Match Duration</Text>
          <Text style={styles.analyticsVal}>
            {analytics.avgDurationMinutes || 0} min
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default TournamentAnalyticsTab;
