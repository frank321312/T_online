import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import express, { NextFunction } from 'express';
import usuarioRouter from './routes/UsuarioRoute.js'
import salaRouter from './routes/SalaRoute.js'
import { Request, Response } from "express";
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from "jsonwebtoken";
import { borrarJugadas, eliminaUsuario, reestablecerUsuario, sumarPuntos } from './utils/UsuarioUtil.js';
import { Usuario } from './models/Usuario.js';
import { eliminaSala, salaTieneUsuario } from './utils/SalaUtil.js';
import { cambiarSala, esGanador, verificarToken } from './utils/sharedFunc.js';
import { Jugada } from './models/Jugada.js';
import { Sala } from './models/Sala.js';

dotenv.config();
async function verificarConexion() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        })
        console.log("Conexion existosa con la base de datos");
        return db
    } catch (error) {
        console.log("Error al conectar con la base de datos");
        console.log(error);
    }
}

export const db = await verificarConexion();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    // path: "/web-chat",
    // addTrailingSlash: true
    pingTimeout: 10000,
    pingInterval: 5000,
    connectionStateRecovery: {}
});

const PORT = process.env.PORT || 4005;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ruta = path.resolve(__dirname, '..');

app.use(cors());
app.use(express.json());
app.use(express.static(join(ruta, 'views')))

app.use((_req: Request, res: Response, next: NextFunction) => {
    if (!db) {
        res.status(505).sendFile(join(ruta, 'views/fueraServicio.html'));
        return;
    }
    next();
});

app.use('/api/usuario', usuarioRouter);

app.get('/', (_req: Request, res: Response) => {
    res.send("Hello world!!!!!!!");
});

app.get('/registro', (_req: Request, res: Response) => {
    res.sendFile(join(ruta, 'views/registro.html'));
});

app.use(verificarToken);

app.use("/api/sala", salaRouter);

app.get("/sala", async (_req: Request, res: Response) => {    
    res.sendFile(join(ruta, 'views/sala.html'));
});

app.get("/inicio", (_req: Request, res: Response) => {
    res.sendFile(join(ruta, 'views/inicio.html'));
});

app.post("/decode-token", (req: Request, res: Response) => {
    const token = jwt.decode(String(req.body.token), { json: true });
    res.json(token);
});

const eventosPendientes = new Map();
const socketsDesconectados = new Map();
const temporizadores = new Map<number, NodeJS.Timer>();

