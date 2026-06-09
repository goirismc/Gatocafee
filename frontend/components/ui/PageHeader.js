export default function PageHeader({ titulo, descripcion, accion }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-cafe-900">{titulo}</h1>
        {descripcion && <p className="text-cafe-500 text-sm mt-0.5">{descripcion}</p>}
      </div>
      {accion && <div>{accion}</div>}
    </div>
  );
}
