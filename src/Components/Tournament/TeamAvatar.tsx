import React from "react";
import { View, Image, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getTeamLogoUri } from "../../utils/teamLogo";

interface TeamAvatarProps {
  team?: any;
  fallbackTeam?: any;
  logoUri?: string | null;
  size?: number;
  borderRadius?: number;
  style?: ViewStyle;
  fallbackText?: string;
  iconSize?: number;
  borderColor?: string;
  backgroundColor?: string;
}

export const TeamAvatar: React.FC<TeamAvatarProps> = ({
  team,
  fallbackTeam,
  logoUri,
  size = 40,
  borderRadius,
  style,
  fallbackText,
  iconSize,
  borderColor = "rgba(108, 77, 246, 0.4)",
  backgroundColor = "rgba(108, 77, 246, 0.2)",
}) => {
  const uri = logoUri || getTeamLogoUri(team, fallbackTeam);
  const actualRadius = borderRadius ?? size / 2;
  const actualIconSize = iconSize ?? Math.round(size * 0.5);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: actualRadius,
          borderColor,
          backgroundColor,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%", borderRadius: actualRadius }}
          resizeMode="cover"
        />
      ) : fallbackText && fallbackText.trim().length > 0 ? (
        <Text style={[styles.fallbackText, { fontSize: Math.round(size * 0.4) }]}>
          {fallbackText.trim().substring(0, 2).toUpperCase()}
        </Text>
      ) : (
        <Ionicons name="shield-outline" size={actualIconSize} color="#00D2FF" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  fallbackText: {
    color: "#00D2FF",
    fontWeight: "800",
  },
});

export default TeamAvatar;
