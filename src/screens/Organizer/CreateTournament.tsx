import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { showMessage } from "react-native-flash-message";
import { HomeStackParamList } from "../../utils/types";
import { useTournamentControllerCreateTournament } from "../../Api/playVerseComponents";
import SizedBox from "../../Components/atoms/SizeBox";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPORTS = [
  { id: 1, name: "Cricket" },
  { id: 2, name: "Football" },
  { id: 5, name: "Pickleball" },
  { id: 6, name: "Badminton" },
];

const FORMATS = ["KNOCKOUT", "ROUND_ROBIN", "GROUP_STAGE"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const getDaysInMonth = (year: number, month: number): (Date | null)[] => {
  const date = new Date(year, month, 1);
  const days: (Date | null)[] = [];
  const startDay = date.getDay();
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const CreateTournamentScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [sportId, setSportId] = useState(5); // Default to Pickleball
  const [format, setFormat] = useState<
    "KNOCKOUT" | "ROUND_ROBIN" | "GROUP_STAGE"
  >("KNOCKOUT");
  const [registrationType, setRegistrationType] = useState<'INDIVIDUAL' | 'TEAM'>('TEAM');
  const [teamSize, setTeamSize] = useState('5');
  const [minPlayersRequired, setMinPlayersRequired] = useState('1');
  const [teamApprovalRequired, setTeamApprovalRequired] = useState(false);
  const [initialTeamName, setInitialTeamName] = useState('');

  // Date and Time split states
  const [startDate, setStartDate] = useState("2026-08-25");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("2026-09-01");
  const [endTime, setEndTime] = useState("18:00");
  const [regDate, setRegDate] = useState("2026-08-24");
  const [regTime, setRegTime] = useState("20:00");

  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [maxTeams, setMaxTeams] = useState("16");

  // Modal control states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | 'reg'>('start');
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(7); // August (0-indexed is 7)
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const { mutateAsync: createTournament, isPending } =
    useTournamentControllerCreateTournament();

  const handleDaySelect = (dayDate: Date) => {
    const y = dayDate.getFullYear();
    const m = String(dayDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayDate.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    
    if (pickerTarget === 'start') {
      setStartDate(formatted);
    } else if (pickerTarget === 'end') {
      setEndDate(formatted);
    } else if (pickerTarget === 'reg') {
      setRegDate(formatted);
    }
    setShowDatePicker(false);
  };

  const handleTimeSelect = (hour: string, minute: string) => {
    const formatted = `${hour}:${minute}`;
    if (pickerTarget === 'start') {
      setStartTime(formatted);
    } else if (pickerTarget === 'end') {
      setEndTime(formatted);
    } else if (pickerTarget === 'reg') {
      setRegTime(formatted);
    }
    setShowTimePicker(false);
  };

  const openDatePicker = (target: 'start' | 'end' | 'reg') => {
    setPickerTarget(target);
    const currVal = target === 'start' ? startDate : target === 'end' ? endDate : regDate;
    if (currVal) {
      const parts = currVal.split('-');
      if (parts.length === 3) {
        setCalendarYear(parseInt(parts[0], 10));
        setCalendarMonth(parseInt(parts[1], 10) - 1);
      }
    } else {
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
    }
    setShowDatePicker(true);
  };

  const openTimePicker = (target: 'start' | 'end' | 'reg') => {
    setPickerTarget(target);
    const currVal = target === 'start' ? startTime : target === 'end' ? endTime : regTime;
    if (currVal) {
      const parts = currVal.split(':');
      if (parts.length === 2) {
        setSelectedHour(parts[0]);
        setSelectedMinute(parts[1]);
      }
    } else {
      setSelectedHour('12');
      setSelectedMinute('00');
    }
    setShowTimePicker(true);
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(calendarYear, calendarMonth);
    const dayRows: (Date | null)[][] = [];
    let currentRow: (Date | null)[] = [];
    
    days.forEach((day, index) => {
      currentRow.push(day);
      if (currentRow.length === 7 || index === days.length - 1) {
        while (currentRow.length < 7) {
          currentRow.push(null);
        }
        dayRows.push(currentRow);
        currentRow = [];
      }
    });

    return (
      <View style={styles.calendarContainer}>
        {/* Month Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => {
            if (calendarMonth === 0) {
              setCalendarMonth(11);
              setCalendarYear(y => y - 1);
            } else {
              setCalendarMonth(m => m - 1);
            }
          }}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.calendarMonthText}>{MONTH_NAMES[calendarMonth]} {calendarYear}</Text>
          <TouchableOpacity onPress={() => {
            if (calendarMonth === 11) {
              setCalendarMonth(0);
              setCalendarYear(y => y + 1);
            } else {
              setCalendarMonth(m => m + 1);
            }
          }}>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdaysRow}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
            <Text key={idx} style={styles.weekdayText}>{w}</Text>
          ))}
        </View>

        {/* Days grid */}
        {dayRows.map((row, rIdx) => (
          <View key={rIdx} style={styles.daysRow}>
            {row.map((day, dIdx) => {
              if (!day) return <View key={dIdx} style={styles.emptyDay} />;
              
              const isSelected = (
                (pickerTarget === 'start' && startDate === `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`) ||
                (pickerTarget === 'end' && endDate === `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`) ||
                (pickerTarget === 'reg' && regDate === `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`)
              );

              return (
                <TouchableOpacity 
                  key={dIdx} 
                  style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                  onPress={() => handleDaySelect(day)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showMessage({ message: "Please enter tournament name", type: "warning" });
      return;
    }
    if (!startDate || !startTime) {
      showMessage({ message: "Please select start date and time", type: "warning" });
      return;
    }
    if (!endDate || !endTime) {
      showMessage({ message: "Please select end date and time", type: "warning" });
      return;
    }
    if (!regDate || !regTime) {
      showMessage({ message: "Please select registration deadline date and time", type: "warning" });
      return;
    }

    try {
      const res = await createTournament({
        body: {
          name,
          sportId,
          format,
          startDate: `${startDate}T${startTime}:00.000Z`,
          endDate: `${endDate}T${endTime}:00.000Z`,
          visibility,
          maxTeams: parseInt(maxTeams, 10) || 16,
          registrationDeadline: `${regDate}T${regTime}:00.000Z`,
          registrationType,
          teamSize: registrationType === 'TEAM' ? (parseInt(teamSize, 10) || 5) : undefined,
          minPlayersRequired: registrationType === 'TEAM' ? (parseInt(minPlayersRequired, 10) || 1) : undefined,
          teamApprovalRequired: registrationType === 'TEAM' ? teamApprovalRequired : undefined,
          initialTeamName: (registrationType === 'TEAM' && initialTeamName.trim()) ? initialTeamName.trim() : undefined,
        },
      });

      showMessage({
        message: "Tournament created successfully!",
        type: "success",
      });
      if (res && (res as any).tournamentId) {
        navigation.replace("TournamentDetails", {
          tournamentId: (res as any).tournamentId,
        });
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to create tournament",
        type: "danger",
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#120B24" />
              <Stop offset="100%" stopColor="#05030A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bg)" />
        </Svg>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Tournament</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Tournament Name */}
          <Text style={styles.label}>Tournament Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. PlayVerse Pickleball Open"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
          />

          <SizedBox height={16} />

          {/* Sport Selection */}
          <Text style={styles.label}>Select Sport</Text>
          <View style={styles.sportGrid}>
            {SPORTS.map((sport) => {
              const active = sportId === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportCard, active && styles.sportCardActive]}
                  onPress={() => setSportId(sport.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sportCardText,
                      active && styles.sportCardTextActive,
                    ]}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SizedBox height={16} />

          {/* Tournament Format */}
          <Text style={styles.label}>Tournament Format</Text>
          <View style={styles.formatRow}>
            {FORMATS.map((f) => {
              const active = format === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.formatTab, active && styles.formatTabActive]}
                  onPress={() => setFormat(f as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.formatTabText,
                      active && styles.formatTabTextActive,
                    ]}
                  >
                    {f.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SizedBox height={16} />

          {/* Start Date & Time */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.selectorInput} onPress={() => openDatePicker('start')}>
                <Ionicons name="calendar-outline" size={18} color="#A78BFA" />
                <Text style={[styles.selectorInputText, !startDate && styles.placeholderText]}>
                  {startDate || "Select Date"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity style={styles.selectorInput} onPress={() => openTimePicker('start')}>
                <Ionicons name="time-outline" size={18} color="#A78BFA" />
                <Text style={[styles.selectorInputText, !startTime && styles.placeholderText]}>
                  {startTime || "Select Time"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <SizedBox height={16} />

          {/* End Date & Time */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.selectorInput} onPress={() => openDatePicker('end')}>
                <Ionicons name="calendar-outline" size={18} color="#A78BFA" />
                <Text style={[styles.selectorInputText, !endDate && styles.placeholderText]}>
                  {endDate || "Select Date"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity style={styles.selectorInput} onPress={() => openTimePicker('end')}>
                <Ionicons name="time-outline" size={18} color="#A78BFA" />
                <Text style={[styles.selectorInputText, !endTime && styles.placeholderText]}>
                  {endTime || "Select Time"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <SizedBox height={16} />

          {/* Registration Type */}
          <Text style={styles.label}>Registration Type</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.visibilityBtn,
                registrationType === "TEAM" && styles.visibilityBtnActive,
              ]}
              onPress={() => setRegistrationType("TEAM")}
            >
              <Text
                style={[
                  styles.visibilityText,
                  registrationType === "TEAM" && styles.visibilityTextActive,
                ]}
              >
                Team Registration
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityBtn,
                { marginLeft: 12 },
                registrationType === "INDIVIDUAL" && styles.visibilityBtnActive,
              ]}
              onPress={() => setRegistrationType("INDIVIDUAL")}
            >
              <Text
                style={[
                  styles.visibilityText,
                  registrationType === "INDIVIDUAL" && styles.visibilityTextActive,
                ]}
              >
                Individual
              </Text>
            </TouchableOpacity>
          </View>

          <SizedBox height={16} />

          {registrationType === 'TEAM' && (
            <>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Max Players Per Team</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={teamSize}
                    onChangeText={setTeamSize}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.label}>Min Players Required</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={minPlayersRequired}
                    onChangeText={setMinPlayersRequired}
                  />
                </View>
              </View>

              <SizedBox height={16} />

              <View style={styles.teamApprovalContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teamApprovalTitle}>Captain Approval Required</Text>
                  <Text style={styles.teamApprovalDesc}>
                    Players must request to join teams and captain has to accept.
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#1F1A30", true: "#6C4DF6" }}
                  thumbColor={teamApprovalRequired ? "#FFF" : "#9CA3AF"}
                  ios_backgroundColor="#1F1A30"
                  onValueChange={setTeamApprovalRequired}
                  value={teamApprovalRequired}
                />
              </View>

              <SizedBox height={16} />

              <Text style={styles.label}>Your Team Name (Initial Team - Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. My Awesome Team"
                placeholderTextColor="#6B7280"
                value={initialTeamName}
                onChangeText={setInitialTeamName}
              />

              <SizedBox height={16} />
            </>
          )}

          {/* Max Teams & Registration Deadline */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Max Teams</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={maxTeams}
                onChangeText={setMaxTeams}
              />
            </View>
          </View>

          <SizedBox height={16} />

          {/* Reg Deadline Date & Time */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Reg. Deadline Date</Text>
              <TouchableOpacity style={styles.selectorInput} onPress={() => openDatePicker('reg')}>
                <Ionicons name="calendar-outline" size={18} color="#A78BFA" />
                <Text style={[styles.selectorInputText, !regDate && styles.placeholderText]}>
                  {regDate || "Select Date"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>Reg. Deadline Time</Text>
              <TouchableOpacity style={styles.selectorInput} onPress={() => openTimePicker('reg')}>
                <Ionicons name="time-outline" size={18} color="#A78BFA" />
                <Text style={[styles.selectorInputText, !regTime && styles.placeholderText]}>
                  {regTime || "Select Time"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <SizedBox height={16} />

          {/* Visibility */}
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.visibilityBtn,
                visibility === "PUBLIC" && styles.visibilityBtnActive,
              ]}
              onPress={() => setVisibility("PUBLIC")}
            >
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "PUBLIC" && styles.visibilityTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityBtn,
                { marginLeft: 12 },
                visibility === "PRIVATE" && styles.visibilityBtnActive,
              ]}
              onPress={() => setVisibility("PRIVATE")}
            >
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "PRIVATE" && styles.visibilityTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>

          <SizedBox height={30} />

          {/* Submit */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreate}
            activeOpacity={0.8}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.createBtnText}>Create Tournament</Text>
            )}
          </TouchableOpacity>

          <SizedBox height={40} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            {renderCalendar()}
            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            
            <View style={styles.timePickerContainer}>
              {/* Hours Column */}
              <View style={styles.timeColumnWrapper}>
                <Text style={styles.timeColumnLabel}>Hour</Text>
                <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                  {HOURS.map((h) => {
                    const isSel = selectedHour === h;
                    return (
                      <TouchableOpacity 
                        key={h} 
                        style={[styles.timeSlot, isSel && styles.timeSlotSelected]}
                        onPress={() => setSelectedHour(h)}
                      >
                        <Text style={[styles.timeSlotText, isSel && styles.timeSlotTextSelected]}>{h}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Minutes Column */}
              <View style={styles.timeColumnWrapper}>
                <Text style={styles.timeColumnLabel}>Minute</Text>
                <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((m) => {
                    const isSel = selectedMinute === m;
                    return (
                      <TouchableOpacity 
                        key={m} 
                        style={[styles.timeSlot, isSel && styles.timeSlotSelected]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text style={[styles.timeSlotText, isSel && styles.timeSlotTextSelected]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.closeModalBtn, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.closeModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmModalBtn, { flex: 1, marginLeft: 8 }]}
                onPress={() => handleTimeSelect(selectedHour, selectedMinute)}
              >
                <Text style={styles.confirmModalBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CreateTournamentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0914",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    color: "#FFF",
    fontSize: 14,
    height: 48,
    paddingHorizontal: 16,
  },
  sportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    minWidth: "30%",
    alignItems: "center",
  },
  sportCardActive: {
    backgroundColor: "#6C4DF6",
    borderColor: "#6C4DF6",
  },
  sportCardText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  sportCardTextActive: {
    color: "#FFF",
  },
  formatRow: {
    flexDirection: "row",
    gap: 8,
  },
  formatTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  formatTabActive: {
    backgroundColor: "#6C4DF6",
    borderColor: "#6C4DF6",
  },
  formatTabText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
  },
  formatTabTextActive: {
    color: "#FFF",
  },
  row: {
    flexDirection: "row",
  },
  visibilityBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  visibilityBtnActive: {
    backgroundColor: "#6C4DF6",
    borderColor: "#6C4DF6",
  },
  visibilityText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  visibilityTextActive: {
    color: "#FFF",
  },
  createBtn: {
    backgroundColor: "#6C4DF6",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C4DF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  selectorInput: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    color: "#FFF",
    fontSize: 14,
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorInputText: {
    color: "#FFF",
    fontSize: 14,
  },
  placeholderText: {
    color: "#6B7280",
  },
  teamApprovalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    borderRadius: 14,
  },
  teamApprovalTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamApprovalDesc: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#120B24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekdayText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    width: (SCREEN_WIDTH - 40) / 7,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    width: (SCREEN_WIDTH - 40) / 7 - 4,
    height: (SCREEN_WIDTH - 40) / 7 - 4,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dayButtonSelected: {
    backgroundColor: '#6C4DF6',
  },
  dayText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyDay: {
    width: (SCREEN_WIDTH - 40) / 7 - 4,
    height: (SCREEN_WIDTH - 40) / 7 - 4,
  },
  closeModalBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 180,
    marginBottom: 20,
  },
  timeColumnWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  timeColumnLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  timeColumn: {
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  timeSlot: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: 'rgba(108,77,246,0.2)',
    borderLeftWidth: 3,
    borderColor: '#6C4DF6',
  },
  timeSlotText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  timeSlotTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  confirmModalBtn: {
    backgroundColor: '#6C4DF6',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmModalBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
