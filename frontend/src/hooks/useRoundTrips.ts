import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/authContext';
import { acceptMatch } from '../lib/matchesApi';
import {
  getMyRoundTrips,
  getRoundTripMatches,
  type RoundTripLeg,
  type RoundTripWithMatches,
} from '../lib/roundTripsApi';
import { canAcceptLeg, checkCancelLeg, getLegId } from '../lib/roundTripRules';
import { deleteTravelIntent } from '../lib/travelIntentsApi';
import { deleteTrip, UnavailableError } from '../lib/tripsApi';

export type RoundTripLoadStatus = 'loading' | 'ready' | 'error' | 'unavailable';

interface LoadResult {
  roundTrip: RoundTripWithMatches | null;
  status: RoundTripLoadStatus;
}

// Nunca rechaza: un error se traduce al estado que muestra la pantalla
async function fetchRoundTrip(id: string): Promise<LoadResult> {
  try {
    return { roundTrip: await getRoundTripMatches(id), status: 'ready' };
  } catch (error) {
    if (error instanceof UnavailableError) {
      return { roundTrip: null, status: 'unavailable' };
    }
    console.error('Error al cargar el viaje de ida y vuelta:', error);
    return { roundTrip: null, status: 'error' };
  }
}

// Un paquete propio con las coincidencias de cada tramo. Todo sale del
// backend: después de cada operación, salga bien o mal, se vuelve a consultar
export function useRoundTrip(id: string | undefined) {
  const { user } = useAuth();
  const [roundTrip, setRoundTrip] = useState<RoundTripWithMatches | null>(null);
  const [status, setStatus] = useState<RoundTripLoadStatus>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  // Id del tramo con una operación en curso, para deshabilitar sus botones
  const [busyLegId, setBusyLegId] = useState<string | null>(null);

  const apply = useCallback((result: LoadResult) => {
    setRoundTrip(result.roundTrip);
    setStatus(result.status);
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    let ignore = false;

    fetchRoundTrip(id).then((result) => {
      if (!ignore) apply(result);
    });

    return () => {
      ignore = true;
    };
  }, [user, id, apply]);

  const retry = async () => {
    if (!id) return;
    setStatus('loading');
    apply(await fetchRoundTrip(id));
  };

  // Recarga después de una operación. Si la consulta falla se conserva lo que
  // ya se mostraba, en vez de vaciar la pantalla
  const load = async () => {
    if (!id) return;
    const result = await fetchRoundTrip(id);
    if (result.status === 'error') {
      setActionError(
        (current) =>
          current ?? 'No pudimos actualizar el viaje. Volvé a intentar.',
      );
      return;
    }
    apply(result);
  };

  // Devuelve si la operación salió bien, para que la pantalla avise el éxito
  const runOnLeg = async (
    leg: RoundTripLeg,
    action: () => Promise<void>,
    fallback: string,
  ): Promise<boolean> => {
    if (busyLegId) return false;

    setBusyLegId(getLegId(leg));
    setActionError(null);
    let ok = false;
    try {
      await action();
      ok = true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallback);
    }
    await load();
    setBusyLegId(null);
    return ok;
  };

  // Confirma solo ese tramo: el otro sigue con sus propuestas
  const accept = (leg: RoundTripLeg) => {
    const match = leg.match;
    if (!roundTrip || !match || !canAcceptLeg(roundTrip.kind, leg)) {
      return Promise.resolve(false);
    }
    return runOnLeg(
      leg,
      () => acceptMatch(match.id),
      'No pudimos aceptar la coincidencia.',
    );
  };

  // Cancela solo ese tramo por su id: el otro queda como estaba
  const cancel = (leg: RoundTripLeg) => {
    const check = checkCancelLeg(leg);
    if (!check.allowed) {
      setActionError(check.reason);
      return Promise.resolve(false);
    }
    const { tripId, travelIntentId } = leg;
    return runOnLeg(
      leg,
      () =>
        tripId ? deleteTrip(tripId) : deleteTravelIntent(travelIntentId ?? ''),
      'No pudimos cancelar el tramo.',
    );
  };

  return {
    roundTrip,
    status,
    actionError,
    clearActionError: () => setActionError(null),
    busyLegId,
    retry,
    reload: () => load(),
    accept,
    cancel,
  };
}

// Los paquetes propios con algún tramo que todavía no terminó
export function useMyRoundTrips() {
  const { user } = useAuth();
  const [roundTrips, setRoundTrips] = useState<RoundTripWithMatches[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let ignore = false;

    getMyRoundTrips()
      .then((data) => {
        if (ignore) return;
        setRoundTrips(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Error al cargar los viajes de ida y vuelta:', error);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [user, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  return { roundTrips, status, retry };
}
