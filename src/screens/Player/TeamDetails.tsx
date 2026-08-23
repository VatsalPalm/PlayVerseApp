import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../../utils/types";
import { showMessage } from "react-native-flash-message";
import { stackApiFetch } from "../../stackApiFetcher";
import { storage } from "../../services/mmkv";

type TeamDetailsRouteProp = RouteProp<HomeStackParamList, "TeamDetails">;

const TeamDetailsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<TeamDetailsRouteProp>();
  const rawParams = (route.params || {}) as any;
  const rawTeamId = rawParams.teamId;
  const teamId =
    typeof rawTeamId === "object" && rawTeamId !== null
      ? rawTeamId.teamId || rawTeamId.id
      : rawTeamId;
  const initialTeamName = rawParams.teamName;

  const [loading, setLoading] = useState(true);
  const [teamDetails, setTeamDetails] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [newPlayerInput, setNewPlayerInput] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = storage.getString("userProfile");
      if (stored) {
        const uObj = JSON.parse(stored);
        setCurrentUserId(uObj?.user_id || uObj?.id || uObj?.userId || null);
      }
    } catch (e) {
      console.log("Error parsing user profile:", e);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      // Fetch details and members in parallel
      const [tRes, mRes] = await Promise.all([
        stackApiFetch<any, any, any, any, any, any>({
          url: "/api/teams/v1/{id}",
          method: "GET",
          pathParams: { id: String(teamId) },
        }).catch(() => null),
        stackApiFetch<any, any, any, any, any, any>({
          url: "/api/teams/v1/{id}/members",
          method: "GET",
          pathParams: { id: String(teamId) },
        }).catch(() => null),
      ]);

      if (tRes) {
        const unwrapped = tRes?.data || tRes;
        setTeamDetails(unwrapped);
      }
      const memberList = Array.isArray(mRes)
        ? mRes
        : mRes?.members || mRes?.result || mRes?.data || [];
      setMembers(memberList);
    } catch (err: any) {
      console.log("Error loading team data:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShareTeamLink = async () => {
    const tName =
      teamDetails?.name || teamDetails?.team_name || initialTeamName || "Team";
    try {
      const message = `🏆 Join my team "${tName}" on PlayVerse!\nTeam ID: ${teamId}\nOpen PlayVerse app to join or use Team ID #${teamId}!`;
      await Share.share({
        message,
        title: `Join ${tName} on PlayVerse`,
      });
    } catch (error: any) {
      console.log("Error sharing team link:", error.message);
    }
  };

  const handleAddPlayer = async () => {
    const val = newPlayerInput.trim();
    if (!val) {
      showMessage({
        message: "Please enter a Mobile Number or User ID",
        type: "warning",
      });
      return;
    }

    try {
      setAddingPlayer(true);
      const isShortId = !isNaN(Number(val)) && val.length <= 6;
      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/invitations",
        method: "POST",
        pathParams: { id: String(teamId) },
        body: {
          phoneNumber: val,
          mobileNumber: val,
          userIdOrEmail: val,
          playerId: isShortId ? Number(val) : undefined,
        },
      });
      showMessage({
        message: "Player invited / added successfully!",
        type: "success",
      });
      setNewPlayerInput("");
      
      // Auto-assign as Captain if there is no captain yet and we can find the accepted member
      const membersRes: any = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/members",
        method: "GET",
        pathParams: { id: String(teamId) },
      }).catch(() => null);

      const memberList = Array.isArray(membersRes)
        ? membersRes
        : membersRes?.members || membersRes?.result || membersRes?.data || [];

      const currentCaptain =
        teamDetails?.captain_id ||
        teamDetails?.captainId ||
        teamDetails?.captain?.id ||
        memberList.find((m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain)?.user_id ||
        memberList.find((m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain)?.id;

      if (!currentCaptain && isOwner) {
        const ownerIdVal = Number(teamDetails?.owner_id || teamDetails?.ownerId);
        const accepted = memberList.filter((m: any) => {
          const statusLower = (m.status || "").toLowerCase();
          const isPending = ["pending", "waitlisted", "requested"].includes(statusLower);
          const mIdVal = Number(m.user_id || m.id || m.userId);
          return !isPending && mIdVal !== ownerIdVal;
        });

        const targetMember = accepted[0];
        if (targetMember) {
          const targetMemberId = Number(targetMember.user_id || targetMember.id || targetMember.userId);
          const targetMemberName = targetMember.user_name || targetMember.name || targetMember.username || targetMember.display_name || "Player";
          if (targetMemberId) {
            try {
              await stackApiFetch<any, any, any, any, any, any>({
                url: "/api/teams/v1/{id}/captain",
                method: "PATCH",
                pathParams: { id: String(teamId) },
                body: { captainId: targetMemberId },
              });
              showMessage({
                message: `${targetMemberName} has been assigned as Team Captain! 👑`,
                type: "success",
              });
            } catch (assignErr: any) {
              console.log("Failed to auto-assign captain in handleAddPlayer:", assignErr?.message || assignErr);
            }
          }
        }
      }

      loadData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to add player",
        type: "danger",
      });
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleApprovePlayer = async (userId: number, name: string) => {
    try {
      setActionLoading(true);
      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/members/{userId}/approve",
        method: "POST",
        pathParams: { id: String(teamId), userId: String(userId) },
      });
      showMessage({
        message: `${name} has been approved and added to the team!`,
        type: "success",
      });
      // If no captain is set yet and current user is owner, auto-assign this player as captain
      if (!unwrappedCaptainId && isOwner) {
        try {
          await stackApiFetch<any, any, any, any, any, any>({
            url: "/api/teams/v1/{id}/captain",
            method: "PATCH",
            pathParams: { id: String(teamId) },
            body: { captainId: userId },
          });
          showMessage({
            message: `${name} has been assigned as Team Captain! 👑`,
            type: "success",
          });
        } catch {
          // Captain assignment is optional — ignore if it fails
        }
      }
      loadData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to approve player",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBecomeCaptain = async () => {
    try {
      setActionLoading(true);
      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/become-captain",
        method: "POST",
        pathParams: { id: String(teamId) },
      });
      showMessage({
        message: "You are now the team captain! 👑",
        type: "success",
      });
      loadData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to claim captaincy",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPlayer = async (userId: number, name: string) => {
    try {
      setActionLoading(true);
      await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/members/{userId}/reject",
        method: "POST",
        pathParams: { id: String(teamId), userId: String(userId) },
      });
      showMessage({
        message: `Join request for ${name} rejected`,
        type: "info",
      });
      loadData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to reject player",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMakeCaptain = (userId: number, name: string) => {
    Alert.alert(
      "Make Captain 👑",
      `Are you sure you want to make ${name} the Team Captain?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            try {
              setActionLoading(true);
              await stackApiFetch<any, any, any, any, any, any>({
                url: "/api/teams/v1/{id}/captain",
                method: "PATCH",
                pathParams: { id: String(teamId) },
                body: { captainId: userId },
              });
              showMessage({
                message: `${name} is now the Team Captain! 👑`,
                type: "success",
              });
              loadData();
            } catch (err: any) {
              showMessage({
                message: err.message || "Failed to update team captain",
                type: "danger",
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleRemovePlayer = (userId: number, name: string) => {
    Alert.alert(
      "Remove Player",
      `Are you sure you want to remove ${name} from this team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await stackApiFetch<any, any, any, any, any, any>({
                url: "/api/teams/v1/{id}/members/{userId}",
                method: "DELETE",
                pathParams: { id: String(teamId), userId: String(userId) },
              });
              showMessage({
                message: "Player removed from team",
                type: "info",
              });
              loadData();
            } catch (err: any) {
              showMessage({
                message: err.message || "Failed to remove player",
                type: "danger",
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteOrLeaveTeam = () => {
    const localIsCaptain = isCaptain;
    const isOwner = Number(teamDetails?.owner_id || teamDetails?.ownerId) === Number(currentUserId);
    const canDelete = localIsCaptain || isOwner;
    const title = canDelete ? "Delete Team" : "Leave Team";
    const desc = canDelete
      ? "Are you sure you want to delete this team? This cannot be undone."
      : "Are you sure you want to leave this team?";

    Alert.alert(title, desc, [
      { text: "Cancel", style: "cancel" },
      {
        text: canDelete ? "Delete" : "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(true);
            try {
              await stackApiFetch<any, any, any, any, any, any>({
                url: "/api/teams/v1/{id}",
                method: "DELETE",
                pathParams: { id: String(teamId) },
              });
            } catch (e) {
              await stackApiFetch<any, any, any, any, any, any>({
                url: "/api/teams/v1/{id}/members/me",
                method: "DELETE",
                pathParams: { id: String(teamId) },
              });
            }
            showMessage({
              message: isCaptain
                ? "Team deleted successfully"
                : "Left team successfully",
              type: "success",
            });
            navigation.goBack();
          } catch (err: any) {
            showMessage({
              message: err.message || "Action failed",
              type: "danger",
            });
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSelfJoinTeam = async () => {
    try {
      setActionLoading(true);
      const res = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/teams/v1/{id}/join",
        method: "POST",
        pathParams: { id: String(teamId) },
      });
      showMessage({
        message: res?.message || "Joined team successfully!",
        type: "success",
      });
      loadData();
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to join team",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const safeStr = (val: any, fallback = ""): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object") {
      if (typeof val.display_name === "string") return val.display_name;
      if (typeof val.displayName === "string") return val.displayName;
      if (typeof val.full_name === "string") return val.full_name;
      if (typeof val.fullName === "string") return val.fullName;
      if (typeof val.name === "string") return val.name;
      if (typeof val.username === "string") return val.username;
      if (typeof val.user_name === "string") return val.user_name;
      if (typeof val.userName === "string") return val.userName;
      if (
        val.id !== undefined &&
        (typeof val.id === "string" || typeof val.id === "number")
      )
        return String(val.id);
      if (
        val.playerId !== undefined &&
        (typeof val.playerId === "string" || typeof val.playerId === "number")
      )
        return String(val.playerId);
      if (
        val.userId !== undefined &&
        (typeof val.userId === "string" || typeof val.userId === "number")
      )
        return String(val.userId);
    }
    return fallback;
  };

  const pendingMembers = members.filter(
    (m: any) =>
      m.status === "PENDING" ||
      m.status === "pending" ||
      m.status === "WAITLISTED" ||
      m.status === "waitlisted" ||
      m.status === "REQUESTED" ||
      m.status === "requested",
  );
  const acceptedMembers = members.filter(
    (m: any) =>
      m.status !== "PENDING" &&
      m.status !== "pending" &&
      m.status !== "WAITLISTED" &&
      m.status !== "waitlisted" &&
      m.status !== "REQUESTED" &&
      m.status !== "requested",
  );

  const displayName = safeStr(
    teamDetails?.name || teamDetails?.team_name || initialTeamName,
    "Team Details",
  );

  const unwrappedCaptainId =
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.user_id ??
    teamDetails?.captain?.user_id ??
    teamDetails?.captain?.userId ??
    teamDetails?.captain_id ??
    teamDetails?.captainId ??
    teamDetails?.captain?.id ??
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.id;

  const rawCaptain =
    teamDetails?.captain_name ??
    teamDetails?.captainName ??
    teamDetails?.captain?.display_name ??
    teamDetails?.captain?.displayName ??
    teamDetails?.captain?.full_name ??
    teamDetails?.captain?.fullName ??
    teamDetails?.captain?.name ??
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.display_name ??
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.displayName ??
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.user_name ??
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.userName ??
    acceptedMembers.find(
      (m: any) => m.role === "CAPTAIN" || m.role === "Captain" || m.isCaptain,
    )?.name;

  const captainName = safeStr(
    rawCaptain,
    unwrappedCaptainId
      ? `Captain #${safeStr(unwrappedCaptainId)}`
      : "Not Assigned",
  );

  const teamShortName = safeStr(
    teamDetails?.short_name || teamDetails?.shortName,
  );
  const teamCity = safeStr(teamDetails?.city);
  const teamDesc = safeStr(teamDetails?.description);

  const isCaptain =
    Boolean(unwrappedCaptainId) &&
    Number(safeStr(unwrappedCaptainId)) === Number(currentUserId);

  const isOwner =
    Number(teamDetails?.owner_id || teamDetails?.ownerId) ===
    Number(currentUserId);

  const isAlreadyMember = members.some((m: any) => {
    const memberUid = safeStr(m.user_id || m.id || m.userId);
    return Number(memberUid) === Number(currentUserId);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0914" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <TouchableOpacity
            style={styles.deleteBtnHeader}
            onPress={handleDeleteOrLeaveTeam}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00D2FF" />
            <Text style={styles.loadingText}>Loading team details...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Team Overview Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.shieldIconBox,
                    {
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      overflow: "hidden",
                      backgroundColor: "rgba(108, 77, 246, 0.2)",
                    },
                  ]}
                >
                  {teamDetails?.logo ? (
                    <Image
                      source={{ uri: teamDetails.logo }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Ionicons
                      name="shield-checkmark"
                      size={30}
                      color="#00D2FF"
                    />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text style={styles.teamTitle}>{displayName}</Text>
                    {(teamDetails?.short_name || teamDetails?.shortName) && (
                      <View
                        style={{
                          backgroundColor: "rgba(0, 210, 255, 0.15)",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: "#00D2FF",
                        }}
                      >
                        <Text
                          style={{
                            color: "#00D2FF",
                            fontSize: 11,
                            fontWeight: "800",
                          }}
                        >
                          {teamDetails?.short_name || teamDetails?.shortName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.teamSub}>
                    Team ID: #
                    {typeof teamId === "object"
                      ? teamId?.teamId || teamId?.id || ""
                      : teamId}{" "}
                    {teamDetails?.city ? `• 📍 ${teamDetails.city}` : ""}
                  </Text>
                </View>
              </View>

              {teamDetails?.description ? (
                <Text
                  style={{
                    color: "#D1D5DB",
                    fontSize: 13,
                    marginTop: 10,
                    lineHeight: 18,
                    fontStyle: "italic",
                  }}
                >
                  "{teamDetails.description}"
                </Text>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.infoGrid}>
                <View style={[styles.infoItem, { marginRight: 8 }]}>
                  <Text style={styles.infoLabel}>Captain / Organizer</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <Text style={styles.infoValue}>{captainName}</Text>
                    {isCaptain && (
                      <View style={styles.captainBadge}>
                        <Text style={styles.captainBadgeText}>👑 Captain</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.infoItem, { alignItems: "flex-end" }]}>
                  <Text style={styles.infoLabel}>Total Members</Text>
                  <Text style={[styles.infoValue, { marginTop: 4 }]}>
                    {acceptedMembers.length} Players
                  </Text>
                </View>
              </View>
            </View>

            {/* PENDING JOIN REQUESTS CARD (IF ANY) */}
            {(isCaptain || isOwner) && pendingMembers.length > 0 && (
              <View
                style={[
                  styles.card,
                  {
                    borderColor: "rgba(245, 158, 11, 0.4)",
                    backgroundColor: "rgba(245, 158, 11, 0.06)",
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color="#F59E0B"
                    />
                    <Text style={[styles.sectionTitle, { color: "#F59E0B" }]}>
                      Pending Requests ({pendingMembers.length})
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.2)",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#F59E0B",
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      Action Required
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.shareSubText,
                    { marginBottom: 12, color: "#D1D5DB" },
                  ]}
                >
                  Players requesting to join this team roster:
                </Text>

                {pendingMembers.map((member, index) => {
                  const rawId =
                    member.user_id ||
                    member.id ||
                    member.player_id ||
                    member.user;
                  const mId = safeStr(rawId, String(index + 1));
                  const rawName =
                    member.user_name ||
                    member.name ||
                    member.username ||
                    member.display_name ||
                    member.user;
                  const mName = safeStr(rawName, `Player #${mId}`);

                  return (
                    <View
                      key={`pending-${mId}-${index}`}
                      style={[
                        styles.memberRow,
                        { borderColor: "rgba(245, 158, 11, 0.25)" },
                      ]}
                    >
                      <View
                        style={[
                          styles.avatarCircle,
                          {
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            borderColor: "#F59E0B",
                          },
                        ]}
                      >
                        <Text style={[styles.avatarText, { color: "#F59E0B" }]}>
                          {mName ? mName.charAt(0).toUpperCase() : "P"}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.memberName}>{mName}</Text>
                        <Text style={[styles.memberSub, { color: "#F59E0B" }]}>
                          Pending Approval
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() =>
                            handleApprovePlayer(Number(mId) || 0, mName)
                          }
                          disabled={actionLoading}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                          <Text style={styles.approveBtnText}>Accept</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() =>
                            handleRejectPlayer(Number(mId) || 0, mName)
                          }
                          disabled={actionLoading}
                        >
                          <Ionicons name="close" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Self Join Team Banner for non-members */}
            {!isAlreadyMember && !isCaptain && Number(teamDetails?.owner_id || teamDetails?.ownerId) !== Number(currentUserId) && (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: "rgba(108, 77, 246, 0.15)",
                    borderColor: "#6C4DF6",
                    borderWidth: 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.sectionTitle, { color: "#FFF" }]}>
                      Join this Team
                    </Text>
                    <Text style={styles.shareSubText}>
                      You are viewing this team as a player. Tap to join this
                      team!
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.shareButton,
                      { backgroundColor: "#00D2FF", paddingHorizontal: 16 },
                    ]}
                    onPress={handleSelfJoinTeam}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#0F0D1A" />
                    ) : (
                      <>
                        <Ionicons
                          name="person-add-outline"
                          size={16}
                          color="#0F0D1A"
                        />
                        <Text
                          style={[
                            styles.shareButtonText,
                            { color: "#0F0D1A", fontWeight: "900" },
                          ]}
                        >
                          Join Team
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Share Team Link Card */}
            <View style={styles.card}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <View style={styles.shareIconBox}>
                    <Ionicons name="share-social" size={20} color="#6C4DF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Share Team Link</Text>
                    <Text style={styles.shareSubText}>
                      Send join link to players to let them join themselves
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareTeamLink}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={16} color="#FFF" />
                  <Text style={styles.shareButtonText}>Share Link</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Add Player Box */}
            <View style={styles.card}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Ionicons name="person-add" size={20} color="#6C4DF6" />
                <Text style={styles.sectionTitle}>
                  Add Player by Mobile / ID
                </Text>
              </View>
              <Text style={[styles.shareSubText, { marginBottom: 12 }]}>
                Enter player's 10-digit mobile number or User ID to add them to
                the team
              </Text>

              <View style={styles.addPlayerRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number or User ID"
                  placeholderTextColor="#9CA3AF"
                  value={newPlayerInput}
                  onChangeText={setNewPlayerInput}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddPlayer}
                  disabled={addingPlayer}
                >
                  {addingPlayer ? (
                    <ActivityIndicator size="small" color="#0F0D1A" />
                  ) : (
                    <Text style={styles.addBtnText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Team Roster / Players List */}
            <View style={styles.card}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons name="people" size={20} color="#00D2FF" />
                  <Text style={styles.sectionTitle}>
                    Player Roster ({acceptedMembers.length})
                  </Text>
                </View>
              </View>

              {acceptedMembers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyTitle}>
                    Team Created with 0 Members
                  </Text>
                  <Text style={styles.emptyText}>
                    The tournament organizer is not automatically added. Add
                    players manually above or share the invitation link.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.shareButton,
                      {
                        marginTop: 12,
                        backgroundColor: "#6C4DF6",
                        alignSelf: "center",
                      },
                    ]}
                    onPress={handleShareTeamLink}
                  >
                    <Ionicons name="share-social" size={16} color="#FFF" />
                    <Text style={styles.shareButtonText}>Share Team Link</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                acceptedMembers.map((member, index) => {
                  const rawId =
                    member.user_id ||
                    member.id ||
                    member.player_id ||
                    member.user;
                  const mId = safeStr(rawId, String(index + 1));
                  const rawName =
                    member.user_name ||
                    member.name ||
                    member.username ||
                    member.display_name ||
                    member.user;
                  const mName = safeStr(rawName, `Player #${mId}`);
                  const isCap =
                    member.role === "CAPTAIN" ||
                    member.role === "Captain" ||
                    member.isCaptain ||
                    Number(mId) === Number(safeStr(unwrappedCaptainId));
                  const mRole = safeStr(
                    member.role,
                    isCap ? "Captain" : "Player",
                  );
                  const mStatus = safeStr(member.status, "ACTIVE");

                  return (
                    <View
                      key={safeStr(member.id, String(index))}
                      style={styles.memberRow}
                    >
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {mName ? mName.charAt(0).toUpperCase() : "P"}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text style={styles.memberName}>{mName}</Text>
                          {isCap && (
                            <View style={styles.captainBadge}>
                              <Text style={styles.captainBadgeText}>
                                👑 Captain
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.memberSub}>
                          Role: {mRole} • Status: {mStatus}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >


                        {!isCap && (isCaptain || isOwner) && (
                          <TouchableOpacity
                            style={styles.removeMemberBtn}
                            onPress={() =>
                              handleRemovePlayer(Number(mId) || 0, mName)
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Leave / Delete Team Action */}
            <TouchableOpacity
              style={styles.leaveTeamBtn}
              onPress={handleDeleteOrLeaveTeam}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.leaveTeamText}>
                  {isCaptain ? "Delete Team" : "Leave Team"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

export default TeamDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0914",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  deleteBtnHeader: {
    padding: 6,
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 12,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shieldIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(0, 210, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.25)",
  },
  shareIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108, 77, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.3)",
  },
  teamTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  teamSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  captainBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  captainBadgeText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  shareSubText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: "#6C4DF6",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addPlayerRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  addBtn: {
    backgroundColor: "#00D2FF",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#0F0D1A",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(108, 77, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.4)",
  },
  avatarText: {
    color: "#D2C4FF",
    fontSize: 14,
    fontWeight: "800",
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  memberSub: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  removeMemberBtn: {
    padding: 6,
  },
  approveBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  rejectBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  makeCaptainBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  makeCaptainBtnText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  leaveTeamBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    marginTop: 10,
  },
  leaveTeamText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "800",
  },
});
