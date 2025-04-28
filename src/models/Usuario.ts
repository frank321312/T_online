import z from 'zod';
import { db } from '../index.js';

async function existeNombre(n: string) {
  try {
    const [row, _fields] = await db!.execute("SELECT nombre FROM Usuario WHERE nombre = ?", [n]);
    return row
  } catch (error) {
    return "ERROR" 
  }
}

export const UsuarioSchema = z.object({
  nombre: z.string()
            .min(3, 'Minimo 3 caracteres')
            .max(45, 'Maximo 45 caracteres')
            .refine(n => !n.includes(" "),  'No debe contener espacios')
}).superRefine( async ({ nombre }, ctx) => {
  const usuario = await existeNombre(nombre);
  if (Array.isArray(usuario) && usuario.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nombre"],
      message: "Ya existe ese nombre"
    });

    return z.NEVER;
  }

  if (usuario == "ERROR") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nombre"],
      message: "No se pudo crear la cuenta en este momento :("
    })
  }
});

export type Usuario = {
  nombre: string,
  idUsuario: number,
  idSala: number;
  puntos: number,
  juegaCon: boolean,
  turno: boolean,
}