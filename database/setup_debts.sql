-- Tabla para gestión de deudas
create table if not exists deudas (
  id uuid default gen_random_uuid() primary key,
  cliente_nombre text not null,
  cliente_apellido text,
  cliente_dni text,
  cliente_celular text,
  cliente_direccion text,
  total_deuda numeric default 0,
  historial jsonb default '[]'::jsonb, -- Array de objetos: { tipo: 'deuda'|'pago', monto: number, fecha: string, descripcion: string, producto?: string }
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
