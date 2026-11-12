import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authContext';
import {
  getRoundTripFuelEstimate,
  getTripFuelEstimate,
  type LegFuelEstimate,
  type RoundTripFuelEstimate,
} from '../../lib/fuelEstimateApi';
import {
  formatConsumption,
  formatCost,
  formatKm,
  formatLiters,
  formatPricePerLiter,
  getLegTitle,
  getReasonLabel,
} from './format';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

const DISCLAIMER =
  'Estimación orientativa con un consumo de referencia y el precio promedio de Nafta Súper en Buenos Aires. No es un gasto medido.';

interface FuelEstimateCardProps {
  status: LoadStatus;
  legs: LegFuelEstimate[];
  // Solo para paquetes: undefined en un viaje simple, null si falta un tramo
  total?: RoundTripFuelEstimate['total'];
}

function LegRow({
  leg,
  isPackage,
}: {
  leg: LegFuelEstimate;
  isPackage: boolean;
}) {
  const title = getLegTitle(leg, isPackage);

  if (!leg.available) {
    return (
      <div className="fuel-estimate__leg">
        <div className="fuel-estimate__leg-header">
          <span className="fuel-estimate__leg-title">{title}</span>
          <span className="fuel-estimate__unavailable">No disponible</span>
        </div>
        <p className="fuel-estimate__muted">
          {getReasonLabel(leg.reason)}
          {leg.distanceKm !== null &&
            ` Distancia: ${formatKm(leg.distanceKm)}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="fuel-estimate__leg">
      <div className="fuel-estimate__leg-header">
        <span className="fuel-estimate__leg-title">{title}</span>
        <span className="fuel-estimate__cost">≈ {formatCost(leg.costArs)}</span>
      </div>
      <dl className="fuel-estimate__details">
        <div>
          <dt>Distancia</dt>
          <dd>{formatKm(leg.distanceKm)}</dd>
        </div>
        <div>
          <dt>Consumo</dt>
          <dd>{formatConsumption(leg.consumptionLPer100Km)}</dd>
        </div>
        <div>
          <dt>Precio</dt>
          <dd>{formatPricePerLiter(leg.pricePerLiterArs)}</dd>
        </div>
        <div>
          <dt>Litros</dt>
          <dd>≈ {formatLiters(leg.liters)}</dd>
        </div>
      </dl>
    </div>
  );
}

// Bloque de presentación: recibe el resultado del backend tal cual
export function FuelEstimateCard({
  status,
  legs,
  total,
}: FuelEstimateCardProps) {
  const isPackage = total !== undefined;
  const missingLegs = legs
    .filter((leg) => !leg.available)
    .map((leg) => getLegTitle(leg, isPackage).toLowerCase());

  return (
    <section className="fuel-estimate" aria-busy={status === 'loading'}>
      <h2 className="fuel-estimate__title">Combustible estimado</h2>

      {status === 'loading' && (
        <p className="fuel-estimate__muted">Calculando estimación…</p>
      )}

      {status === 'error' && (
        <p className="fuel-estimate__muted">
          La estimación no está disponible por ahora.
        </p>
      )}

      {status === 'ready' && (
        <>
          {legs.map((leg) => (
            <LegRow key={leg.tripId} leg={leg} isPackage={isPackage} />
          ))}

          {isPackage &&
            (total ? (
              <div className="fuel-estimate__total">
                <span>Total ida y vuelta</span>
                <span>
                  ≈ {formatLiters(total.liters)} · {formatCost(total.costArs)}
                </span>
              </div>
            ) : (
              <p className="fuel-estimate__muted">
                {missingLegs.length > 0
                  ? `Total no disponible: falta la estimación de ${missingLegs.join(' y ')}.`
                  : 'Total no disponible: el paquete no tiene sus dos tramos.'}
              </p>
            ))}

          <p className="fuel-estimate__disclaimer">{DISCLAIMER}</p>
        </>
      )}
    </section>
  );
}

// Viaje simple: pide su estimación aparte, sin frenar el detalle del viaje
export function TripFuelEstimate({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [leg, setLeg] = useState<LegFuelEstimate | null>(null);

  useEffect(() => {
    if (!user) return;
    let ignore = false;

    getTripFuelEstimate(tripId)
      .then((data) => {
        if (ignore) return;
        setLeg(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Error al estimar el combustible:', error);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [user, tripId]);

  return <FuelEstimateCard status={status} legs={leg ? [leg] : []} />;
}

// Paquete de ida y vuelta con auto: tramos y total
export function RoundTripFuelEstimateCard({
  roundTripId,
}: {
  roundTripId: string;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [estimate, setEstimate] = useState<RoundTripFuelEstimate | null>(null);

  useEffect(() => {
    if (!user) return;
    let ignore = false;

    getRoundTripFuelEstimate(roundTripId)
      .then((data) => {
        if (ignore) return;
        setEstimate(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Error al estimar el combustible del paquete:', error);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [user, roundTripId]);

  return (
    <FuelEstimateCard
      status={status}
      legs={estimate?.legs ?? []}
      total={estimate ? estimate.total : null}
    />
  );
}
