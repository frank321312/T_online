import { db } from "../index.js";

export const eliminaSala = async (idSala: number) => {
    const sql = "DELETE FROM Sala WHERE idSala = ?";
    try {
        await db!.execute(sql, [idSala]);
    } catch (error) {
        console.log("No se pudo eliminar la sala");
        console.log(error);
    }
}

export const salaTieneUsuario = async (idSala: number) => 
    await db!.execute("SELECT s.idSala FROM Sala s INNER JOIN Usuario u ON s.idSala = u.idSala WHERE s.idSala = ?", [idSala]);