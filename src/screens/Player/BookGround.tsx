import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, Dimensions, TouchableOpacity,
  FlatList, ActivityIndicator, StatusBar, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';
import {
  useGroundControllerGetAvailability,
  useBookingControllerCreate,
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Build the next 14 days starting from today */
function buildDates(): Date[] {
  const result: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push(d);
  }
  return result;
}

const BookGroundScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groundId, groundName } = route.params as { groundId: number; groundName: string };

  const dates = useMemo(() => buildDates(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isConfirmVisible, setConfirmVisible] = useState(false);

  const dateStr = toYMD(selectedDate);

  const { data: availData, isLoading: slotsLoading } = useGroundControllerGetAvailability<any>(
    { pathParams: { id: groundId }, queryParams: { date: dateStr } },
    { enabled: !!groundId },
  );

  const slots: any[] = availData?.data || availData?.slots || availData || [];

  const { mutate: createBooking, isPending: isBooking } = useBookingControllerCreate({
    onSuccess: (res: any) => {
      showMessage({
        message: 'Booking Confirmed! 🎉',
        description: `Your slot on ${dateStr} (${selectedSlot?.startTime}–${selectedSlot?.endTime}) is booked.`,
        type: 'success',
        duration: 4000,
      });
      setConfirmVisible(false);
      navigation.navigate('MyBookings');
    },
    onError: (e: any) => {
      showMessage({ message: e?.payload?.message || 'Booking failed. Try again.', type: 'danger' });
      setConfirmVisible(false);
    },
  });

  const handleConfirmBooking = () => {
    if (!selectedSlot) return;
    createBooking({
      body: {
        groundId,
        slotId: selectedSlot.id,
        bookingDate: dateStr,
        notes: notes.trim() || undefined,
      },
    });
  };

  const renderSlot = ({ item }: { item: any }) => {
    const isSelected = selectedSlot?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.slotCard, isSelected && styles.slotCardSelected]}
        activeOpacity={0.8}
        onPress={() => setSelectedSlot(isSelected ? null : item)}
      >
        <View style={styles.slotTimeRow}>
          <Text style={styles.slotTime}>{item.startTime} – {item.endTime}</Text>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#6C4DF6" />}
        </View>
        <Text style={styles.slotPrice}>₹{item.price}</Text>
        <Text style={styles.slotDay}>Day {item.dayOfWeek !== undefined ? DAY_NAMES[item.dayOfWeek] : ''}</Text>
      </TouchableOpacity>
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
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{groundName}</Text>
            <Text style={styles.headerSub}>Pick a date & slot</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Date Strip */}
          <Text style={styles.sectionLabel}>📅 Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
            {dates.map((d, i) => {
              const isToday = i === 0;
              const isSel = toYMD(d) === dateStr;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateChip, isSel && styles.dateChipSelected]}
                  onPress={() => { setSelectedDate(d); setSelectedSlot(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateDayText, isSel && styles.dateDayTextSelected]}>
                    {DAY_NAMES[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateDayNum, isSel && styles.dateDayNumSelected]}>{d.getDate()}</Text>
                  {isToday && <Text style={styles.todayDot}>•</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.selectedDateLabel}>{formatDateLabel(selectedDate)}</Text>

          {/* Slots */}
          <Text style={styles.sectionLabel}>🕐 Available Slots</Text>

          {slotsLoading ? (
            <View style={styles.slotLoader}>
              <ActivityIndicator size="large" color="#6C4DF6" />
              <SizedBox height={8} />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.noSlotsBox}>
              <Text style={styles.noSlotsIcon}>🚫</Text>
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          ) : (
            <FlatList
              data={slots}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={renderSlot}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.slotsGrid}
              columnWrapperStyle={{ gap: 12 }}
            />
          )}

          {/* Notes */}
          {selectedSlot && (
            <>
              <Text style={styles.sectionLabel}>📝 Notes (optional)</Text>
              <View style={styles.notesBox}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Any special requests..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom confirm bar */}
        {selectedSlot && (
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.bottomSlotTime}>{selectedSlot.startTime} – {selectedSlot.endTime}</Text>
              <Text style={styles.bottomDate}>{formatDateLabel(selectedDate)}</Text>
            </View>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.9}
              disabled={isBooking}
              onPress={handleConfirmBooking}
            >
              {isBooking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.bookBtnText}>Book  ₹{selectedSlot.price}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default BookGroundScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080612' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  headerSub: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '700',
    marginHorizontal: 20, marginTop: 20, marginBottom: 10,
  },
  dateStrip: { paddingHorizontal: 16, gap: 10 },
  dateChip: {
    width: 56, paddingVertical: 10, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  dateChipSelected: { backgroundColor: '#6C4DF6', borderColor: '#6C4DF6' },
  dateDayText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  dateDayTextSelected: { color: '#fff' },
  dateDayNum: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 2 },
  dateDayNumSelected: { color: '#fff' },
  todayDot: { color: '#00D2FF', fontSize: 18, lineHeight: 14 },
  selectedDateLabel: {
    color: '#a594ff', fontSize: 13, fontWeight: '600',
    marginHorizontal: 20, marginTop: 8,
  },
  slotLoader: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  noSlotsBox: { alignItems: 'center', paddingVertical: 40 },
  noSlotsIcon: { fontSize: 40, marginBottom: 10 },
  noSlotsText: { color: '#9CA3AF', fontSize: 14 },
  slotsGrid: { paddingHorizontal: 16 },
  slotCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14, marginBottom: 12,
  },
  slotCardSelected: {
    borderColor: '#6C4DF6', backgroundColor: 'rgba(108,77,246,0.12)',
  },
  slotTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotTime: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  slotPrice: { color: '#00D2FF', fontSize: 20, fontWeight: '800', marginTop: 6 },
  slotDay: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  notesBox: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  notesInput: { color: '#FFFFFF', fontSize: 14, minHeight: 70, textAlignVertical: 'top' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: 'rgba(18,14,46,0.95)',
    borderTopWidth: 1, borderColor: 'rgba(108,77,246,0.3)',
  },
  bottomSlotTime: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  bottomDate: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  bookBtn: {
    backgroundColor: '#6C4DF6', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, minWidth: 130, alignItems: 'center',
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
