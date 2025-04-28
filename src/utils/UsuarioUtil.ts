import { db } from "../index.js";

export const eliminaUsuario = async (nombre: string) => {
    const sql = "DELETE FROM Usuario WHERE nombre = ?";
    try {
        await db!.execute(sql, [nombre]);
    } catch (error) {
        console.log("No se pudo eliminar al usuario");
        console.log(error);
    }
}

export const reestablecerUsuario = async (idSala: number) => 
    await db!.execute("UPDATE Usuario SET juegaCon = NULL, turno = NULL WHERE idSala = ?", [idSala]);

export const sumarPuntos = async (idUsuario: number, puntos: number) => 
    await db!.execute("UPDATE Usuario SET puntos = ? WHERE idUsuario = ?", [puntos, idUsuario]);

export const borrarJugadas = async (idSala: number) =>
    await db!.execute("DELETE FROM Jugada WHERE idSala = ?", [idSala]);