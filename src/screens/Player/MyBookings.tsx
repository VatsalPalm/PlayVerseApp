import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, Dimensions, TouchableOpacity,
  FlatList, ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import FloatingOrbs from '../../Components/atoms/FloatingOrbs';
import { showMessage } from 'react-native-flash-message';
import {
  useBookingControllerGetMyBookings,
  useBookingControllerCancelBooking,
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'CANCELLED'];

const statusColor: Record<string, string> = {
  CONFIRMED: '#22c55e',
  PENDING:   '#f59e0b',
  CANCELLED: '#ef4444',
  COMPLETED: '#6C4DF6',
};
const statusBg: Record<string, string> = {
  CONFIRMED: 'rgba(34,197,94,0.12)',
  PENDING:   'rgba(245,158,11,0.12)',
  CANCELLED: 'rgba(239,68,68,0.12)',
  COMPLETED: 'rgba(108,77,246,0.12)',
};
const statusEmoji: Record<string, string> = {
  CONFIRMED: '✅',
  PENDING:   '🕐',
  CANCELLED: '❌',
  COMPLETED: '🏆',
};

const sportEmojis: Record<string, string> = {
  cricket:    '🏏',
  football:   '⚽',
  basketball: '🏀',
  tennis:     '🎾',
  badminton:  '🏸',
  volleyball: '🏐',
  hockey:     '🏑',
  swimming:   '🏊',
  pickleball: '🏓',
};

