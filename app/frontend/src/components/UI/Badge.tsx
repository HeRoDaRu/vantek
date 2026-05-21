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