io.on('connection', async (socket) => {
    const token = socket.handshake.headers.cookie?.split("=")[1];

    if (!token) {
        console.log("Problemas con el token");
        socket.disconnect();
        return;
    }

    const usuarioJWT = jwt.decode(token, { json: true });
    const [row, _fields] = await db!.execute("SELECT * FROM Usuario WHERE nombre = ?", [usuarioJWT!.nombre]);

    if (Array.isArray(row) && row.length == 0) {
        console.log("Matogroso")
        socket.disconnect();
        return;
    }
    if (!Array.isArray(row)) return;

    const usuario = row[0] as Usuario;
    const nombreSala = String(usuario.idSala);
    const [rowUsuarios, _fieldsU] = await db!.execute("SELECT idUsuario, nombre, idSala FROM Usuario WHERE idSala = ?", [usuario.idSala]);

    if (!usuario.idSala) {
        socket.disconnect();
        return;
    }

    if (!socketsDesconectados.has(usuario.idUsuario)) {
        socketsDesconectados.set(usuario.idUsuario, { desconectado: false });
    }

    socket.join(nombreSala);

    if (Array.isArray(rowUsuarios) && rowUsuarios.length > 1) {
        io.to(nombreSala).emit("oponente", rowUsuarios);
    }

    if (eventosPendientes.has(usuario.idUsuario) && Date.now() - eventosPendientes.get(usuario.idUsuario)[1] <= 10500) {
        const tiempoRestante = 10 - Math.floor((Date.now() - eventosPendientes.get(usuario.idUsuario)[1]) / 1000);
        eventosPendientes.get(usuario.idUsuario)[2] = tiempoRestante;
        const [rowPosicion, _fieldsP] = await db!.execute("SELECT posicion, u.juegaCon FROM Jugada j JOIN Usuario u ON j.idUsuario = u.idUsuario WHERE j.idSala = ?", [usuario.idSala]);
        const [rowUsuario, _fieldsU] = await db!.execute("SELECT turno FROM Usuario WHERE idUsuario = ?", [usuario.idUsuario]);
        console.log(usuario.nombre, "Yo entre aqui por que me falta un evento");
        socket.removeAllListeners("conteoJugada");
        socket.emit("eventoPendiente", rowPosicion, rowUsuario, tiempoRestante);
    }

    socket.on("mensaje", async (msg) => {
        await db!.execute("CALL alta_mensaje (?,?,?)", [msg, usuario.idUsuario, usuario.idSala])
        const [row, _fields] = await db!.execute("SELECT idMensaje, contenido, idUsuario FROM Mensaje WHERE idMensaje = LAST_INSERT_ID()")
        io.to(nombreSala).emit("mensajeSala", row, usuario);
    });

    socket.on("comenzar", async () => {
        const [rowUsuario, _fieldsU] = await db!.execute("SELECT idUsuario FROM Usuario WHERE idSala = ?", [usuario.idSala]);
        if (Array.isArray(rowUsuario) && rowUsuario.length < 2) {
            socket.emit("noHayJugadores", "No hay suficientes jugadores");
            return;
        }

        if (!Array.isArray(rowUsuario)) return;

        const numAzar = Math.floor(Math.random() * 2);
        const comienzoRmd = Math.floor(Math.random() * 2);
        const player1 = rowUsuario[0] as Usuario;
        const player2 = rowUsuario[1] as Usuario;
        await db!.execute("UPDATE Usuario SET juegaCon = ?, turno = ? WHERE idUsuario = ?", [Boolean(numAzar), Boolean(comienzoRmd), player1.idUsuario]);
        await db!.execute("UPDATE Usuario SET juegaCon = ?, turno = ? WHERE idUsuario = ?", [!Boolean(numAzar), !Boolean(comienzoRmd), player2.idUsuario]);
        await db!.execute("UPDATE Sala SET enJuego = TRUE WHERE idSala = ?", [usuario.idSala]);
        io.to(nombreSala).emit("juegaCon");
    });
    
    socket.on("conteoJugada", () => {
        const existeEventoPendiente = eventosPendientes.has(usuario.idUsuario);
        if (existeEventoPendiente == false) {
            eventosPendientes.set(usuario.idUsuario, ["jugada", Date.now()]);
        }

        if (temporizadores.has(usuario.idUsuario)) {
            clearTimeout(temporizadores.get(usuario.idUsuario)!);
            temporizadores.delete(usuario.idUsuario);
        }

        const eventoPendiente = eventosPendientes.get(usuario.idUsuario);
        const temporizador = setTimeout(async () => {
            const [rowUsuarioOpenente, _fieldsU] = await db!.execute("SELECT idUsuario, puntos FROM Usuario WHERE idUsuario != ? AND idSala = ?", [usuario.idUsuario, usuario.idSala]);
            if (!Array.isArray(rowUsuarioOpenente)) return;

            const usuarioOponente = rowUsuarioOpenente[0] as Usuario;

            if (usuarioOponente == undefined) {
                await borrarJugadas(usuario.idSala);
                await reestablecerUsuario(usuario.idSala);
                await db!.execute("UPDATE Sala SET enJuego = FALSE WHERE idSala = ?", [usuario.idSala]);
                await db!.execute("UPDATE Usuario SET puntos = 0 WHERE idUsuario = ?", [usuario.idUsuario]);
                return;
            }

            const estado = socketsDesconectados.get(usuario.idUsuario);
            const tiempoRestante = 10 - Math.floor((Date.now() - eventoPendiente[1]) / 1000);

            if (estado == undefined) {
                return;
            }

            if (estado.desconectado && tiempoRestante > 0) {
                socketsDesconectados.set(usuario.idUsuario, { desconectado: false });
                clearTimeout(temporizador);
                return;
            }

            await sumarPuntos(usuarioOponente.idUsuario, usuarioOponente.puntos + 1);
            await borrarJugadas(usuario.idSala);
            await reestablecerUsuario(usuario.idSala);
            await db!.execute("UPDATE Sala SET enJuego = FALSE WHERE idSala = ?", [usuario.idSala]);

            eventosPendientes.delete(usuario.idUsuario);
            socketsDesconectados.set(usuario.idUsuario, { desconectado: false });

            io.to(nombreSala).emit("termino", usuario.idUsuario);
        }, existeEventoPendiente && eventosPendientes.get(usuario.idUsuario)[2] != undefined ? eventosPendientes.get(usuario.idUsuario)[2] * 1000 : 10000);
        
        temporizadores.set(usuario.idUsuario, temporizador);
        socket.removeAllListeners("jugada");

        socket.on("jugada", async (posicion) => {
            if (temporizadores.has(usuario.idUsuario)) {
                clearTimeout(temporizadores.get(usuario.idUsuario)!);
                temporizadores.delete(usuario.idUsuario);
            }
            const [rowUsuario, _fieldsU] = await db!.execute("SELECT * FROM Usuario WHERE idUsuario = ?", [usuario.idUsuario]);
            if (!Array.isArray(rowUsuario)) return;
            const usuarioSocket = rowUsuario[0] as Usuario;
            
            if (Boolean(usuarioSocket.turno)) {
                await db!.execute("CALL alta_jugada(?,?,?)", [usuario.idUsuario, usuario.idSala, posicion]);
                await db!.execute("UPDATE Usuario SET turno = FALSE WHERE idUsuario = ?", [usuario.idUsuario]);

                const [rowJugadas, _fieldsJ] = await db!.execute("SELECT posicion FROM Jugada WHERE idUsuario = ?", [usuario.idUsuario]);

                if (!Array.isArray(rowJugadas)) return;
                const jugadas = rowJugadas as Jugada[];
                const gano = esGanador(jugadas.map(x => x.posicion));

                if (gano) {
                    const [rowJugada, _fieldsJ] = await db!.execute("SELECT posicion, u.juegaCon FROM Jugada j JOIN Usuario u ON j.idUsuario = u.idUsuario WHERE j.idSala = ? ORDER BY idJugada DESC LIMIT 1", [usuario.idSala]);
                    await sumarPuntos(usuario.idUsuario, usuario.puntos + 1);
                    await borrarJugadas(usuario.idSala);
                    await reestablecerUsuario(usuario.idSala);
                    const [rowUsuarios, _fieldsU] = await db!.execute("SELECT puntos, idUsuario FROM Usuario WHERE idSala = ?", [usuario.idSala]);
                    await db!.execute("UPDATE Sala SET enJuego = FALSE WHERE idSala = ?", [usuario.idSala]);
                    eventosPendientes.delete(usuario.idUsuario);
                    io.to(nombreSala).emit("ganador", `${usuarioSocket.nombre} gano!!!`, rowJugada, rowUsuarios);
                    return;
                }

                const [rowUsuarioOpenente, _fieldsU] = await db!.execute("SELECT idUsuario FROM Usuario WHERE idUsuario != ? AND idSala = ?", [usuario.idUsuario, usuario.idSala]);
                if (!Array.isArray(rowUsuarioOpenente)) return;
                const usuarioOponente = rowUsuarioOpenente[0] as Usuario;

                await db!.execute("UPDATE Usuario SET turno = TRUE WHERE idUsuario = ?", [usuarioOponente.idUsuario]);
                eventosPendientes.delete(usuario.idUsuario);
                io.to(nombreSala).emit("siguienteJugada");
            }
        });
    });


    socket.on("asigmeMiTurno", async () => {
        const [rowUsuario, _fieldsU] = await db!.execute("SELECT turno FROM Usuario WHERE idUsuario = ?", [usuario.idUsuario]);
        const [rowJugadas, _fieldsJs] = await db!.execute("SELECT posicion FROM Jugada WHERE idSala = ?", [usuario.idSala]);
        const [rowJugada, _fieldsJ] = await db!.execute("SELECT posicion, u.juegaCon FROM Jugada j JOIN Usuario u ON j.idUsuario = u.idUsuario WHERE j.idSala = ? ORDER BY idJugada DESC LIMIT 1", [usuario.idSala]);
        if (!Array.isArray(rowUsuario)) return;
        const usuarioSocket = rowUsuario[0] as Usuario;
        socket.emit("tuTurno", usuarioSocket.turno, rowJugadas, rowJugada);
    });

    socket.on("asignarJuegaCon", async () => {
        const [rowUsuario, _fieldsU] = await db!.execute("SELECT turno FROM Usuario WHERE idUsuario = ?", [usuario.idUsuario]);
        if (!Array.isArray(rowUsuario)) return;
        const usuarioSocket = rowUsuario[0] as Usuario
        socket.emit("juegasCon", usuarioSocket.juegaCon, usuarioSocket.turno);
    });

    if (!socket.recovered) {
        const sql = "SELECT idMensaje, contenido, m.idUsuario, u.nombre FROM Mensaje m JOIN Usuario u ON m.idUsuario = u.idUsuario WHERE idMensaje > ? AND m.idSala = ? ORDER BY idMensaje";
        const [rowMensaje, _fieldsM] = await db!.execute(sql, [socket.handshake.auth.idMensaje, usuario.idSala]);
        const [rowUsuario, _fieldsUs] = await db!.execute("SELECT juegaCon, turno, nombre FROM Usuario WHERE idUsuario =  ?", [usuario.idUsuario]);
        const [rowUsuarios, _fieldsU] = await db!.execute("SELECT puntos, idUsuario FROM Usuario WHERE idSala = ?", [usuario.idSala]);
        socket.emit("mensajesNoVistos", rowMensaje, rowUsuarios, rowUsuario);

        const [rowSala, _fieldsS] = await db!.execute("SELECT enJuego FROM Sala WHERE idSala = ?", [usuario.idSala]);
        if (!Array.isArray(rowSala) || !Array.isArray(rowUsuario)) return;

        const sala = rowSala[0] as Sala;
        const user = rowUsuario[0] as Usuario

        if (sala.enJuego && !Boolean(user.turno)) {
            const [rowPosicion, _fieldsP] = await db!.execute("SELECT posicion, u.juegaCon FROM Jugada j JOIN Usuario u ON j.idUsuario = u.idUsuario WHERE j.idSala = ?", [usuario.idSala]);
            socket.emit("sigueEnJuego", rowPosicion);
        }
    }

    socket.on("disconnect", async () => {
        const [rowSala, _fieldsS] = await db!.execute("SELECT enJuego FROM Sala WHERE idSala = ?", [usuario.idSala]);

        if (!Array.isArray(rowSala)) return;
        const sala = rowSala[0] as Sala;
        if (sala.enJuego) {
            socketsDesconectados.set(usuario.idUsuario, { desconectado: true });
        }

        io.to(nombreSala).emit("socketDesconetado", usuario.idUsuario, usuario.nombre);
    });
});

