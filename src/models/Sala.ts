import z from 'zod';

export const SalaSchema = z.object({
    publico: z.boolean({ message: "Debe ser un valor booleano" }),
    codigo: z.string({ message: "Debe ser un string" })
                .min(3, 'Minimo 3 caracteres')
                .max(45, 'Maximo 45 caracteres')
                .nullable()
}).superRefine(({ codigo }, ctx) => {
    if (codigo != null && codigo.includes(" ")) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["codigo"],
            message: "No debe contener espacios"
        })
    }
});

export type Sala = {
    idSala: number,
    codigo: string,
    enJuego: boolean,
    publico: number
}