import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { storage } from '../services/mmkv';
import { getURL, env } from '../services/request';
import { fetchMatchControllerGetMatchDetail } from '../Api/playVerseComponents';

// Extract the base host URL without /api suffix for Socket.IO connection
const getSocketURL = (): string => {
  const url = getURL(env);
  if (url.endsWith('/api')) {
    return url.substring(0, url.length - 4);
  }
  if (url.endsWith('/api/')) {
    return url.substring(0, url.length - 5);
  }
  return url;
};

export interface MatchState {
  id: number;
  sport_id: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  home_team_id: number | null;
  away_team_id: number | null;
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
}

export const useMatchSocket = (matchId: number) => {
  const [isConnected, setIsConnected] = useState(false);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Keep track of event sequence numbers to prevent duplicate and out-of-order execution
  const sequenceNumberRef = useRef(1);

  const syncState = useCallback((state: any) => {
    if (!state) return;
    setMatchState((prev) => {
      // If we receive an older version, ignore it (prevent out-of-order events)
      if (prev && state.version !== undefined && state.version < prev.version) {
        console.log(`Ignored stale match state version: ${state.version} vs current: ${prev.version}`);
        return prev;
      }
      return state;
    });
  }, []);

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
          setMatchState(data as unknown as MatchState);
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
  }, [matchId]);

  useEffect(() => {
    const socketUrl = getSocketURL();
    const token = storage.getString('accessToken');

    console.log(`Connecting to Socket.IO server at: ${socketUrl} for match: ${matchId}`);

    const socket = io(socketUrl, {
      transports: ['websocket'],
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
    socket.on('error', (errMsg: string) => {
      setError(errMsg);
      setSyncing(false);
      console.error('Socket error event:', errMsg);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId, syncState]);

  // Authoritative Scoring event emission
  const scorePoint = useCallback((teamId: number, playerId?: number, eventType: string = 'POINT') => {
    if (!socketRef.current || !isConnected) {
      setError('Cannot score: connection offline');
      return;
    }

    setSyncing(true);
    const eventSeq = sequenceNumberRef.current++;
    const currentVersion = matchState?.version ?? 0;

    const payload = {
      matchId,
      teamId,
      playerId: playerId || null,
      eventType,
      points: 1,
      sequenceNumber: eventSeq,
      matchVersion: currentVersion,
    };

    console.log('Emitting scoring event:', payload);
    socketRef.current.emit('score_event', payload);
  }, [matchId, isConnected, matchState]);

  // Score correction/undo last action
  const undoLastAction = useCallback(() => {
    if (!socketRef.current || !isConnected) {
      setError('Cannot undo: connection offline');
      return;
    }

    setSyncing(true);
    console.log('Emitting undo event for match:', matchId);
    socketRef.current.emit('undo_event', { matchId });
  }, [matchId, isConnected]);

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
        setMatchState(data as unknown as MatchState);
      }
    } catch (err: any) {
      console.error('Error syncing match state:', err);
      setError(err.message || 'Failed to sync match state');
    } finally {
      setSyncing(false);
    }
  }, [matchId, isConnected]);

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
