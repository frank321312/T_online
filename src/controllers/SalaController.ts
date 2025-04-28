import { Request, Response } from "express";
import { Sala, SalaSchema } from "../models/Sala.js";
import { db } from "../index.js";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { cambiarSala, decodeToken } from "../utils/sharedFunc.js";

export class SalaController {
    async crearSala (req: Request, res: Response) {
        const { publico, codigo } = req.body;

        try {
            const sala = SalaSchema.parse({ publico, codigo: publico ? null : codigo });
            const sql = "CALL alta_sala(?, ?)";

            await db!.execute(sql, [sala.codigo, sala.publico]);
            const [row, _fields] = await db!.execute("SELECT idSala FROM Sala WHERE idSala = LAST_INSERT_ID()")
            const transformRow = Array.isArray(row) && row[0]
            const salaResult = transformRow as Sala
            const usuario = decodeToken(req);
            
            await cambiarSala(salaResult.idSala , usuario!.idUsuario)
            res.status(204).send();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ message: error.errors[0]?.message, path: error.errors[0]?.path[0] })
            } else {
                console.log(error);
                res.status(500).json({ message: "No se puede crear la sala en este momento" })
            }
        }
    }

    async obtenerSalas (_req: Request, res: Response) {
        try {
            const sql = "SELECT idSala, publico FROM Sala LIMIT 5";
            const [row, _fields] = await db!.execute(sql);
            if (Array.isArray(row) && row.length > 0) {
                res.json(row);
                return;
            }
            res.json({ message: "No hay salas en este momento" })
        } catch (error) {
            res.status(500).json({ message: "No se pudo obtener las salas en este momento" })
        }
    }

    async buscarSala (req: Request, res: Response) {
        try {
            const { sala } = req.query;
            if (isNaN(Number(sala))) {
                res.status(400).json({ message: "Se debe buscar por numero", codigo: 1 });
                return;
            }

            const [rowSala, _fieldsS] = await db!.execute("SELECT idSala, publico FROM Sala WHERE idSala = ?", [sala]);

            if (!Array.isArray(rowSala)) return;

            if (rowSala.length == 0) {
                res.status(404).json({ message: "Sala no encontrada", codigo: 2 });
                return;
            }

            res.json(rowSala);
        } catch (error) {
            res.status(500).json({ message: "No se pudo obtener la sala en este momento", codigo: 3});
        }
    }
}