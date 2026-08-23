import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@tanstack/react-query";
import { showMessage } from "react-native-flash-message";
import {
  useMatchControllerGetMatchRequests,
  useAiControllerAcceptInvitation,
  useAiControllerDeclineInvitation,
} from "../Api/playVerseComponents";
import { stackApiFetch } from "../stackApiFetcher";

interface JoinRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  matchId?: number;
  tournamentId?: number;
  onRosterUpdated?: () => void;
}

const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  visible,
  onClose,
  matchId,
  tournamentId,
  onRosterUpdated,
}) => {
  // Query pending requests for match
  const {
    data: requestsData,
    isLoading: isMatchRequestsLoading,
    refetch,
  } = useMatchControllerGetMatchRequests(
    visible && matchId ? { pathParams: { matchId } } : skipToken,
    { retry: false }
  );

  // Tournament requests state
  const [tournamentRequests, setTournamentRequests] = useState<any[]>([]);
  const [isTournamentRequestsLoading, setIsTournamentRequestsLoading] = useState(false);

  const fetchTournamentRequests = async () => {
    try {
      setIsTournamentRequestsLoading(true);
      const res = await stackApiFetch<any, any, any, any, any, any>({
        url: "/api/tournament/v1/{id}/requests",
        method: "GET",
        pathParams: { id: String(tournamentId) },
      });
      setTournamentRequests((res as any)?.data || res || []);
    } catch (err) {
      console.log("Error fetching tournament requests:", err);
    } finally {
      setIsTournamentRequestsLoading(false);
    }
  };

  // Mutations
  const acceptMutation = useAiControllerAcceptInvitation();
  const declineMutation = useAiControllerDeclineInvitation();

  const handleRefetch = () => {
    if (tournamentId) {
      fetchTournamentRequests();
    } else if (matchId) {
      refetch();
    }
  };

  // Refetch when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (tournamentId) {
        fetchTournamentRequests();
      } else if (matchId) {
        refetch();
      }
    }
  }, [visible, matchId, tournamentId]);

  const handleAccept = async (requestId: number, userName: string) => {
    try {
      await acceptMutation.mutateAsync({
        pathParams: { id: requestId },
      });


      // Skip auto-assigning captain or adding the player during team creation.
      // The team will start with no players, and the first player manually added will become captain.

      showMessage({
        message: `${userName} accepted successfully!`,
        type: "success",
      });
      handleRefetch();
      if (onRosterUpdated) {
        onRosterUpdated();
      }
    } catch (err: any) {
      console.log("Error accepting request:", err);
      showMessage({
        message: err?.message || "Failed to accept request",
        type: "danger",
      });
    }
  };

  const handleDecline = async (requestId: number, userName: string) => {
    try {
      await declineMutation.mutateAsync({
        pathParams: { id: requestId },
      });
      showMessage({
        message: `${userName} declined successfully!`,
        type: "info",
      });
      handleRefetch();
    } catch (err: any) {
      console.log("Error declining request:", err);
      showMessage({
        message: err?.message || "Failed to decline request",
        type: "danger",
      });
    }
  };

  const requestList = tournamentId
    ? tournamentRequests
    : (requestsData as any)?.data || (requestsData as any)?.result || requestsData || [];

  const isLoading = tournamentId ? isTournamentRequestsLoading : isMatchRequestsLoading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="people-outline" size={22} color="#6C4DF6" />
              <Text style={styles.title}>Join Requests</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color="#6C4DF6" />
              <Text style={styles.subText}>Loading requests...</Text>
            </View>
          ) : requestList.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>✉️</Text>
              <Text style={styles.emptyText}>
                {tournamentId
                  ? "No pending requests for this tournament."
                  : "No pending requests for this match."}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollList}
              showsVerticalScrollIndicator={false}
            >
              {requestList.map((item: any, index: number) => {
                const reqId = item.request_id || item.id || item.invitationId || item.requestId;
                const user = item.user || item.player || {};
                const name = item.user_name || user.display_name || user.full_name || user.name || item.name || "Player";
                const phone = item.user_phone || user.phone || user.mobile_number || user.phoneNumber || item.phone || "N/A";
                const gender = item.user_gender || user.gender || item.gender || "N/A";
                const image = item.user_profile_image || user.profile_image || user.profileImage || user.avatarUrl || item.profileImage || null;

                return (
                  <View key={reqId || index} style={styles.requestCard}>
                    {/* User Profile */}
                    <View style={styles.profileContainer}>
                      {image ? (
                        <Image source={{ uri: image }} style={styles.avatar} />
                      ) : (
                        <View style={styles.fallbackAvatar}>
                          <Text style={styles.fallbackAvatarText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                        <Text style={styles.userSubText} numberOfLines={1}>
                          📞 {phone}  •  {gender}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn]}
                        onPress={() => handleDecline(Number(reqId), name)}
                        disabled={declineMutation.isPending || acceptMutation.isPending}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#FF3E3E" />
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAccept(Number(reqId), name)}
                        disabled={declineMutation.isPending || acceptMutation.isPending}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#00E676" />
                        <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default JoinRequestsModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#120B24",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingBottom: 14,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  subText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
  },
  scrollList: {
    maxHeight: 380,
    marginTop: 12,
  },
  requestCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 12,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  fallbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(108, 77, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108, 77, 246, 0.4)",
  },
  fallbackAvatarText: {
    color: "#6C4DF6",
    fontSize: 16,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  userSubText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
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
  acceptBtn: {
    backgroundColor: "rgba(0, 230, 118, 0.08)",
    borderColor: "rgba(0, 230, 118, 0.2)",
  },
  acceptText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "700",
  },
  doneBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  doneBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
