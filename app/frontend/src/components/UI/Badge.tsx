/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Badge.tsx — Colored status pill for document / seguimiento / albarán states
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Renders a small pill with a colored dot and a human-readable label for a
 *   state string. Maps all known states (document, the 11 seguimiento states,
 *   albarán assignment states and trabajo states) to Spanish labels; the visual
 *   color comes from the matching .badge-<estado> CSS class.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · (none)
 *   Used by:
 *     · Lists/fichas across the app (clientes, documentos, seguimiento, albaranes)
 *
 * PROPS
 *   · estado: string → state key; selects the .badge-<estado> color + default text
 *   · label?: string → optional override text (otherwise derived from estado)
 *
 * INPUTS / OUTPUTS
 *   Input:  estado, optional label
 *   Output: <span class="badge badge-<estado>"> with dot + text
 *
 * NOTES
 *   · estadoLabels covers all 11 seguimiento states plus document/albarán/trabajo.
 *   · Unknown estado falls back to showing the raw key as text.
 * ──────────────────────────────────────────────────────────────────────────────
 */

interface BadgeProps {
  estado: string;
  label?: string;
}

// Mapeo de estado a etiqueta legible cuando no se pasa label
const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  cerrada: 'Cerrada',
  entregada: 'Entregada',
  pendiente_pago: 'Pendiente pago',
  pagada: 'Pagada',
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  visita_agendada: 'Visita agendada',
  pendiente_presupuesto: 'Pendiente presupuesto',
  a_la_espera: 'A la espera',
  en_curso: 'En curso',
  pendiente_facturar: 'Pendiente facturar',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  caducado: 'Caducado',
  sin_asignar: 'Sin asignar',
  parcial: 'Parcial',
  asignado: 'Asignado',
  activo: 'Activo',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export default function Badge({ estado, label }: BadgeProps) {
  const texto = label ?? estadoLabels[estado] ?? estado;
  return (
    <span className={`badge badge-${estado}`}>
      <span className="badge-dot" />
      {texto}
    </span>
  );
}