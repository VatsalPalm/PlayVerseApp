import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Dimensions, TouchableOpacity,
  FlatList, ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';
import {
  useBookingControllerGetOwnerBookings,
  useBookingControllerConfirm,
  useBookingControllerCancel,
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'];

const statusColor: Record<string, string> = {
  CONFIRMED: '#22c55e',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

const statusBg: Record<string, string> = {
  CONFIRMED: 'rgba(34,197,94,0.12)',
  PENDING: 'rgba(245,158,11,0.12)',
  CANCELLED: 'rgba(239,68,68,0.12)',
};

const GroundBookingsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const groundId: number | undefined = route.params?.groundId;

  const [activeFilter, setActiveFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const queryParams: any = { limit: 100 };
  if (activeFilter !== 'ALL') queryParams.status = activeFilter;

  const { data, isLoading, refetch } = useBookingControllerGetOwnerBookings<any>(
    { queryParams },
    { retry: false },
  );

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const { mutate: confirmBooking, isPending: isConfirming } = useBookingControllerConfirm({
    onSuccess: () => {
      showMessage({ message: 'Booking Confirmed ✅', type: 'success' });
      refetch();
    },
    onError: (e: any) => showMessage({ message: e?.payload?.message || 'Failed to confirm', type: 'danger' }),
  });

  const { mutate: cancelBooking, isPending: isCancelling } = useBookingControllerCancel({
    onSuccess: () => {
      showMessage({ message: 'Booking Cancelled', type: 'warning' });
      setCancelTarget(null);
      refetch();
    },
    onError: (e: any) => showMessage({ message: e?.payload?.message || 'Failed to cancel', type: 'danger' }),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const allBookings: any[] = data?.data || [];

  const renderBookingCard = ({ item }: { item: any }) => {
    const statusCol = statusColor[item.booking_status] || '#9CA3AF';
    const statusBgCol = statusBg[item.booking_status] || 'rgba(156,163,175,0.1)';
    const isPending = item.booking_status === 'PENDING';
    const isActive = item.booking_status !== 'CANCELLED';

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.groundNameText}>{item.ground_name || 'Ground'}</Text>
            <Text style={styles.dateText}>
              📅 {item.booking_date}  •  🕐 {item.slot_start} – {item.slot_end}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBgCol, borderColor: statusCol }]}>
            <Text style={[styles.statusText, { color: statusCol }]}>{item.booking_status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Player info */}
        <View style={styles.playerRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(item.player_name || 'P')[0].toUpperCase()}</Text>
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.playerName}>{item.player_name || 'Unknown Player'}</Text>
            <Text style={styles.playerMobile}>{item.player_mobile || ''}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₹{item.amount}</Text>
          </View>
        </View>

        {/* Sport chip */}
        {item.sport_name ? (
          <View style={styles.sportChip}>
            <Text style={styles.sportChipText}>{item.sport_icon || '🏟️'} {item.sport_name}</Text>
          </View>
        ) : null}

        {/* Actions */}
        {isActive && (
          <View style={styles.cardActions}>
            {isPending && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                activeOpacity={0.8}
                disabled={isConfirming}
                onPress={() => confirmBooking({ pathParams: { id: item.id } })}
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>✅ Confirm</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              activeOpacity={0.8}
              onPress={() => setCancelTarget(item)}
            >
              <Text style={styles.cancelBtnText}>❌ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
        </Svg>
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {groundId ? 'Ground Bookings' : 'All Bookings'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#6C4DF6" />
          </View>
        ) : (
          <FlatList
            data={allBookings}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={renderBookingCard}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter !== 'ALL'
                    ? `No ${activeFilter.toLowerCase()} bookings found.`
                    : 'You have no bookings across your grounds yet.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Cancel Booking?</Text>
            <Text style={styles.modalDesc}>
              Cancel booking for <Text style={styles.bold}>{cancelTarget?.player_name}</Text> on{' '}
              <Text style={styles.bold}>{cancelTarget?.booking_date}</Text> ({cancelTarget?.slot_start} – {cancelTarget?.slot_end})?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setCancelTarget(null)} activeOpacity={0.8}>
                <Text style={styles.modalBtnCancelText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                activeOpacity={0.8}
                disabled={isCancelling}
                onPress={() => { if (cancelTarget) cancelBooking({ pathParams: { id: cancelTarget.id } }); }}
              >
                {isCancelling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnConfirmText}>Cancel Booking</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GroundBookingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080612' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: { backgroundColor: '#6C4DF6', borderColor: '#6C4DF6' },
  filterTabText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  filterTabTextActive: { color: '#FFFFFF' },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, marginBottom: 16,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  groundNameText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  dateText: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  statusBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(108,77,246,0.2)',
    borderWidth: 1, borderColor: 'rgba(108,77,246,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#a594ff', fontSize: 16, fontWeight: '700' },
  playerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  playerMobile: { color: '#9CA3AF', fontSize: 12 },
  amountBox: { alignItems: 'flex-end' },
  amountLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '600' },
  amountValue: { color: '#00D2FF', fontSize: 18, fontWeight: '800' },
  sportChip: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(108,77,246,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(108,77,246,0.25)',
  },
  sportChipText: { color: '#a594ff', fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmBtn: { backgroundColor: '#22c55e' },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  emptySubtitle: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: '#120E2E', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 24, width: '100%', maxWidth: 340, alignItems: 'center',
  },
  modalIcon: { fontSize: 32, marginBottom: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  modalDesc: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  bold: { color: '#FFFFFF', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalBtnCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalBtnConfirm: { backgroundColor: '#ef4444' },
  modalBtnConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
