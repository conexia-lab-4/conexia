import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from '../../assets/icons/IconBack';
import { IconBook } from '../../assets/icons/IconBook';
import { IconGraduationCap } from '../../assets/icons/IconGraduationCap';
import { IconLocation } from '../../assets/icons/IconLocation';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { TextField } from '../../components/textfield';
import { Button } from '../../components/button';
import { DaySelector, type DayValue } from '../../components/dayselector';
import { ColorPicker } from '../../components/colorpicker';
import {
  ScheduleSection,
  type SchedulesByDay,
} from '../../components/schedulesection';
import addSubjectHeader from '../../assets/images/add-subject-header.svg';
import './index.css';

const ICON_COLOR = 'var(--color-grey-400)';

export function AddSubject() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [career, setCareer] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayValue[]>([]);
  const [schedules, setSchedules] = useState<SchedulesByDay>({});
  const [campus, setCampus] = useState('');
  const [classroom, setClassroom] = useState('');
  const [colorId, setColorId] = useState<string | null>(null);

  const toggleDay = (day: DayValue) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        setSchedules((s) => {
          const next = { ...s };
          delete next[day];
          return next;
        });
        return prev.filter((d) => d !== day);
      }
      setSchedules((s) => ({ ...s, [day]: [{ start: '', end: '' }] }));
      return [...prev, day];
    });
  };

  const handleChangeRange = (
    day: DayValue,
    index: number,
    field: 'start' | 'end',
    value: string,
  ) => {
    setSchedules((s) => {
      const ranges = [...(s[day] ?? [])];
      ranges[index] = { ...ranges[index], [field]: value };
      return { ...s, [day]: ranges };
    });
  };

  const handleAddRange = (day: DayValue) => {
    setSchedules((s) => ({
      ...s,
      [day]: [...(s[day] ?? []), { start: '', end: '' }],
    }));
  };

  const handleRemoveRange = (day: DayValue, index: number) => {
    setSchedules((s) => {
      const ranges = (s[day] ?? []).filter((_, i) => i !== index);
      return { ...s, [day]: ranges.length ? ranges : [{ start: '', end: '' }] };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const flatSchedules = selectedDays.flatMap((day) =>
      (schedules[day] ?? []).map((range) => ({
        dayOfWeek: day,
        startTime: range.start,
        endTime: range.end,
      })),
    );

    const payload = {
      name,
      career,
      campus,
      classroom,
      colorId,
      schedules: flatSchedules,
    };

    // TODO KAN-111: reemplazar por la llamada real al endpoint POST
    console.log('Alta de materia (pendiente de persistir):', payload);
    navigate('/schedule');
  };

  return (
    <div className="add-subject">
      <header className="add-subject__header">
        <button
          type="button"
          className="add-subject__back"
          onClick={() => navigate('/schedule')}
          aria-label="Volver"
        >
          <IconBack size={24} color={ICON_COLOR} />
        </button>
        <div className="add-subject__heading">
          <h1 className="add-subject__title text-h5">Agregar Materia</h1>
          <p className="add-subject__subtitle text-body-2">
            Completa los datos de la materia para agregarla a tu horario.
          </p>
        </div>
        <img
          src={addSubjectHeader}
          alt=""
          className="add-subject__illustration"
        />
      </header>

      <form className="add-subject__form" onSubmit={handleSubmit}>
        <TextField
          label="Nombre de la materia"
          variant="filled"
          leftIcon={<IconBook size={20} color={ICON_COLOR} />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Análisis Matemático"
        />

        <TextField
          label="Carrera"
          variant="filled"
          leftIcon={<IconGraduationCap size={20} color={ICON_COLOR} />}
          value={career}
          onChange={(e) => setCareer(e.target.value)}
          placeholder="Ej. Ingeniería"
        />

        <div className="add-subject__field-group">
          <span className="add-subject__group-label text-body-3">
            Día de la semana
          </span>
          <DaySelector selected={selectedDays} onToggle={toggleDay} />
        </div>

        <ScheduleSection
          selectedDays={selectedDays}
          schedules={schedules}
          onChangeRange={handleChangeRange}
          onAddRange={handleAddRange}
          onRemoveRange={handleRemoveRange}
        />

        <TextField
          label="Sede/Campus"
          variant="filled"
          leftIcon={<IconLocation size={20} color={ICON_COLOR} />}
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          placeholder="Ej. Pilar"
        />

        <TextField
          label="Aula"
          variant="filled"
          leftIcon={<IconBook size={20} color={ICON_COLOR} />}
          value={classroom}
          onChange={(e) => setClassroom(e.target.value)}
          placeholder="Ej. 302"
        />

        <div className="add-subject__field-group">
          <span className="add-subject__group-label text-body-3">
            Color de la materia
          </span>
          <ColorPicker selected={colorId} onSelect={setColorId} />
        </div>

        <div className="add-subject__info">
          <div className="add-subject__info-icon">
            <IconUsersThree size={24} color="var(--color-info-callout-icon)" />
          </div>
          <div className="add-subject__info-text">
            <span className="add-subject__info-title">¿Cómo funciona?</span>
            <p className="add-subject__info-body">
              Te mostramos estudiantes con intereses, horarios y rutas
              compatibles
            </p>
          </div>
        </div>

        <Button type="submit" variant="fulfilled" size="large-wide">
          Agregar materia
        </Button>
      </form>
    </div>
  );
}