/** Format ISO date string → "Tue, 20 Aug 2026" adjusting for timezone */
const formatDate = (raw: string): string => {
  if (!raw) return '—';
  let date: Date;
  if (raw.includes('T')) {
    date = new Date(raw);
  } else {
    const [y, m, d] = raw.split('-').map(Number);
    date = new Date(y, m - 1, d);
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/** Convert "06:00" → "6:00 AM" style */
const formatTime = (t: string): string => {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
};

/** Strip ".png", ".jpg" etc from icon filenames, return clean name */
const cleanSportName = (name: string): string => {
  if (!name) return '';
  // e.g. "cricket.png" → "Cricket"
  const stripped = name.replace(/\.(png|jpg|jpeg|svg|webp)$/i, '');
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
};

const getSportEmoji = (name: string): string => {
  const key = name.toLowerCase().replace(/\.(png|jpg|jpeg|svg|webp)$/i, '').trim();
  return sportEmojis[key] || '🏟️';
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

  const { mutate: cancelBooking, isPending: isCancelling } = useBookingControllerCancelBooking({
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

  const bookings: any[] = useMemo(() => {
    const raw = data?.data || [];
    return [...raw].sort((a, b) => {
      const dateA = new Date(a.booking_date || 0).getTime();
      const dateB = new Date(b.booking_date || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return (b.id || 0) - (a.id || 0);
    });
  }, [data?.data]);
  const todayStr = new Date().toISOString().split('T')[0];

  const renderCard = ({ item }: { item: any }) => {
    const st = item.booking_status || 'PENDING';
    const statusCol = statusColor[st] || '#9CA3AF';
    const statusBgCol = statusBg[st] || 'rgba(0,0,0,0.1)';
    const emoji = statusEmoji[st] || '📋';
    // Compare just the date portion
    const bookingDateStr = (item.booking_date || '').split('T')[0];
    const isUpcoming = bookingDateStr >= todayStr && st !== 'CANCELLED';
    const canCancel = st === 'PENDING' || st === 'CONFIRMED';

    const sportName = cleanSportName(item.sport_name || '');
    const sportEmoji = getSportEmoji(item.sport_name || '');

    const timeStart = formatTime(item.slot_start);
    const timeEnd = formatTime(item.slot_end);

    return (
      <View style={[styles.card, isUpcoming && styles.cardUpcoming]}>

        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: statusCol }]} />

        <View style={styles.cardInner}>
          {/* Top row: name + badge */}
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.groundName} numberOfLines={1}>{item.ground_name}</Text>
              <Text style={styles.groundAddress} numberOfLines={1}>
                📍 {item.ground_address || ''}{item.ground_city ? `, ${item.ground_city}` : ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBgCol, borderColor: statusCol }]}>
              <Text style={styles.statusEmoji}>{emoji}</Text>
              <Text style={[styles.statusText, { color: statusCol }]}>{st}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Date row */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#6C4DF6" />
            <Text style={styles.dateText}>{formatDate(item.booking_date)}</Text>
            {isUpcoming && (
              <View style={styles.upcomingPill}>
                <Text style={styles.upcomingPillText}>⚡ Upcoming</Text>
              </View>
            )}
          </View>

          {/* Time + Amount row */}
          <View style={styles.timeAmountRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>TIME</Text>
              <View style={styles.timeValueRow}>
                <Text style={styles.timeValue}>{timeStart}</Text>
                <Ionicons name="arrow-forward" size={12} color="#6C4DF6" style={{ marginHorizontal: 4 }} />
                <Text style={styles.timeValue}>{timeEnd}</Text>
              </View>
            </View>
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>AMOUNT</Text>
              <Text style={styles.amountValue}>₹{parseFloat(item.amount || '0').toFixed(0)}</Text>
            </View>
          </View>

          {/* Sport chip */}
          {sportName ? (
            <View style={styles.sportChip}>
              <Text style={styles.sportChipEmoji}>{sportEmoji}</Text>
              <Text style={styles.sportChipText}>{sportName}</Text>
            </View>
          ) : null}

          {/* Cancel button */}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              onPress={() => setCancelTarget(item)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
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

      <FloatingOrbs orb1Color="#6C4DF6" orb2Color="#00D2FF" />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#6C4DF6" />
            <SizedBox height={12} />
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Loading your bookings...</Text>
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
                    ? `No ${activeFilter.toLowerCase()} bookings found.`
                    : "You haven't booked any ground slots yet."}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Cancel confirmation modal */}
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Cancel Booking?</Text>
            <Text style={styles.modalDesc}>
              Cancel your slot at{' '}
              <Text style={styles.bold}>{cancelTarget?.ground_name}</Text>
              {'\n'}
              <Text style={styles.bold}>{formatDate(cancelTarget?.booking_date)}</Text>
              {' · '}
              {formatTime(cancelTarget?.slot_start)} → {formatTime(cancelTarget?.slot_end)}
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
                {isCancelling
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalBtnCancelText}>Yes, Cancel</Text>}
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSub: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 1 },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: { backgroundColor: '#6C4DF6', borderColor: '#6C4DF6' },
  filterTabText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  filterTabTextActive: { color: '#FFFFFF' },

  // List
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardUpcoming: {
    borderColor: 'rgba(108,77,246,0.25)',
    backgroundColor: 'rgba(108,77,246,0.04)',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  groundName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', flex: 1 },
  groundAddress: { color: '#9CA3AF', fontSize: 11, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, marginLeft: 8,
  },
  statusEmoji: { fontSize: 11 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },

  // Date
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dateText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', flex: 1 },
  upcomingPill: {
    backgroundColor: 'rgba(0,210,255,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)',
  },
  upcomingPillText: { color: '#00D2FF', fontSize: 10, fontWeight: '700' },

  // Time + Amount
  timeAmountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 12, gap: 0,
  },
  timeBlock: { flex: 1 },
  timeLabel: { color: '#6B7280', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  timeValueRow: { flexDirection: 'row', alignItems: 'center' },
  timeValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  amountBlock: { alignItems: 'flex-end', paddingLeft: 12, borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  amountLabel: { color: '#6B7280', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  amountValue: { color: '#00D2FF', fontSize: 18, fontWeight: '900' },

  // Sport chip
  sportChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(108,77,246,0.1)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(108,77,246,0.22)',
  },
  sportChipEmoji: { fontSize: 14 },
  sportChipText: { color: '#a594ff', fontSize: 12, fontWeight: '700' },

  // Cancel button
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)',
  },
  cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  emptySubtitle: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Cancel Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: {
    backgroundColor: '#120E2E', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 24, width: '100%', maxWidth: 340, alignItems: 'center',
  },
  modalIcon: { fontSize: 36, marginBottom: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  modalDesc: { color: '#9CA3AF', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  bold: { color: '#FFFFFF', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalBtnKeep: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBtnKeepText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalBtnCancel: { backgroundColor: '#ef4444' },
  modalBtnCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
