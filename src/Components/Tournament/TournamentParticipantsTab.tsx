import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TeamAvatar from "./TeamAvatar";

interface TournamentParticipantsTabProps {
  tournament: any;
  insets: { bottom: number; top: number; left: number; right: number };
  isIndividual: boolean;
  isOrganizer: boolean;
  isMaxTeamsReached: boolean;
  handleRegisterTeam: () => void;
  combinedParticipants: any[];
  tournamentTeams: any[];
  handleOpenTeamDetails: (item: any) => void;
  userProfile: any;
  handleJoinTeam: (teamId: number) => void;
  handleApproveTeam: (teamId: number) => void;
  setSelectedTeamForMember: (item: any) => void;
  setShowAddMemberModal: (visible: boolean) => void;
  handleShareTeamInvite: (item: any) => void;
  handleCancelTeam: (teamId: number) => void;
  seedsInput: Record<number, string>;
  groupsInput: Record<number, string>;
  setSeedsInput: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setGroupsInput: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  handleSaveRanksAndGroups: () => void;
  handleAutoRandomizeSeedingAndGroups: () => void;
  actionLoading: boolean;
  styles: any;
}

export const TournamentParticipantsTab: React.FC<TournamentParticipantsTabProps> = ({
  tournament,
  insets,
  isIndividual,
  isOrganizer,
  isMaxTeamsReached,
  handleRegisterTeam,
  combinedParticipants,
  tournamentTeams,
  handleOpenTeamDetails,
  userProfile,
  handleJoinTeam,
  handleApproveTeam,
  setSelectedTeamForMember,
  setShowAddMemberModal,
  handleShareTeamInvite,
  handleCancelTeam,
  seedsInput,
  groupsInput,
  setSeedsInput,
  setGroupsInput,
  handleSaveRanksAndGroups,
  handleAutoRandomizeSeedingAndGroups,
  actionLoading,
  styles,
}) => {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.tabScroll,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={[styles.sectionHeader, { flex: 1, marginRight: 8 }]}
          numberOfLines={1}
        >
          {isIndividual ? "Registered Players" : "Registered Teams"}
        </Text>
        {tournament?.status === "UPCOMING" &&
          (isMaxTeamsReached ? (
            <View
              style={[
                styles.addTeamBtn,
                {
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  borderWidth: 1,
                  flexDirection: "row",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={14}
                color="#EF4444"
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.addTeamBtnText, { color: "#EF4444" }]}>
                Full
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addTeamBtn}
              onPress={handleRegisterTeam}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFF" />
              <Text style={styles.addTeamBtnText}>
                {isIndividual ? "Register Player" : "Register Team"}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {combinedParticipants.length === 0 ? (
        <View style={styles.emptyTabBox}>
          <Text style={styles.emptyTabText}>
            {isIndividual
              ? "No registered players yet."
              : "No registered teams yet."}
          </Text>
        </View>
      ) : (
        combinedParticipants.map((item, index) => {
          const matchingTeam = tournamentTeams.find(
            (t: any) =>
              String(t.id || t.teamId) === String(item.team_id || item.id)
          );
          const teamName =
            item.team_name ||
            item.name ||
            item.teamName ||
            matchingTeam?.teamName ||
            matchingTeam?.name ||
            "Team";
          const shortName =
            item.short_name ||
            item.shortName ||
            matchingTeam?.shortName ||
            matchingTeam?.short_name;
          const captainName =
            item.captain_name ||
            item.captainName ||
            matchingTeam?.captainName;
          const memberCount =
            item.member_count ??
            item.memberCount ??
            matchingTeam?.memberCount;
          const teamSize =
            item.team_size ?? item.teamSize ?? matchingTeam?.teamSize;
          const status = item.status || matchingTeam?.status || "REGISTERED";

          return (
            <View key={item.team_id || item.id || index} style={styles.participantItem}>
              {/* Top Info Section */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center" }}
                onPress={() => handleOpenTeamDetails(item)}
                activeOpacity={0.7}
              >
                {/* Team Logo / Avatar */}
                <TeamAvatar
                  team={item}
                  fallbackTeam={matchingTeam}
                  size={44}
                  fallbackText={shortName || teamName}
                  style={{ marginRight: 12 }}
                />

                <View style={{ flex: 1 }}>
                  {/* Team Name, Short Code & Status Badge Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={[styles.participantName, { flexShrink: 1 }]} numberOfLines={1}>
                      {teamName}
                    </Text>
                    {shortName ? (
                      <View
                        style={{
                          backgroundColor: "rgba(0, 210, 255, 0.15)",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: "#00D2FF", fontSize: 10, fontWeight: "800" }}>
                          {shortName}
                        </Text>
                      </View>
                    ) : null}

                    {/* Status Badge */}
                    <View
                      style={{
                        backgroundColor:
                          status === "APPROVED"
                            ? "rgba(0, 230, 118, 0.15)"
                            : status === "WAITLISTED"
                              ? "rgba(255, 171, 0, 0.15)"
                              : "rgba(156, 163, 175, 0.15)",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor:
                          status === "APPROVED"
                            ? "rgba(0, 230, 118, 0.4)"
                            : status === "WAITLISTED"
                              ? "rgba(255, 171, 0, 0.4)"
                              : "rgba(156, 163, 175, 0.4)",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            status === "APPROVED"
                              ? "#00E676"
                              : status === "WAITLISTED"
                                ? "#FFAB00"
                                : "#9CA3AF",
                          fontSize: 10,
                          fontWeight: "800",
                          letterSpacing: 0.3,
                        }}
                        numberOfLines={1}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata Subtitle Row */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {!isIndividual && captainName ? (
                      <Text style={{ color: "#D1D5DB", fontSize: 12, fontWeight: "500" }}>
                        👑 Captain: <Text style={{ color: "#FFF", fontWeight: "700" }}>{captainName}</Text>
                      </Text>
                    ) : null}
                    {!isIndividual && memberCount !== undefined && memberCount !== null ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Ionicons name="people-outline" size={12} color="#00D2FF" />
                        <Text style={{ color: "#00D2FF", fontSize: 11, fontWeight: "700" }}>
                          {memberCount}{teamSize ? `/${teamSize}` : ""} Players
                        </Text>
                      </View>
                    ) : null}
                    {item.seed ? (
                      <Text style={{ color: "#A78BFA", fontSize: 11, fontWeight: "600" }}>Seed #{item.seed}</Text>
                    ) : null}
                    {item.group_name ? (
                      <Text style={{ color: "#00D2FF", fontSize: 11, fontWeight: "600" }}>Group {item.group_name}</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Bottom Action Bar */}
              {(() => {
                const currentUserId =
                  userProfile?.user_id ||
                  userProfile?.id ||
                  userProfile?.userId;
                const isCaptain =
                  Number(item.captain_id) === Number(currentUserId);
                const canRemove =
                  isOrganizer || isCaptain || item.status === "PENDING";

                const hasActions =
                  (!isIndividual && (isOrganizer || isCaptain)) ||
                  !isIndividual ||
                  canRemove ||
                  (item.status === "PENDING" && isOrganizer);

                if (!hasActions) return null;

                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {!isIndividual && !isCaptain && !isOrganizer && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#00D2FF",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          height: 32,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() =>
                          handleJoinTeam(item.team_id || item.id)
                        }
                      >
                        <Text style={{ color: "#0F0D1A", fontSize: 12, fontWeight: "700" }}>
                          Join
                        </Text>
                      </TouchableOpacity>
                    )}

                    {item.status === "PENDING" && isOrganizer && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "rgba(0, 230, 118, 0.15)",
                          borderColor: "rgba(0, 230, 118, 0.4)",
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 32,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                        onPress={() =>
                          handleApproveTeam(item.team_id || item.id)
                        }
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={15}
                          color="#00E676"
                        />
                        <Text style={{ color: "#00E676", fontSize: 12, fontWeight: "700" }}>Approve</Text>
                      </TouchableOpacity>
                    )}

                    {/* Add Member button (ONLY for team tournaments) */}
                    {!isIndividual && (isOrganizer || isCaptain) && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "rgba(108, 77, 246, 0.15)",
                          borderColor: "rgba(108, 77, 246, 0.4)",
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 32,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onPress={() => {
                          setSelectedTeamForMember(item);
                          setShowAddMemberModal(true);
                        }}
                      >
                        <Ionicons
                          name="person-add-outline"
                          size={14}
                          color="#A78BFA"
                        />
                        <Text style={{ color: "#A78BFA", fontSize: 12, fontWeight: "700" }}>
                          Add Player
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Share Team Invite button (ONLY for team tournaments) */}
                    {!isIndividual && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "rgba(0, 210, 255, 0.15)",
                          borderColor: "rgba(0, 210, 255, 0.4)",
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 32,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onPress={() => handleShareTeamInvite(item)}
                      >
                        <Ionicons
                          name="share-social-outline"
                          size={14}
                          color="#00D2FF"
                        />
                        <Text style={{ color: "#00D2FF", fontSize: 12, fontWeight: "700" }}>
                          Invite
                        </Text>
                      </TouchableOpacity>
                    )}

                    {canRemove && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                          borderColor: "rgba(239, 68, 68, 0.4)",
                          borderWidth: 1,
                          borderRadius: 8,
                          width: 32,
                          height: 32,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() =>
                          handleCancelTeam(item.team_id || item.id)
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          );
        })
      )}

      {isOrganizer && combinedParticipants.length > 0 && (
        <View
          style={{
            marginTop: 24,
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {/* Header & Quick Action */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}
              >
                {isIndividual
                  ? "Player Rankings & Groups"
                  : "Team Rankings & Groups"}
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                Set ranks/groups or tap Auto-Assign
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: "rgba(108, 77, 246, 0.25)",
                borderColor: "#6C4DF6",
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
              onPress={handleAutoRandomizeSeedingAndGroups}
            >
              <Ionicons name="sparkles" size={14} color="#A78BFA" />
              <Text
                style={{ color: "#A78BFA", fontSize: 12, fontWeight: "700" }}
              >
                Auto-Assign
              </Text>
            </TouchableOpacity>
          </View>

          {/* Table Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                flex: 2,
                color: "#9CA3AF",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {isIndividual ? "Player" : "Team"}
            </Text>
            <Text
              style={{
                flex: 1,
                color: "#9CA3AF",
                fontSize: 12,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Seed
            </Text>
            <Text
              style={{
                flex: 1,
                color: "#9CA3AF",
                fontSize: 12,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Group
            </Text>
          </View>

          {/* Team / Player Rows */}
          {combinedParticipants.map((p, idx) => {
            const teamIdNum = Number(p.team_id || p.id);
            const teamName =
              p.team_name || p.name || p.teamName || `Team #${teamIdNum}`;
            return (
              <View
                key={teamIdNum || idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 6,
                  borderBottomWidth:
                    idx === combinedParticipants.length - 1 ? 0 : 1,
                  borderColor: "rgba(255,255,255,0.04)",
                }}
              >
                <TeamAvatar
                  team={p}
                  size={24}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    flex: 2,
                    color: "#FFF",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                  numberOfLines={1}
                >
                  {teamName}
                </Text>

                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#FFF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    fontSize: 12,
                    textAlign: "center",
                    marginHorizontal: 4,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  placeholder="e.g. 1"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={seedsInput[teamIdNum] || ""}
                  onChangeText={(val) =>
                    setSeedsInput((prev) => ({
                      ...prev,
                      [teamIdNum]: val,
                    }))
                  }
                />

                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#FFF",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    fontSize: 12,
                    textAlign: "center",
                    marginHorizontal: 4,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  placeholder="e.g. A"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                  value={groupsInput[teamIdNum] || ""}
                  onChangeText={(val) =>
                    setGroupsInput((prev) => ({
                      ...prev,
                      [teamIdNum]: val,
                    }))
                  }
                />
              </View>
            );
          })}

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#6C4DF6",
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 14,
            }}
            onPress={handleSaveRanksAndGroups}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text
                style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}
              >
                Save Rankings & Groups
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default TournamentParticipantsTab;