io.of("/inicio").on("connection", async (socket) => {
    const token = socket.handshake.headers.cookie?.split("=")[1];

    if (!token) {
        console.log("Problemas con el token");
        socket.disconnect();
        return;
    }

    const usuarioJWT = jwt.decode(token, { json: true });
    const [rowUsuario, _fieldsU] = await db!.execute("SELECT * FROM Usuario WHERE nombre = ?", [usuarioJWT!.nombre]);

    if (Array.isArray(rowUsuario) && rowUsuario.length == 0) {
        socket.disconnect();
        return;
    }

    const transformRow = Array.isArray(rowUsuario) && rowUsuario[0];
    const usuario = transformRow as Usuario;

    if (usuario.idSala) {
        eventosPendientes.delete(usuario.idUsuario);
        socketsDesconectados.delete(usuario.idUsuario);
        temporizadores.delete(usuario.idUsuario);
        await db!.execute("DELETE FROM Jugada WHERE idSala = ?", [usuario.idSala]);
        await db!.execute("UPDATE Sala SET enJuego = FALSE WHERE idSala = ?", [usuario.idSala]);
        await cambiarSala(null, usuario.idUsuario);
        io.to(String(usuario.idSala)).emit("borrarJugador");
        io.to(String(usuario.idSala)).emit("termino", 0);
    }

    const [rowSala, _fieldsS] = await salaTieneUsuario(usuario.idSala)

    if (Array.isArray(rowSala) && rowSala.length == 0 && usuario.idSala != null) {
        io.of("/inicio").emit("eliminarSala");
        await db!.execute("DELETE FROM Mensaje WHERE idSala = ?", [usuario.idSala]);
        await db!.execute("DELETE FROM Jugada WHERE idSala = ?", [usuario.idSala]);
        await eliminaSala(usuario.idSala);
    }

    socket.on("teniaEstasSalas", async () => {
        const [rowSala, _fieldsS] = await db!.execute("SELECT idSala, publico FROM Sala WHERE idSala <= ?", [socket.handshake.auth.idSala]);
        socket.emit("tusSalas", rowSala);
    });

    socket.on("masSalas", async () => {
        const [rowSala, _fieldsS] = await db!.execute("SELECT idSala, publico FROM Sala WHERE idSala > ? LIMIT 5", [socket.handshake.auth.idSala]);
        socket.emit("mostrarSalas", rowSala);
    });

    socket.on("salaNueva", () => {
        io.of("/inicio").emit("salaCreada");
    });

    if (socket.handshake.auth.idSala != null && socket.handshake.auth.reconexion == false) {
        const [row, _fields] = await db!.execute("SELECT idSala, publico FROM Sala LIMIT 5", [socket.handshake.auth.idSala]);
        socket.emit("salas", row);
    }
});

httpServer.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
