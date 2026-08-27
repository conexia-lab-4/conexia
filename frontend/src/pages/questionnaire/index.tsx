import { useState } from 'react';
import { ProgressBar } from '../../components/progressbar';
import { SelectableCard } from '../../components/selectablecard';
import { Button } from '../../components/button';
import { UNIVERSITIES } from './universities';
import './index.css';
import { IconBack } from '../../assets/icons/IconBack.tsx';

const TOTAL_STEPS = 3;

export function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(1);
  const [universityId, setUniversityId] = useState<string | null>(null);

  const handleContinue = () => {
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  };

  const handleBack = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
  };

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

        <div className="questionnaire__footer">
          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            disabled={!universityId}
            onClick={handleContinue}
          >
            Continuar
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
