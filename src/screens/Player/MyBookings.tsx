import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Dimensions, TouchableOpacity,
  FlatList, ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';
import {
  useBookingControllerGetMyBookings,
  useBookingControllerCancel,
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'];

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

const MyBookingsScreen = () => {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const queryParams: any = { limit: 100 };
  if (activeFilter !== 'ALL') queryParams.status = activeFilter;

  const { data, isLoading, refetch } = useBookingControllerGetMyBookings<any>(
    { queryParams },
    { retry: false },
  );

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

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

  const bookings: any[] = data?.data || [];
  const today = new Date().toISOString().split('T')[0];

  const renderCard = ({ item }: { item: any }) => {
    const statusCol = statusColor[item.booking_status] || '#9CA3AF';
    const statusBgCol = statusBg[item.booking_status] || 'rgba(0,0,0,0.1)';
    const isUpcoming = item.booking_date >= today && item.booking_status !== 'CANCELLED';
    const canCancel = item.booking_status !== 'CANCELLED';

    return (
      <View style={styles.card}>
        {/* Top: ground + status */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.groundName}>{item.ground_name}</Text>
            <Text style={styles.groundAddress}>{item.ground_address || ''}{item.ground_city ? `, ${item.ground_city}` : ''}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBgCol, borderColor: statusCol }]}>
            <Text style={[styles.statusText, { color: statusCol }]}>{item.booking_status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Date / Time row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>📅 Date</Text>
            <Text style={styles.infoValue}>{item.booking_date}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>🕐 Time</Text>
            <Text style={styles.infoValue}>{item.slot_start} – {item.slot_end}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>💰 Amount</Text>
            <Text style={[styles.infoValue, { color: '#00D2FF' }]}>₹{item.amount}</Text>
          </View>
        </View>

        {/* Sport */}
        {item.sport_name && (
          <View style={styles.sportChip}>
            <Text style={styles.sportChipText}>{item.sport_icon || '🏟️'} {item.sport_name}</Text>
          </View>
        )}

        {/* Upcoming label */}
        {isUpcoming && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingText}>⚡ Upcoming</Text>
          </View>
        )}

        {/* Cancel button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.8}
            onPress={() => setCancelTarget(item)}
          >
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>My Bookings</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#6C4DF6" />
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🎟️</Text>
                <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter !== 'ALL'
                    ? `No ${activeFilter.toLowerCase()} bookings.`
                    : "You haven't booked any ground slots yet."}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Cancel modal */}
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Cancel Booking?</Text>
            <Text style={styles.modalDesc}>
              Cancel your booking at <Text style={styles.bold}>{cancelTarget?.ground_name}</Text> on{' '}
              <Text style={styles.bold}>{cancelTarget?.booking_date}</Text> ({cancelTarget?.slot_start} – {cancelTarget?.slot_end})?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnKeep]} onPress={() => setCancelTarget(null)} activeOpacity={0.8}>
                <Text style={styles.modalBtnKeepText}>Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                activeOpacity={0.8}
                disabled={isCancelling}
                onPress={() => { if (cancelTarget) cancelBooking({ pathParams: { id: cancelTarget.id } }); }}
              >
                {isCancelling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnCancelText}>Yes, Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyBookingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080612' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: { backgroundColor: '#6C4DF6', borderColor: '#6C4DF6' },
  filterTabText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  filterTabTextActive: { color: '#FFFFFF' },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, marginBottom: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  groundName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  groundAddress: { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoItem: {},
  infoLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  infoValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sportChip: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(108,77,246,0.12)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(108,77,246,0.25)',
  },
  sportChipText: { color: '#a594ff', fontSize: 12, fontWeight: '600' },
  upcomingBadge: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(0,210,255,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)',
  },
  upcomingText: { color: '#00D2FF', fontSize: 11, fontWeight: '700' },
  cancelBtn: {
    marginTop: 14, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  emptySubtitle: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  modalBtnKeep: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBtnKeepText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalBtnCancel: { backgroundColor: '#ef4444' },
  modalBtnCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
