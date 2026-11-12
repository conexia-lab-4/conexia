import { Button } from '../../components/button';
import { IconCheck } from '../../assets/icons/IconCheck';

export type PublishedKind = 'TRIP' | 'ROUND_TRIP' | 'INTENT' | 'ROUND_INTENT';

const COPY: Record<PublishedKind, { title: string; body: string }> = {
  TRIP: {
    title: '¡Viaje publicado!',
    body: 'Tu viaje ya está visible para otros estudiantes. Te avisaremos cuando haya novedades.',
  },
  ROUND_TRIP: {
    title: '¡Viaje de ida y vuelta publicado!',
    body: 'Publicamos tu ida y tu vuelta. Te avisaremos cuando haya novedades.',
  },
  INTENT: {
    title: '¡Intención publicada!',
    body: 'Buscaremos conductores con un recorrido compatible. Te avisaremos cuando haya novedades.',
  },
  ROUND_INTENT: {
    title: '¡Intención de ida y vuelta publicada!',
    body: 'Buscaremos conductores compatibles para tu ida y tu vuelta. Te avisaremos cuando haya novedades.',
  },
};

interface PublishSuccessProps {
  kind: PublishedKind;
  onSeeTrips: () => void;
  onPublishAnother: () => void;
}

export function PublishSuccess({
  kind,
  onSeeTrips,
  onPublishAnother,
}: PublishSuccessProps) {
  const { title, body } = COPY[kind];
  const isIntent = kind === 'INTENT' || kind === 'ROUND_INTENT';

  return (
    <section className="publish-success" role="status">
      <span className="publish-success__halo" aria-hidden="true">
        <span className="publish-success__badge">
          <IconCheck size={40} color="var(--color-white)" />
        </span>
      </span>
      <h2 className="publish-success__title text-h5">{title}</h2>
      <p className="publish-success__body text-body-2">{body}</p>
      <div className="publish-success__actions">
        <Button
          type="button"
          variant="fulfilled"
          size="large-wide"
          onClick={onSeeTrips}
        >
          Ver mis viajes
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="large-wide"
          onClick={onPublishAnother}
        >
          {isIntent ? 'Buscar otro viaje' : 'Publicar otro viaje'}
        </Button>
      </div>
    </section>
  );
}
