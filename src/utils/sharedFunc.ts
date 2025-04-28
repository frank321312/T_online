import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, ruta } from "../index.js";
import { join } from "path";
import { eliminaUsuario } from "./UsuarioUtil.js";

export const decodeToken = (req: Request) => jwt.decode(req.headers.cookie!.split("=")[1]!, { json: true });

export const cambiarSala = async (idSala: number | null, idUsuario: number) => 
    await db!.execute("UPDATE Usuario SET idSala = ?, juegaCon = NULL, puntos = NULL, turno = NULL WHERE idUsuario = ?", [idSala , idUsuario]);

export const esGanador = (posiciones: number[]) => {
        const formasGanar = [
        [1,2,3],
        [4,5,6],
        [7,8,9],
        [1,4,7],
        [2,5,8],
        [3,6,9],
        [1,5,9],
        [3,5,7]
    ]

    for (const formas of formasGanar) {
        let contador = 0;
        
        for (const posicion of posiciones) {
            if (formas.includes(posicion)) {
                contador++;
            }
        }
        if (contador == 3) {
            return true;
        } 
    }
    return false;
}

export const verificarToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.cookie?.split("=")[1];
    try {
        if (!token) {
            res.sendFile(join(ruta, "views/sinPermiso.html"));
            return;
        }

        jwt.verify(token, String(process.env.JWT_SECRET));

        next();
    } catch (error) {
        const usuario = jwt.decode(!token ? "" : token, { json: true });
        if (error instanceof jwt.JsonWebTokenError && error.name == "JsonWebTokenError") {
            await eliminaUsuario(usuario ? usuario.nombre : "");
            res.clearCookie("token");
            res.sendFile(join(ruta, "views/tokenInvalido.html"));
        } else if (error instanceof jwt.TokenExpiredError && error.name == "TokenExpiredError") {
            await eliminaUsuario(usuario ? usuario.nombre : "");
            res.clearCookie("token");
            res.sendFile(join(ruta, "views/tokenExpirado.html"));
        } else {
            res.sendFile(join(ruta, "views/sinPermiso.html"));
        }
    }
}