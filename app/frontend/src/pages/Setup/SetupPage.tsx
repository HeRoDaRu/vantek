/**
 * ──────────────────────────────────────────────────────────────────────────────
 * SetupPage.tsx — First-run setup wizard (profile + company data)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Three-step onboarding wizard shown when the app is not yet configured:
 *   (1) pick a business profile (reformas / taller / otro, with custom entity
 *   labels), (2) enter company data, (3) finish. Persists the chosen profile
 *   and company info so the rest of the app can boot with the right terminology.
 *
 * ROUTE
 *   /* (catch-all rendered by App.tsx while the app is unconfigured)
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @utils/api → POST setup data to the backend
 *   Backend:
 *     · /api/setup endpoints → persist profile + company configuration
 *   Used by:
 *     · App.tsx catch-all route when setup is not complete
 *
 * INPUTS / OUTPUTS
 *   Input:  profile selection, custom entity labels, company fields
 *   Output: persisted initial configuration; app transitions out of setup mode
 *
 * NOTES
 *   · Not mounted under Layout; it replaces the whole app until setup completes.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import api from '@utils/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Perfil = 'reformas' | 'taller' | 'otro';

interface EntidadesCustom {
  cliente: string;
  clientes: string;
  agrupador: string;
  agrupadores: string;
  trabajo: string;
  trabajos: string;
}

interface Empresa {
  nombre: string;
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
}

// ─── Icono de logo ────────────────────────────────────────────────────────────

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Indicador de progreso ────────────────────────────────────────────────────

function StepDot({ num, state }: { num: number; state: 'done' | 'active' | 'pending' }) {
  const base: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    transition: 'all 150ms ease',
    background:
      state === 'done' ? 'var(--green)' : state === 'active' ? 'var(--accent)' : 'var(--bg-3)',
    color: state === 'pending' ? 'var(--text-3)' : '#fff',
    border: state === 'pending' ? '1px solid var(--border)' : 'none',
  };

  if (state === 'done') {
    return (
      <div style={base}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  return <div style={base}>{num}</div>;
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const labelStyle = (s: 'done' | 'active' | 'pending'): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    color: s === 'active' ? 'var(--text)' : s === 'done' ? 'var(--text-2)' : 'var(--text-3)',
  });

  const lineStyle = (done: boolean): React.CSSProperties => ({
    flex: 1,
    height: 1,
    background: done ? 'var(--green)' : 'var(--border)',
    margin: '0 8px',
  });

  const s1 = step > 1 ? 'done' : step === 1 ? 'active' : 'pending';
  const s2 = step > 2 ? 'done' : step === 2 ? 'active' : 'pending';
  const s3: 'done' | 'active' | 'pending' = step === 3 ? 'done' : 'pending';

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StepDot num={1} state={s1} />
        <span style={labelStyle(s1)}>Perfil de negocio</span>
      </div>
      <div style={lineStyle(step > 1)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StepDot num={2} state={s2} />
        <span style={labelStyle(s2)}>Datos de empresa</span>
      </div>
      <div style={lineStyle(step > 2)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StepDot num={3} state={s3} />
        <span style={labelStyle(s3)}>Listo</span>
      </div>
    </div>
  );
}

// ─── Opción de perfil ─────────────────────────────────────────────────────────

function ProfileOption({
  icon,
  name,
  desc,
  selected,
  onClick,
  wide = false,
}: {
  id: Perfil;
  icon: string;
  name: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        cursor: 'pointer',
        background: selected ? 'var(--accent-dim)' : 'var(--bg-3)',
        transition: 'all 150ms ease',
        gridColumn: wide ? 'span 2' : undefined,
        display: wide ? 'flex' : 'block',
        alignItems: wide ? 'center' : undefined,
        gap: wide ? 14 : undefined,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: selected ? 'var(--accent-dim)' : 'var(--bg-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          marginBottom: wide ? 0 : 10,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Campo de formulario ──────────────────────────────────────────────────────

function Field({
  label,
  required,
  id,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
}: {
  label: string;
  required?: boolean;
  id: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
      </label>
      <input
        id={id}
        type={type}
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={error ? { borderColor: 'var(--red)' } : undefined}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ─── Paso 1 — Perfil de negocio ───────────────────────────────────────────────

function Step1({
  perfil,
  setPerfil,
  entidades,
  setEntidades,
  onNext,
}: {
  perfil: Perfil;
  setPerfil: (p: Perfil) => void;
  entidades: EntidadesCustom;
  setEntidades: (e: EntidadesCustom) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<EntidadesCustom>>({});

  function validate() {
    if (perfil !== 'otro') return true;
    const e: Partial<EntidadesCustom> = {};
    const keys: (keyof EntidadesCustom)[] = [
      'cliente', 'clientes', 'agrupador', 'agrupadores', 'trabajo', 'trabajos',
    ];
    keys.forEach((k) => {
      if (!entidades[k].trim()) e[k] = 'Campo obligatorio';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  function setField(k: keyof EntidadesCustom, v: string) {
    setEntidades({ ...entidades, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  }

  return (
    <>
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
          ¿Qué tipo de negocio tienes?
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Esto adapta los términos y módulos de la aplicación
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ProfileOption
            id="reformas"
            icon="🏗️"
            name="Reformas"
            desc="Obras, direcciones, albaranes de material"
            selected={perfil === 'reformas'}
            onClick={() => setPerfil('reformas')}
          />
          <ProfileOption
            id="taller"
            icon="🔧"
            name="Taller mecánico"
            desc="Matrículas, reparaciones, órdenes de trabajo"
            selected={perfil === 'taller'}
            onClick={() => setPerfil('taller')}
          />
          <ProfileOption
            id="otro"
            icon="⚙️"
            name="Personalizado"
            desc="Define tus propios términos para cada entidad"
            selected={perfil === 'otro'}
            onClick={() => setPerfil('otro')}
            wide
          />
        </div>

        {perfil === 'otro' && (
          <div
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text-2)',
              marginBottom: 4,
            }}
          >
            Define cómo se llama cada elemento en tu negocio
          </div>
        )}

        {perfil === 'otro' && (
          <div className="form-grid form-grid-2" style={{ gap: 12 }}>
            {(
              [
                ['cliente', 'Cliente (singular)', 'ej. Cliente'],
                ['clientes', 'Cliente (plural)', 'ej. Clientes'],
                ['agrupador', 'Agrupador (singular)', 'ej. Proyecto'],
                ['agrupadores', 'Agrupador (plural)', 'ej. Proyectos'],
                ['trabajo', 'Trabajo (singular)', 'ej. Servicio'],
                ['trabajos', 'Trabajo (plural)', 'ej. Servicios'],
              ] as [keyof EntidadesCustom, string, string][]
            ).map(([key, label, placeholder]) => (
              <Field
                key={key}
                id={key}
                label={label}
                required
                placeholder={placeholder}
                value={entidades[key]}
                onChange={(v) => setField(key, v)}
                error={errors[key]}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Paso 1 de 2</span>
        <button className="btn btn-primary" onClick={handleNext}>
          Siguiente
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </>
  );
}

// ─── Paso 2 — Datos de empresa ────────────────────────────────────────────────

function Step2({
  empresa,
  setEmpresa,
  onBack,
  onSubmit,
  loading,
}: {
  empresa: Empresa;
  setEmpresa: (e: Empresa) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const [errors, setErrors] = useState<Partial<Empresa>>({});

  function set(k: keyof Empresa, v: string) {
    setEmpresa({ ...empresa, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  }

  function validate() {
    const e: Partial<Empresa> = {};
    if (!empresa.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!empresa.cif.trim()) e.cif = 'El CIF es obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (validate()) onSubmit();
  }

  return (
    <>
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
          Datos de tu empresa
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Aparecerán en la cabecera de facturas y presupuestos
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field
          id="nombre"
          label="Nombre de empresa o autónomo"
          required
          placeholder="ej. Reformas García S.L."
          value={empresa.nombre}
          onChange={(v) => set('nombre', v)}
          error={errors.nombre}
        />
        <div className="form-grid form-grid-2" style={{ gap: 12 }}>
          <Field
            id="cif"
            label="CIF / NIF"
            required
            placeholder="ej. B12345678"
            value={empresa.cif}
            onChange={(v) => set('cif', v)}
            error={errors.cif}
          />
          <Field
            id="telefono"
            label="Teléfono"
            placeholder="ej. 612 345 678"
            value={empresa.telefono}
            onChange={(v) => set('telefono', v)}
            type="tel"
          />
        </div>
        <Field
          id="direccion"
          label="Dirección fiscal"
          placeholder="ej. Calle Mayor 12, 28001 Madrid"
          value={empresa.direccion}
          onChange={(v) => set('direccion', v)}
        />
        <Field
          id="email"
          label="Email de empresa"
          placeholder="ej. contacto@miempresa.com"
          value={empresa.email}
          onChange={(v) => set('email', v)}
          type="email"
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          gap: 8,
        }}
      >
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Atrás
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
          style={{ background: loading ? undefined : 'var(--green)' }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: 14, height: 14 }} />
              Guardando...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Empezar a usar Vantek
            </>
          )}
        </button>
      </div>
    </>
  );
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────

function StepDone({ empresa, onOpen }: { empresa: Empresa; onOpen: () => void }) {
  return (
    <div
      style={{
        padding: '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--green-dim)',
          border: '1px solid var(--green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div style={{ fontSize: 18, fontWeight: 600 }}>¡Todo listo!</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 300, lineHeight: 1.7 }}>
        La configuración se ha guardado. Vantek está preparado para tu negocio.
      </div>

      <div
        style={{
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          textAlign: 'left',
          width: '100%',
        }}
      >
        {[
          ['Empresa', empresa.nombre],
          empresa.cif ? ['CIF / NIF', empresa.cif] : null,
          empresa.telefono ? ['Teléfono', empresa.telefono] : null,
          empresa.email ? ['Email', empresa.email] : null,
        ]
          .filter((x): x is string[] => x !== null)
          .map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 0',
                fontSize: 12,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--text-3)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
      </div>

      <button
        className="btn btn-primary"
        onClick={onOpen}
        style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
      >
        Abrir la aplicación
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SetupPage() {

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [perfil, setPerfil] = useState<Perfil>('reformas');
  const [entidades, setEntidades] = useState<EntidadesCustom>({
    cliente: '',
    clientes: '',
    agrupador: '',
    agrupadores: '',
    trabajo: '',
    trabajos: '',
  });
  const [empresa, setEmpresa] = useState<Empresa>({
    nombre: '',
    cif: '',
    direccion: '',
    telefono: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await api.post('/setup', {
        perfil,
        entidades_custom: perfil === 'otro' ? entidades : undefined,
        empresa,
      });
      setStep(3);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al guardar la configuración. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    // Recarga la app para que App.tsx vuelva a consultar /api/setup/status
    window.location.href = '/';
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogoIcon />
        </div>
        <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Vantek</span>
      </div>

      {/* Card principal */}
      <div
        className="card"
        style={{ width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)' }}
      >
        {step !== 3 && <ProgressBar step={step} />}

        {error && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '10px 14px',
              background: 'var(--red-dim)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              color: 'var(--red)',
            }}
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <Step1
            perfil={perfil}
            setPerfil={setPerfil}
            entidades={entidades}
            setEntidades={setEntidades}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2
            empresa={empresa}
            setEmpresa={setEmpresa}
            onBack={() => setStep(1)}
            onSubmit={submit}
            loading={loading}
          />
        )}

        {step === 3 && <StepDone empresa={empresa} onOpen={handleOpen} />}
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-3)' }}>
        Vantek · Configuración inicial
      </div>
    </div>
  );
}