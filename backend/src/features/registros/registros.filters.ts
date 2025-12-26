import { z } from "zod";

const boolFromQuery = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    const s = v.trim().toLowerCase();
    if (s === "1" || s === "true" || s === "yes") return true;
    if (s === "0" || s === "false" || s === "no") return false;
    return undefined;
  });

const nonEmpty = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
  });

const isoDate = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), {
    message: "Invalid ISO date",
  });

export const registrosFiltersSchema = z.object({
  q: nonEmpty,
  tipo: z.enum(["ENTRADA", "SALIDA"]).optional(),
  categoria: z.enum(["EMPLEADO", "PROVEEDOR", "VISITANTE"]).optional(),
  dispositivoId: nonEmpty,
  bodega: nonEmpty,
  from: isoDate,
  to: isoDate,
  hoy: boolFromQuery,
  salidaSinEntrada: boolFromQuery,
});

export type RegistrosFilters = z.infer<typeof registrosFiltersSchema>;
