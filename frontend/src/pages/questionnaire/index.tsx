import { useState } from 'react';
import { ProgressBar } from '../../components/progressbar';
import { SelectableCard } from '../../components/selectablecard';
import { Button } from '../../components/button';
import { TextField } from '../../components/textfield';
import { IconBack } from '../../assets/icons/IconBack.tsx';
import { IconEye } from '../../assets/icons/IconEye.tsx';
import { IconChevronDown } from '../../assets/icons/IconChevronDown.tsx';
import { IconCar } from '../../assets/icons/IconCar.tsx';
import { IconBackpack } from '../../assets/icons/IconBackpack.tsx';
import { UNIVERSITIES } from './universities';
import './index.css';

const TOTAL_STEPS = 3;

export function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [career, setCareer] = useState('');
  const [year, setYear] = useState('');
  const [campus, setCampus] = useState('');
  const [hasCar, setHasCar] = useState<boolean | null>(null);
  const [availableSeats, setAvailableSeats] = useState('');

  const handleBack = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const handleContinue = () => {
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  };

  const handleFinish = () => {
    setIsFinished(true);
  };

  const isStep1Valid = Boolean(universityId);
  const isStep2Valid = Boolean(career.trim() && year.trim() && campus.trim());
  const isStep3Valid =
    hasCar === false || (hasCar === true && availableSeats.trim() !== '');

  const isCurrentStepValid =
    currentStep === 1
      ? isStep1Valid
      : currentStep === 2
        ? isStep2Valid
        : isStep3Valid;

  if (isFinished) {
    return (
      <div className="questionnaire app-container">
        <div className="questionnaire__topbar">
          <ProgressBar
            currentStep={TOTAL_STEPS}
            totalSteps={TOTAL_STEPS}
            isComplete
          />
        </div>
        <div className="questionnaire__card">
          {/* TODO: reemplazar por el diseño real de la pantalla de confirmación (pendiente) */}
          <h3 className="questionnaire__step-title text-h6">
            ¡Tu perfil está listo!
          </h3>
          <p className="questionnaire__step-subtitle text-body-3">
            Ya podés empezar a usar Conexia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="questionnaire app-container">
      <div className="questionnaire__topbar">
        <div className="questionnaire__nav">
          <button
            type="button"
            className="questionnaire__back"
            onClick={handleBack}
            aria-label="Volver"
          >
            <IconBack size={20} color="#6B7280" />
          </button>
          <button
            type="button"
            className="questionnaire__skip text-body-3-bold"
          >
            Completar después
          </button>
        </div>
        <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </div>

      <div className="questionnaire__header">
        <span className="questionnaire__eyebrow">TU PERFIL CONEXIA</span>
        <h2 className="text-h5">Queremos conocerte un poquito más</h2>
        <p className="questionnaire__lead">
          Completá estos datos para conectar con personas que compartan tu
          rutina.
        </p>
      </div>

      <div className="questionnaire__card">
        {currentStep === 1 && (
          <>
            <h3 className="questionnaire__step-title text-h6">
              ¿A qué universidad vas?
            </h3>
            <p className="questionnaire__step-subtitle text-body-3">
              Elegí tu universidad para personalizar tu experiencia.
            </p>

            <div className="questionnaire__grid">
              {UNIVERSITIES.map((university) => (
                <SelectableCard
                  key={university.id}
                  badge={university.abbreviation}
                  colorVariant={university.colorVariant}
                  title={university.name}
                  subtitle={university.campus}
                  selected={universityId === university.id}
                  onClick={() => setUniversityId(university.id)}
                />
              ))}
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h3 className="questionnaire__step-title text-h6">
              ¿Que estudias?
            </h3>
            <p className="questionnaire__step-subtitle text-body-3">
              Nos ayuda a encontrar coincidencias con estudiantes de rutinas
              parecidas.
            </p>

            <div className="questionnaire__fields">
              <TextField
                label="Carrera"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                placeholder="Buscá tu carrera"
                rightIcon={
                  <IconEye size={20} color="var(--color-primary-400)" />
                }
                onClickIcon={() => {
                  // TODO: definir comportamiento del ícono (a confirmar)
                }}
              />
              <TextField
                label="Año de cursada"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Seleccioná una opción"
                rightIcon={
                  <IconChevronDown size={20} color="var(--color-grey-400)" />
                }
              />
              <TextField
                label="Sede/Campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="Ej. Pilar, Ciudad Universitaria..."
              />
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <h3 className="questionnaire__step-title text-h6">¿Tenés auto?</h3>
            <p className="questionnaire__step-subtitle text-body-3">
              No hace falta tener auto para usar Conexia. Esto solo nos ayuda a
              mejorar tus matches.
            </p>

            <div className="questionnaire__car-options">
              <SelectableCard
                badge={<IconCar size={24} color="#5D93C8" />}
                colorVariant="none"
                title="Sí, tengo auto."
                subtitle="Puedo compartir algunos viajes con otros estudiantes."
                selected={hasCar === true}
                onClick={() => setHasCar(true)}
              />
              <SelectableCard
                badge={<IconBackpack size={24} color="#5D93C8" />}
                colorVariant="none"
                title="No tengo auto"
                subtitle="Quiero encontrar compañeros con recorridos compatibles."
                selected={hasCar === false}
                onClick={() => setHasCar(false)}
              />
            </div>

            {hasCar === true && (
              <div className="questionnaire__seats">
                <TextField
                  label="¿Cuántos lugares podrías ofrecer?"
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(e.target.value)}
                  placeholder="Ej. 2"
                  rightIcon={
                    <IconChevronDown size={20} color="var(--color-grey-400)" />
                  }
                />
              </div>
            )}
          </>
        )}

        <div className="questionnaire__footer">
          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            disabled={!isCurrentStepValid}
            onClick={
              currentStep === TOTAL_STEPS ? handleFinish : handleContinue
            }
          >
            {currentStep === TOTAL_STEPS ? 'Terminar' : 'Continuar'}
          </Button>
          <p className="questionnaire__footer-help text-body-3">
            Podés cambiar estos datos más adelante en tu perfil.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Questionnaire;
