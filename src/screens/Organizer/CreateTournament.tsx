import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';
import { HomeStackParamList } from '../../utils/types';
import { useTournamentControllerCreateTournament } from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPORTS = [
  { id: 1, name: 'Cricket' },
  { id: 2, name: 'Football' },
  { id: 5, name: 'Pickleball' },
  { id: 6, name: 'Badminton' },
];

const FORMATS = ['KNOCKOUT', 'ROUND_ROBIN', 'GROUP_STAGE'];

const formatInputToIso = (dateStr: string): string => {
  const trimmed = dateStr.trim();
  if (trimmed.includes(' ')) {
    return trimmed.replace(' ', 'T') + ':00.000Z';
  }
  return trimmed;
};

const CreateTournamentScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [sportId, setSportId] = useState(5); // Default to Pickleball
  const [format, setFormat] = useState<'KNOCKOUT' | 'ROUND_ROBIN' | 'GROUP_STAGE'>('KNOCKOUT');
  const [startDate, setStartDate] = useState('2026-08-25 10:00');
  const [endDate, setEndDate] = useState('2026-09-01 18:00');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [maxTeams, setMaxTeams] = useState('16');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-08-24 20:00');

  const { mutateAsync: createTournament, isPending } = useTournamentControllerCreateTournament();

  const handleCreate = async () => {
    if (!name.trim()) {
      showMessage({ message: 'Please enter tournament name', type: 'warning' });
      return;
    }

    try {
      const res = await createTournament({
        body: {
          name,
          sportId,
          format,
          startDate: formatInputToIso(startDate),
          endDate: formatInputToIso(endDate),
          visibility,
          maxTeams: parseInt(maxTeams, 10) || 16,
          registrationDeadline: formatInputToIso(registrationDeadline),
        },
      });

      showMessage({ message: 'Tournament created successfully!', type: 'success' });
      if (res && (res as any).tournamentId) {
        navigation.replace('TournamentDetails', { tournamentId: (res as any).tournamentId });
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      showMessage({ message: err.message || 'Failed to create tournament', type: 'danger' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Tournament</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
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
                <Text style={[styles.sportCardText, active && styles.sportCardTextActive]}>{sport.name}</Text>
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
                <Text style={[styles.formatTabText, active && styles.formatTabTextActive]}>{f.replace('_', ' ')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SizedBox height={16} />

        {/* Start / End Dates */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.textInput}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.textInput}
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>

        <SizedBox height={16} />

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
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.label}>Reg. Deadline</Text>
            <TextInput
              style={styles.textInput}
              value={registrationDeadline}
              onChangeText={setRegistrationDeadline}
            />
          </View>
        </View>

        <SizedBox height={16} />

        {/* Visibility */}
        <Text style={styles.label}>Visibility</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.visibilityBtn, visibility === 'PUBLIC' && styles.visibilityBtnActive]}
            onPress={() => setVisibility('PUBLIC')}
          >
            <Text style={[styles.visibilityText, visibility === 'PUBLIC' && styles.visibilityTextActive]}>Public</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visibilityBtn, { marginLeft: 12 }, visibility === 'PRIVATE' && styles.visibilityBtnActive]}
            onPress={() => setVisibility('PRIVATE')}
          >
            <Text style={[styles.visibilityText, visibility === 'PRIVATE' && styles.visibilityTextActive]}>Private</Text>
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
    </SafeAreaView>
  );
};

export default CreateTournamentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    color: '#FFF',
    fontSize: 14,
    height: 48,
    paddingHorizontal: 16,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: '30%',
    alignItems: 'center',
  },
  sportCardActive: {
    backgroundColor: '#6C4DF6',
    borderColor: '#6C4DF6',
  },
  sportCardText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  sportCardTextActive: {
    color: '#FFF',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  formatTabActive: {
    backgroundColor: '#6C4DF6',
    borderColor: '#6C4DF6',
  },
  formatTabText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  formatTabTextActive: {
    color: '#FFF',
  },
  row: {
    flexDirection: 'row',
  },
  visibilityBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityBtnActive: {
    backgroundColor: '#6C4DF6',
    borderColor: '#6C4DF6',
  },
  visibilityText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  visibilityTextActive: {
    color: '#FFF',
  },
  createBtn: {
    backgroundColor: '#6C4DF6',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C4DF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
