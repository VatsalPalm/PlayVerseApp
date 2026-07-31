import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Modal, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../utils/types';
import { 
  useGroundControllerGetGroundDetails, 
  useGroundControllerAddSlot, 
  useGroundControllerUpdateSlot, 
  useGroundControllerDeleteSlot 
} from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';
import { showMessage } from 'react-native-flash-message';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', name: 'Sunday' },
  { value: 1, label: 'Mon', name: 'Monday' },
  { value: 2, label: 'Tue', name: 'Tuesday' },
  { value: 3, label: 'Wed', name: 'Wednesday' },
  { value: 4, label: 'Thu', name: 'Thursday' },
  { value: 5, label: 'Fri', name: 'Friday' },
  { value: 6, label: 'Sat', name: 'Saturday' },
];

const STANDARD_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

type ManageSlotsRouteProp = RouteProp<HomeStackParamList, 'ManageSlots'>;

const ManageSlotsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<ManageSlotsRouteProp>();
  const groundId = route.params.groundId;

  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday (1)
  const [modalVisible, setModalVisible] = useState(false);

  // Modal form states
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('07:00');
  const [price, setPrice] = useState('');

  // Fetch Ground Details (which contains slots)
  const { data: groundDetails, isLoading, refetch } = useGroundControllerGetGroundDetails<any>({
    pathParams: { id: groundId },
  });

  const { mutate: addSlot, isPending: isAdding } = useGroundControllerAddSlot({
    onSuccess: () => {
      showMessage({
        message: 'Slot Added',
        description: 'New time slot successfully added.',
        type: 'success',
      });
      setModalVisible(false);
      setPrice('');
      refetch();
    },
    onError: (error: any) => {
      console.log('Failed to add slot:', error);
      showMessage({
        message: 'Add Failed',
        description: error?.message || 'Could not add slot. Please check for overlap.',
        type: 'danger',
      });
    },
  });

  const { mutate: updateSlot } = useGroundControllerUpdateSlot({
    onSuccess: () => {
      showMessage({
        message: 'Slot Updated',
        description: 'Status has been updated successfully.',
        type: 'success',
      });
      refetch();
    },
    onError: (error: any) => {
      console.log('Failed to update slot:', error);
      showMessage({
        message: 'Update Failed',
        description: error?.message || 'Could not update slot.',
        type: 'danger',
      });
    },
  });

  const { mutate: deleteSlot } = useGroundControllerDeleteSlot({
    onSuccess: () => {
      showMessage({
        message: 'Slot Deleted',
        description: 'Time slot has been successfully removed.',
        type: 'success',
      });
      refetch();
    },
    onError: (error: any) => {
      console.log('Failed to delete slot:', error);
      showMessage({
        message: 'Delete Failed',
        description: error?.message || 'Could not delete slot.',
        type: 'danger',
      });
    },
  });

  const handleAddSlot = () => {
    if (!price.trim() || isNaN(Number(price))) {
      showMessage({
        message: 'Validation Error',
        description: 'Please enter a valid numeric price.',
        type: 'warning',
      });
      return;
    }

    const payload = [{
      dayOfWeek: selectedDay,
      startTime,
      endTime,
      price: Number(price),
    }];

    addSlot({
      pathParams: { id: groundId },
      body: payload as any,
    });
  };

  const handleToggleStatus = (slotId: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    updateSlot({
      pathParams: { id: groundId, slotId },
      body: { status: newStatus },
    });
  };

  const handleDeleteSlot = (slotId: number, slotTime: string) => {
    Alert.alert(
      'Delete Slot',
      `Are you sure you want to delete the slot: ${slotTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSlot({ pathParams: { id: groundId, slotId } });
          },
        },
      ]
    );
  };

  const ground = groundDetails?.data || groundDetails?.result || groundDetails;
  const rawSlots = ground?.slots || [];
  
  // Filter slots for currently selected day
  const filteredSlots = rawSlots.filter(
    (s: any) => Number(s.dayOfWeek) === selectedDay
  ).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  const formatTimeDisplay = (time24: string) => {
    try {
      const [hourStr, minStr] = time24.split(':');
      const hour = parseInt(hourStr);
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const dispHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${dispHour}:${minStr} ${suffix}`;
    } catch {
      return time24;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#080612" />
              <Stop offset="50%" stopColor="#120E2E" />
              <Stop offset="100%" stopColor="#03020A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>◀ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Manage Slots</Text>
            {ground?.name && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {ground.name}
              </Text>
            )}
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Horizontal Calendar Strip */}
        <View style={styles.daySelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = day.value === selectedDay;
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[styles.dayTab, isSelected && styles.dayTabSelected]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDay(day.value)}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6C4DF6" />
          </View>
        ) : (
          <FlatList
            data={filteredSlots}
            keyExtractor={(item) => item.id?.toString() || `${item.startTime}-${item.endTime}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No Slots Added</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't defined any operational slot pricing for {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.name}.
                </Text>
                <SizedBox height={20} />
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.emptyAddBtnText}>➕ Create A Slot</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const isActive = item.status !== 0;
              const slotTime = `${formatTimeDisplay(item.startTime)} - ${formatTimeDisplay(item.endTime)}`;
              
              return (
                <View style={styles.slotCard}>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotTimeText}>{slotTime}</Text>
                    <Text style={styles.slotPriceText}>₹{item.price}</Text>
                  </View>
                  
                  <View style={styles.slotActions}>
                    {/* Active Toggle */}
                    <TouchableOpacity
                      style={[styles.statusBtn, isActive ? styles.statusActive : styles.statusInactive]}
                      activeOpacity={0.8}
                      onPress={() => handleToggleStatus(item.id, item.status)}
                    >
                      <Text style={[styles.statusBtnText, isActive ? styles.statusBtnTextActive : styles.statusBtnTextInactive]}>
                        {isActive ? 'Active' : 'Paused'}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete Icon */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.8}
                      onPress={() => handleDeleteSlot(item.id, slotTime)}
                    >
                      <Text style={styles.deleteBtnIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* FAB to Add Slot */}
        {!isLoading && filteredSlots.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.9}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.fabText}>➕</Text>
          </TouchableOpacity>
        )}

        {/* Add Slot Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Booking Slot</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDaySub}>
                For: {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.name}
              </Text>
              
              <SizedBox height={16} />

              {/* Start Time Selection */}
              <Text style={styles.fieldLabel}>Start Time</Text>
              <SizedBox height={6} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSelector}>
                {STANDARD_TIMES.map((time) => {
                  const isSel = time === startTime;
                  return (
                    <TouchableOpacity
                      key={`start-${time}`}
                      style={[styles.timeOption, isSel && styles.timeOptionSelected]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text style={[styles.timeOptionText, isSel && styles.timeOptionTextSelected]}>
                        {formatTimeDisplay(time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <SizedBox height={16} />

              {/* End Time Selection */}
              <Text style={styles.fieldLabel}>End Time</Text>
              <SizedBox height={6} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSelector}>
                {STANDARD_TIMES.map((time) => {
                  const isSel = time === endTime;
                  return (
                    <TouchableOpacity
                      key={`end-${time}`}
                      style={[styles.timeOption, isSel && styles.timeOptionSelected]}
                      onPress={() => setEndTime(time)}
                    >
                      <Text style={[styles.timeOptionText, isSel && styles.timeOptionTextSelected]}>
                        {formatTimeDisplay(time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <SizedBox height={16} />

              {/* Price input */}
              <Text style={styles.fieldLabel}>Hourly Price (₹)</Text>
              <SizedBox height={6} />
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 600"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <SizedBox height={24} />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.8}
                onPress={handleAddSlot}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Slot</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default ManageSlotsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080612',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  backBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#a594ff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  daySelectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayStrip: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayTabSelected: {
    backgroundColor: '#6C4DF6',
    borderColor: '#6C4DF6',
  },
  dayLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotTimeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  slotPriceText: {
    color: '#a594ff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  statusInactive: {
    backgroundColor: 'rgba(255, 145, 0, 0.12)',
    borderColor: 'rgba(255, 145, 0, 0.35)',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBtnTextActive: {
    color: '#00E676',
  },
  statusBtnTextInactive: {
    color: '#FF9100',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 62, 62, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 62, 62, 0.2)',
  },
  deleteBtnIcon: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  emptyAddBtn: {
    backgroundColor: '#6C4DF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C4DF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#120E2E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  modalDaySub: {
    color: '#a594ff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.8,
  },
  timeSelector: {
    flexDirection: 'row',
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  timeOptionSelected: {
    backgroundColor: '#6C4DF6',
    borderColor: '#6C4DF6',
  },
  timeOptionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
  },
  priceInput: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    height: 56,
    backgroundColor: '#6C4DF6',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
