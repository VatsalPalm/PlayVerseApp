import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, FlatList, ActivityIndicator, Alert, StatusBar, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../utils/types';
import { useGroundControllerGetMyGrounds, useGroundControllerDeleteGround, useAiControllerGetNearbyGrounds } from '../../Api/playVerseComponents';
import SizedBox from '../../Components/atoms/SizeBox';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { showMessage } from 'react-native-flash-message';
import { storage } from '../../services/mmkv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GroundsListScreen = () => {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  // Read userId from stored profile
  useEffect(() => {
    try {
      const stored = storage.getString('userProfile');
      if (stored) {
        const userObj = JSON.parse(stored);
        if (userObj?.id) setUserId(userObj.id);
        else if (userObj?.user_id) setUserId(userObj.user_id);
      }
    } catch (e) {
      console.log('Failed to read userId:', e);
    }
  }, []);

  // Get My Grounds query
  const { data: myGroundsData, isLoading, refetch } = useGroundControllerGetMyGrounds<any>({
    queryParams: {
      page: 1,
      limit: 100,
    },
  });

  // AI-powered search (only fires when query is submitted & userId is known)
  const { data: aiSearchData, isLoading: isAiSearching } = useAiControllerGetNearbyGrounds<any>(
    userId && submittedQuery
      ? {
          pathParams: { userId },
          queryParams: { query: submittedQuery },
        }
      : ({ queryKey: [], queryFn: undefined } as any),
    {
      enabled: !!(userId && submittedQuery),
      retry: false,
    },
  );

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const { mutate: deleteGround, isPending: isDeleting } = useGroundControllerDeleteGround({
    onSuccess: () => {
      showMessage({
        message: 'Ground Deleted',
        description: 'The ground has been successfully removed.',
        type: 'success',
      });
      refetch();
    },
    onError: (error: any) => {
      console.log('Failed to delete ground:', error);
      showMessage({
        message: 'Delete Failed',
        description: error?.message || 'Could not delete ground. Please try again.',
        type: 'danger',
      });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const allGrounds: any[] = myGroundsData?.data || myGroundsData?.result || [];

  // AI search results — convert recommendation list to a shape matching ground cards
  const aiGrounds: any[] | null = useMemo(() => {
    if (!submittedQuery || !aiSearchData) return null;
    const recs = aiSearchData?.data?.recommendations;
    if (!recs || !Array.isArray(recs) || recs.length === 0) return [];
    // Match AI recs back to full ground objects from allGrounds by ground_id
    return recs
      .map((rec: any) => {
        const full = allGrounds.find((g: any) => g.id === rec.ground_id);
        return full ? { ...full, _aiScore: rec.match_score, _aiReason: rec.why_recommended } : null;
      })
      .filter(Boolean);
  }, [aiSearchData, submittedQuery, allGrounds]);

  // Local filter (no query submitted or no AI data yet) — filter by name/address/city
  const localFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allGrounds;
    return allGrounds.filter((g: any) =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.address || '').toLowerCase().includes(q) ||
      (g.city || '').toLowerCase().includes(q)
    );
  }, [allGrounds, searchQuery]);

  // Final list: if AI search returned results use them, otherwise use local filter
  const displayedGrounds = aiGrounds !== null ? aiGrounds : localFiltered;

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) {
      setSubmittedQuery('');
      return;
    }
    setSubmittedQuery(q);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSubmittedQuery('');
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteTarget({ id, name });
  };

  const renderGroundItem = ({ item }: { item: any }) => {
    const sportsList = item.sports || [];
    const hasAiReason = !!item._aiReason;

    return (
      <View style={styles.groundCard}>
        {/* AI Match Score Badge */}
        {hasAiReason && (
          <View style={styles.aiMatchBadge}>
            <Text style={styles.aiMatchBadgeText}>🤖 AI Match {item._aiScore ? `${item._aiScore}/10` : ''}</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={styles.titleInfo}>
            <Text style={styles.groundName}>{item.name}</Text>
            <Text style={styles.groundAddress}>{item.address || 'No address added'}, {item.city || ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteIconButton}
            activeOpacity={0.7}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Text style={styles.deleteIconText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        {hasAiReason && (
          <View style={styles.aiReasonBox}>
            <Text style={styles.aiReasonText}>💡 {item._aiReason}</Text>
          </View>
        )}

        {item.description ? (
          <Text style={styles.groundDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <SizedBox height={12} />

        {/* Sports Chips */}
        {sportsList.length > 0 && (
          <View style={styles.sportsContainer}>
            {sportsList.map((sport: any, index: number) => {
              const sportName = sport.name || `Sport ID: ${sport}`;
              const typeLabel = sport.groundType || sport.ground_type;
              const formattedType =
                typeLabel === "BOX"
                  ? "Box Ground"
                  : typeLabel === "OPEN"
                  ? "Open Ground"
                  : typeLabel === "BOTH"
                  ? "Box & Open"
                  : typeLabel;
              return (
                <View key={index} style={styles.sportChip}>
                  <Text style={styles.sportChipText}>
                    {sportName}{formattedType ? ` • ${formattedType}` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <SizedBox height={16} />

        {/* Actions row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddEditGround', { groundId: item.id })}
          >
            <Text style={styles.editBtnText}>✏️ Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.slotsBtn]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ManageSlots', { groundId: item.id })}
          >
            <Text style={styles.slotsBtnText}>📅 Manage Slots</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Grounds</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, price, sport... (AI powered)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7} style={styles.searchClearBtn}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSearch} activeOpacity={0.8} style={styles.searchBtn}>
              {isAiSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.searchBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
          {submittedQuery ? (
            <Text style={styles.aiSearchLabel}>🤖 AI results for "{submittedQuery}"</Text>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6C4DF6" />
          </View>
        ) : (
          <FlatList
            data={isAiSearching ? [] : displayedGrounds}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={renderGroundItem}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {isAiSearching ? (
                  <>
                    <ActivityIndicator size="large" color="#6C4DF6" />
                    <SizedBox height={16} />
                    <Text style={styles.emptyTitle}>Searching with AI...</Text>
                    <Text style={styles.emptySubtitle}>Groq AI is analyzing your query: "{submittedQuery}"</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyIcon}>{submittedQuery ? '🤖' : '🏟️'}</Text>
                    <Text style={styles.emptyTitle}>{submittedQuery ? 'No AI Results Found' : 'No Grounds Registered'}</Text>
                    <Text style={styles.emptySubtitle}>
                      {submittedQuery
                        ? `No grounds matched "${submittedQuery}". Try rephrasing (e.g. "cricket ground" or "under ₹1000").`
                        : "You haven't listed any sports grounds yet. Register one to start managing slots!"}
                    </Text>
                    {!submittedQuery && (
                      <>
                        <SizedBox height={20} />
                        <TouchableOpacity
                          style={styles.emptyCreateBtn}
                          activeOpacity={0.8}
                          onPress={() => navigation.navigate('AddEditGround')}
                        >
                          <Text style={styles.emptyCreateBtnText}>➕ Register First Ground</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </View>
            }
          />
        )}

        {/* Floating Action Button (FAB) to Add Ground */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('AddEditGround')}
        >
          <Text style={styles.fabText}>➕</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>
            <Text style={styles.deleteModalTitle}>Delete Ground</Text>
            <Text style={styles.deleteModalDescription}>
              Are you sure you want to delete <Text style={styles.arenaHighlight}>"{deleteTarget?.name}"</Text>? This will permanently remove the ground and all its operational slots. This action cannot be undone.
            </Text>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
                activeOpacity={0.8}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                activeOpacity={0.8}
                onPress={() => {
                  if (deleteTarget) {
                    deleteGround({ pathParams: { id: deleteTarget.id } });
                    setDeleteTarget(null);
                  }
                }}
              >
                <Text style={styles.modalConfirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GroundsListScreen;

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBtn: {
    backgroundColor: '#6C4DF6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 62,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  aiSearchLabel: {
    color: '#a594ff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  aiMatchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108, 77, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  aiMatchBadgeText: {
    color: '#a594ff',
    fontSize: 11,
    fontWeight: '700',
  },
  aiReasonBox: {
    backgroundColor: 'rgba(0, 210, 255, 0.05)',
    borderLeftWidth: 2,
    borderLeftColor: '#00D2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  aiReasonText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
  },
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
    color: '#00D2FF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
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
  groundCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: {
    flex: 1,
    marginRight: 10,
  },
  groundName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  groundAddress: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  deleteIconButton: {
    backgroundColor: 'rgba(255, 62, 62, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 62, 62, 0.2)',
  },
  deleteIconText: {
    fontSize: 14,
  },
  groundDesc: {
    color: '#D1D5DB',
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  sportChip: {
    backgroundColor: 'rgba(108, 77, 246, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 77, 246, 0.3)',
  },
  sportChipText: {
    color: '#a594ff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  slotsBtn: {
    backgroundColor: '#6C4DF6',
  },
  slotsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  emptyCreateBtn: {
    backgroundColor: '#6C4DF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  emptyCreateBtnText: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    backgroundColor: '#120E2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  warningIconContainer: {
    backgroundColor: 'rgba(255, 62, 62, 0.1)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 62, 62, 0.2)',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 28,
  },
  deleteModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  arenaHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    backgroundColor: '#FF3B30',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
