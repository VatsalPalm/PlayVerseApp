import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { storage } from '../services/mmkv';
import { getURL, env } from '../services/request';
import { fetchMatchControllerGetMatchDetail } from '../Api/playVerseComponents';

// Extract the base host URL without /api suffix for Socket.IO connection
const getSocketURL = (): string => {
  const url = getURL(env);
  let baseUrl = url;
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 4);
  } else if (baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 5);
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  return `${baseUrl}/match`;
};

export interface MatchState {
  id: number;
  sport_id: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  home_team_id: number | null;
  away_team_id: number | null;
  home_team_name?: string;
  away_team_name?: string;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  winner_team_id: number | null;
  pointsPerGame: number;
  winByTwo: boolean;
  gamesToWin: number;
  matchType: 'SINGLES' | 'DOUBLES';
  homePlayers: any[];
  awayPlayers: any[];
  periods: any[];
  events: any[];
  activeServerId?: number | null;
  serverNumber?: number; // 1 or 2 (in doubles)
  servingTeamId?: number | null;
  serverSide?: 'LEFT' | 'RIGHT'; // service court side
  version: number; // match version/sequence for concurrency
  tournamentId?: number | null;
}

export const useMatchSocket = (matchId: number) => {
  const [isConnected, setIsConnected] = useState(false);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Keep track of event sequence numbers to prevent duplicate and out-of-order execution
  const sequenceNumberRef = useRef(1);

  // Helper to convert backend nested response { match, players, periods, events } to a flat MatchState
  const flattenMatchState = useCallback((data: any): MatchState | null => {
    if (!data) return null;
    const matchObj = data.match || data;
    if (!matchObj || !matchObj.id) return null;

    const meta = (() => {
      try {
        return typeof matchObj.metadata === 'string' ? JSON.parse(matchObj.metadata) : (matchObj.metadata || {});
      } catch (e) {
        return {};
      }
    })();

    return {
      id: matchObj.id,
      sport_id: matchObj.sport_id,
      status: matchObj.status,
      home_team_id: matchObj.home_team_id ?? matchObj.homeTeamId ?? meta.homeTeamId,
      away_team_id: matchObj.away_team_id ?? matchObj.awayTeamId ?? meta.awayTeamId,
      home_team_name: matchObj.home_team_name || matchObj.homeTeamName || data.home_team_name || data.homeTeamName,
      away_team_name: matchObj.away_team_name || matchObj.awayTeamName || data.away_team_name || data.awayTeamName,
      scheduled_at: matchObj.scheduled_at,
      started_at: matchObj.started_at,
      ended_at: matchObj.ended_at,
      winner_team_id: matchObj.winner_team_id ?? matchObj.winnerTeamId ?? meta.winnerTeamId ?? null,
      pointsPerGame: matchObj.points_per_game ?? matchObj.pointsPerGame ?? meta.pointsPerGame ?? 11,
      winByTwo: matchObj.win_by_two === 1 || matchObj.win_by_two === true || matchObj.winByTwo === true || meta.winByTwo === true,
      gamesToWin: matchObj.games_to_win ?? matchObj.gamesToWin ?? meta.gamesToWin ?? 2,
      matchType: matchObj.match_type || matchObj.matchType || meta.matchType || 'SINGLES',
      homePlayers: data.players?.filter((p: any) => p.team_id === (matchObj.home_team_id ?? meta.homeTeamId)) || matchObj.homePlayers || [],
      awayPlayers: data.players?.filter((p: any) => p.team_id === (matchObj.away_team_id ?? meta.awayTeamId)) || matchObj.awayPlayers || [],
      periods: data.periods || matchObj.periods || [],
      events: data.events || matchObj.events || [],
      activeServerId: matchObj.active_server_id ?? matchObj.activeServerId ?? meta.currentServerId ?? meta.activeServerId ?? null,
      serverNumber: matchObj.server_number ?? matchObj.serverNumber ?? meta.serverNumber ?? null,
      servingTeamId: matchObj.serving_team_id ?? matchObj.servingTeamId ?? meta.servingTeamId ?? null,
      serverSide: matchObj.server_side ?? matchObj.serverSide ?? meta.serverSide ?? null,
      version: matchObj.version ?? data.version ?? meta.version ?? 1,
      tournamentId: matchObj.tournament_id ?? matchObj.tournamentId ?? meta.tournamentId ?? null,
    };
  }, []);

  const syncState = useCallback((state: any) => {
    if (!state) return;
    const flatState = flattenMatchState(state);
    if (!flatState) return;

    setMatchState((prev) => {
      // If we receive an older version, ignore it (prevent out-of-order events)
      if (prev && flatState.version !== undefined && flatState.version < prev.version) {
        console.log(`Ignored stale match state version: ${flatState.version} vs current: ${prev.version}`);
        return prev;
      }
      return flatState;
    });
  }, [flattenMatchState]);

  // Fetch initial match state via REST API on mount or matchId change
  useEffect(() => {
    let active = true;
    const fetchInitialState = async () => {
      try {
        setSyncing(true);
        const data = await fetchMatchControllerGetMatchDetail({
          pathParams: { matchId },
        });
        if (active && data) {
          const flat = flattenMatchState(data);
          if (flat) {
            setMatchState(flat);
          }
        }
      } catch (err: any) {
        console.error('Error fetching initial match state:', err);
        if (active) {
          setError(err.message || 'Failed to load initial match state');
        }
      } finally {
        if (active) {
          setSyncing(false);
        }
      }
    };

    fetchInitialState();

    return () => {
      active = false;
    };
  }, [matchId, flattenMatchState]);

  useEffect(() => {
    const socketUrl = getSocketURL();
    const token = storage.getString('accessToken');

    console.log(`Connecting to Socket.IO server at: ${socketUrl} for match: ${matchId}`);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Socket connected, joining room for match:', matchId);
      socket.emit('join_match', { matchId });
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      setError(err.message || 'Connection error');
      setIsConnected(false);
      console.error('Socket connection error:', err);
    });

    // Authoritative state updates broadcasted from server
    socket.on('match_state', (state: any) => {
      console.log('Received match state update:', state);
      syncState(state);
      setSyncing(false);
    });

    socket.on('match_update', (state: any) => {
      console.log('Received match update:', state);
      syncState(state);
      setSyncing(false);
    });

    // Handle error events from socket gateway
    socket.on('error', (errData: any) => {
      const errMsg = typeof errData === 'string' ? errData : errData.message || 'Unknown socket error';
      setError(errMsg);
      setSyncing(false);
      console.error('Socket error event:', errData);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId, syncState]);

  // Authoritative Scoring event emission (record_rally)
  const scorePoint = useCallback((teamId: number, playerId?: number, eventType: string = 'POINT') => {
    if (!socketRef.current || !isConnected) {
      setError('Cannot score: connection offline');
      return;
    }

    setSyncing(true);
    setTimeout(() => setSyncing(false), 4000);

    const currentVersion = matchState?.version ?? 0;

    const payload = {
      matchId,
      winnerTeamId: teamId,
      scoredByPlayerUserId: playerId || null,
      clientVersion: currentVersion,
    };

    console.log('Emitting record_rally event:', payload);
    socketRef.current.emit('record_rally', payload);
  }, [matchId, isConnected, matchState]);

  // Score correction/undo last action (undo_rally)
  const undoLastAction = useCallback(() => {
    if (!socketRef.current || !isConnected) {
      setError('Cannot undo: connection offline');
      return;
    }

    setSyncing(true);
    setTimeout(() => setSyncing(false), 4000);

    const currentVersion = matchState?.version ?? 0;
    const payload = {
      matchId,
      clientVersion: currentVersion,
    };
    console.log('Emitting undo_rally event for match:', payload);
    socketRef.current.emit('undo_rally', payload);
  }, [matchId, isConnected, matchState]);

  // Manual refresh/sync trigger
  const requestSync = useCallback(async () => {
    if (!socketRef.current || !isConnected) return;
    setSyncing(true);
    socketRef.current.emit('join_match', { matchId });
    try {
      const data = await fetchMatchControllerGetMatchDetail({
        pathParams: { matchId },
      });
      if (data) {
        const flat = flattenMatchState(data);
        if (flat) {
          setMatchState(flat);
        }
      }
    } catch (err: any) {
      console.error('Error syncing match state:', err);
      setError(err.message || 'Failed to sync match state');
    } finally {
      setSyncing(false);
    }
  }, [matchId, isConnected, flattenMatchState]);

  return {
    isConnected,
    matchState,
    error,
    syncing,
    scorePoint,
    undoLastAction,
    requestSync,
    clearError: () => setError(null),
  };
};

