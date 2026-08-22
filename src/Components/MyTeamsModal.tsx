import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { request } from '../services/request';
import { METHODS, HomeStackParamList } from '../utils/types';
import TeamAvatar from './Tournament/TeamAvatar';

interface MyTeamsModalProps {
  visible: boolean;
  onClose: () => void;
}

const MyTeamsModal: React.FC<MyTeamsModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [teams, setTeams] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;
    let active = true;
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const res: any = await request(METHODS.GET, '/api/teams/v1/my-teams');
        if (active) {
          const list = Array.isArray(res) ? res : (res?.teams || res?.data || []);
          setTeams(list);
        }
      } catch (err) {
        console.log('Error fetching my teams in modal:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTeams();
    return () => {
      active = false;
    };
  }, [visible]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people" size={22} color="#6C4DF6" />
              <Text style={styles.title}>My Teams</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color="#6C4DF6" />
              <Text style={styles.subText}>Loading teams...</Text>
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>You are not a member of any teams yet.</Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 340, marginTop: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {teams.map((t: any) => {
                let tId = t.id || t.team_id;
                if (typeof tId === 'object' && tId !== null) {
                  tId = tId.teamId || tId.id;
                }
                const tName = t.name || t.team_name;
                return (
                  <TouchableOpacity
                    key={String(tId)}
                    style={styles.teamCard}
                    onPress={() => {
                      onClose();
                      navigation.navigate("TeamDetails", { teamId: Number(tId), teamName: tName });
                    }}
                    activeOpacity={0.7}
                  >
                    <TeamAvatar team={t} size={36} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.teamName}>{tName}</Text>
                        {t.isCaptain && (
                          <View style={styles.captainBadge}>
                            <Text style={styles.captainBadgeText}>👑 Captain</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.teamMeta}>
                        {t.memberCount || t.members?.length || 1} Members • Tap to view roster
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
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

export default MyTeamsModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#120B24',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  centerBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  subText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  teamName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  captainBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  captainBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  teamMeta: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
