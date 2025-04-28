import { db } from "../index.js";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { Usuario, UsuarioSchema } from "../models/Usuario.js";
import jwt from "jsonwebtoken";
import { cambiarSala, decodeToken } from "../utils/sharedFunc.js";
import { salaTieneUsuario } from "../utils/SalaUtil.js";
import { Sala } from "../models/Sala.js";

export class UsuarioController {
    async crearUsuario(req: Request, res: Response) {
        const { nombre } = req.body;

        try {
            const usuario = await UsuarioSchema.parseAsync({ nombre });
            const sql = 'CALL alta_usuario(?);'
            
            await db!.execute(sql, [usuario.nombre]);
            const [row, _fields] = await db!.execute("SELECT nombre, idUsuario FROM Usuario WHERE idUsuario = LAST_INSERT_ID()")
            const transformRow = Array.isArray(row) && row[0];
            const result = transformRow as Usuario;
            const token = jwt.sign({ nombre: result.nombre, idUsuario: result.idUsuario }, String(process.env.JWT_SECRET), { expiresIn: 60*60*24*8 });
            res.cookie("token", token);
            res.status(204).send();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({ message: error.errors[0]?.message });
            } else {
                res.status(500).json({ message: "No se puede crear la cuenta en este momento" });
            }
        }
    }

    async unirseSala (req: Request, res: Response) {
        const { idSala, codigo } = req.body;

        try {
            const usuarioJWT = decodeToken(req);
            const [row, _fields] = await salaTieneUsuario(idSala)
            const [rowSala, _fieldsS] = await db!.execute("SELECT publico, codigo FROM Sala WHERE idSala = ?", [idSala]);

            if (!Array.isArray(rowSala)) return;

            const sala = rowSala[0] as Sala;

            if (Array.isArray(row) && row.length > 1) {
                res.status(400).json({ message: "Esta sala esta llena" });
                return;
            }
            
            if (Array.isArray(row) && row.length == 0) {
                res.status(404).json({ message: "La sala no existe" });
                return;
            }
            
            if (!Boolean(sala.publico) && sala.codigo != codigo) {
                res.status(400).json({ message: "Codigo incorrecto" });
                return;
            }

            await cambiarSala(idSala, usuarioJWT!.idUsuario);
            res.status(204).send();
        } catch (error) {
            console.log(error);
            res.json({ message: "No es posible unirse a esta sala en este momento" });
        }
    }
}