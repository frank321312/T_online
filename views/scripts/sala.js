const inputMensaje = document.querySelector(".mensaje");
const btnEnviar = document.querySelector(".btn-enviar");
const mensajes = document.querySelector(".mensajes");
const contenedorTabla = document.querySelector(".contenedor-tabla");
const comenzar = document.querySelector(".comenzar");
const name1 = document.querySelector(".name-1");
const name2 = document.querySelector(".name-2");
const points = document.querySelectorAll(".points");
const contenedorComenzar = document.querySelector(".contenedor-comenzar");
const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: {
        idMensaje: 0,
        juegaCon: null
    }
});

socket.on("borrarJugador", () => {
    name2.textContent = "";
    points[1].textContent = 0;
});

async function usuarioToken() {
    const token = document.cookie.split("=")[1];
    const res = await fetch("http://localhost:4005/decode-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    });
    return await res.json();
}

function insertarJugada(ultimaJugada) {
    const cuadros = document.querySelectorAll(".item");
    for (let i = 0; i < cuadros.length; i++) {
        if (ultimaJugada[0].posicion - 1 == i) {
            const span = document.createElement("span");
            span.classList.add(ultimaJugada[0].juegaCon == 1 ? "formaX" : "formaO");
            cuadros[i].appendChild(span);
        }
    }
}

function actualizarPuntos(puntos, usuario) {
    for (const element of puntos) {
        if (element.idUsuario != usuario.idUsuario) {
            points[1].textContent = element.puntos || 0;
        } else {
            points[0].textContent = element.puntos || 0;
        }
    }
}

socket.on("oponente", async (usuarios) => {
    const usuario = await usuarioToken();

    for (let i = 0; i < usuarios.length; i++) {
        const element = usuarios[i];
        if (element.idUsuario != usuario.idUsuario) {
            name2.textContent = element.nombre;
            return;
        }
    }
});

btnEnviar.addEventListener("click", (e) => {
    e.preventDefault();

    socket.emit("mensaje", inputMensaje.value);

    inputMensaje.value = "";
});

socket.on("mensajeSala", async (data, user) => {
    const usuario = await usuarioToken();
    const p = document.createElement("p");
    p.innerHTML = `<b>${user.nombre}:</b> ${data[0].contenido}`;
    p.style.backgroundColor = data[0].idUsuario == usuario.idUsuario ? "#fff" : "rgb(184, 178, 178)";
    p.style.padding = "5px";

    // socket.disconnect();
    socket.auth.idMensaje = data[0].idMensaje;
    // socket.connect();

    mensajes.appendChild(p);
    mensajes.scrollTop = mensajes.scrollHeight;
});

// socket.emit("recargarMensajes");

socket.on("mensajesNoVistos", async (msgs, puntos, juegaCon) => {
    name1.textContent = juegaCon[0].nombre;
    
    if (!msgs || msgs.length == 0) {
        return;
    }

    const usuario = await usuarioToken();
    actualizarPuntos(puntos, usuario);

    // socket.disconnect();
    socket.auth.idMensaje = msgs[msgs.length - 1].idMensaje;
    socket.auth.juegaCon = juegaCon[0].juegaCon;
    // socket.connect();

    for (let i = 0; i < msgs.length; i++) {
        const data = msgs[i];
        const p = document.createElement("p");
        p.innerHTML = `<b>${data.nombre}:</b> ${data.contenido}`;
        p.style.backgroundColor = data.idUsuario == usuario.idUsuario ? "#fff" : "rgb(184, 178, 178)";
        p.style.padding = "5px";
        mensajes.appendChild(p);
    }

    mensajes.scrollTop = mensajes.scrollHeight;
});

function notificacion(msg) {
    const desDiv = document.createElement("div");
    desDiv.classList.add("desconectado");
    desDiv.textContent = msg;
    return desDiv
}

function notificacionEstilo(mensaje) {
    mensaje.style.backgroundColor = "#fff";
    mensaje.style.color = "#000";
    mensaje.style.boxShadow = "0 0 5px #000";
    return mensaje
}

socket.io.on("reconnect", () => {
    const desconexion = document.querySelector(".desconectado");
    if (desconexion) {
        desconexion.style.backgroundColor = "rgb(26, 190, 26)";
        desconexion.textContent = "Te has reconectado";
        setTimeout(() => {
            document.body.removeChild(desconexion);
        }, 2000);
        btnEnviar.removeAttribute("disabled");
    }
});

socket.on("connect_error", () => {
    const desconexion = document.querySelector(".desconectado");
    if (document.body.contains(desconexion) == false) {
        document.body.appendChild(notificacion("Te has desconectado"));
    }

    btnEnviar.setAttribute("disabled", "");
});

function comenzarPartida() {
    const desconexion = document.querySelector(".desconectado");
    if (document.body.contains(desconexion) == false) {
        socket.emit("comenzar");
    }
}

comenzar.addEventListener("click", comenzarPartida);

socket.on("juegaCon", () => {
    socket.emit("asignarJuegaCon");
});

function cronometro() {
    const divTiempo = document.createElement("div");
    divTiempo.textContent = 0;
    divTiempo.classList.add("tiempo");
    return divTiempo;
}

function btnComenzar() {
    const cuadros = document.querySelectorAll(".item");
    for (const element of cuadros) {
        element.innerHTML = "";
    }
    const btn = document.createElement("button");
    btn.classList.add("comenzar");
    btn.textContent = "Comenzar";
    return btn;
}

socket.on("juegasCon", (juegaCon, turno) => {
    const mensaje = notificacionEstilo(notificacion(""));

    if (Boolean(juegaCon)) {
        mensaje.textContent = "Juegas con X";
    } else {
        mensaje.textContent = "Juegas con O";
    }

    contenedorComenzar.removeChild(document.querySelector(".comenzar"));
    contenedorComenzar.appendChild(cronometro());
    if (Boolean(turno)) {
        agregarEventoPosicion();
        mensaje.textContent = "Comenzas primero";
        document.body.appendChild(mensaje);
        setTimeout(() => {
            document.body.removeChild(document.querySelector(".desconectado"));
        }, 1000);

        const tiempo = document.querySelector(".tiempo");
        let segundo = 10;

        const temporizador = setInterval(() => {
            segundo--;
            tiempo.textContent = segundo;
            if (segundo == 0) {
                clearInterval(temporizador);
            }
        }, 1000);
        
        socket.emit("conteoJugada");

        socket.on("siguienteJugada", () => {
            tiempo.textContent = "0";
            clearInterval(temporizador);
        });
    } else {
        document.body.appendChild(mensaje);
        setTimeout(() => {
            document.body.removeChild(document.querySelector(".desconectado"));
        }, 1000);
    }
});

socket.on("noHayJugadores", (msg) => {
    document.body.appendChild(notificacion(msg));
    const desconexion = document.querySelector(".desconectado");
    setTimeout(() => {
        document.body.removeChild(desconexion);
    }, 2000);
});

for (let i = 0; i < 9; i++) {
    const cuadro = document.createElement("div");
    cuadro.classList.add("item");
    contenedorTabla.appendChild(cuadro);
}

const posiciones = document.querySelectorAll(".item");
const manejadores = [];
let callback = null;

// almacena todos las posiciones que ya han sido jugadas despues de cada jugada,
// para que no se pueda volver a jugar en la misma posicion 
let listJugadas = [];

function emitirEvento(i) {
    return function () {
        socket.emit("jugada", i + 1);
    }
}

function agregarEventoPosicion() {
    for (let i = 0; i < posiciones.length; i++) {
        if (listJugadas.includes(i + 1) == false) {
            const manejador = emitirEvento(i);
            posiciones[i].addEventListener("click", manejador);
            manejadores[i] = manejador;
        }
    }
}

function removerEventoPosicion() {
    for (let i = 0; i < posiciones.length; i++) {
        posiciones[i].removeEventListener("click", manejadores[i]);
    }
}

removerEventoPosicion();

socket.on("siguienteJugada", () => {
    socket.emit("asigmeMiTurno");
});

socket.on("tuTurno", (turno, jugadas, ultimaJugada) => {
    listJugadas = jugadas.map(x => x.posicion);
    insertarJugada(ultimaJugada);
    if (Boolean(turno)) {
        agregarEventoPosicion()
        const tiempo = document.querySelector(".tiempo");
        let segundo = 10;

        const temporizador = setInterval(() => {
            segundo--;
            tiempo.textContent = segundo;
            if (segundo == 0) {
                clearInterval(temporizador);
            }
        }, 1000);

        socket.emit("conteoJugada");

        socket.on("siguienteJugada", () => {
            tiempo.textContent = "0";
            clearInterval(temporizador);
        });
        socket.on("ganador", () => {
            tiempo.textContent = "0";
            clearInterval(temporizador);
        });
    } else {
        removerEventoPosicion();
    }
});

socket.on("termino", async (idUsuario) => {
    console.log("Por alguna razon me ejecute");
    const usuario = await usuarioToken();
    const mensaje = notificacionEstilo(notificacion(""));

    if (usuario.idUsuario == idUsuario) {
        mensaje.textContent = "Has periddo";
        removerEventoPosicion();
    } else if (idUsuario == 0) {
        mensaje.textContent = "Tu oponente se ha desconectado";
        removerEventoPosicion();
    } else {
        mensaje.textContent = "Has ganado";
        removerEventoPosicion();
    }

    document.body.appendChild(mensaje);
    setTimeout(() => {
        document.body.removeChild(document.querySelector(".desconectado"));
        contenedorComenzar.removeChild(document.querySelector(".tiempo"));
        const btn = btnComenzar()
        btn.addEventListener("click", comenzarPartida)
        contenedorComenzar.appendChild(btn);
    }, 2000);

    listJugadas = [];
});

socket.on("ganador", async (msg, ultimaJugada, puntos) => {
    insertarJugada(ultimaJugada);
    const mensaje = notificacionEstilo(notificacion(msg));
    document.body.appendChild(mensaje);
    removerEventoPosicion();
    setTimeout(() => {
        document.body.removeChild(mensaje);
        contenedorComenzar.removeChild(document.querySelector(".tiempo"));
        const btn = btnComenzar();
        btn.addEventListener("click", () => {
            socket.emit("comenzar");
        });
        contenedorComenzar.appendChild(btn);
    }, 2000);

    listJugadas = [];
    const usuario = await usuarioToken();

    actualizarPuntos(puntos, usuario);
});

socket.on("eventoPendiente", (jugadas, turno, segundos) => {
    listJugadas = jugadas.map(x => x.posicion);
    contenedorComenzar.innerHTML = "";
    contenedorComenzar.appendChild(cronometro());
    const cuadros = document.querySelectorAll(".item");

    for (let i = 0; i < jugadas.length; i++) {
        const span = document.createElement("span");
        span.classList.add(jugadas[i].juegaCon == 1 ? "formaX" : "formaO");
        cuadros[jugadas[i].posicion - 1].appendChild(span);
    }

    if (Boolean(turno)) {
        agregarEventoPosicion();
        
        const tiempo = document.querySelector(".tiempo");
        let segundo = segundos;
        
        const temporizador = setInterval(() => {
            segundo--;
            tiempo.textContent = segundo;
            if (segundo == 0) {
                clearInterval(temporizador);
            }
        }, 1000);

        socket.emit("conteoJugada");


        socket.on("siguienteJugada", () => {
            tiempo.textContent = "0";
            clearInterval(temporizador);
        });

        socket.on("ganador", () => {
            tiempo.textContent = "0";
            clearInterval(temporizador);
        });
    }
});

socket.on("socketDesconetado", async (id, nombre) => {
    const usuario = await usuarioToken();

    if (usuario.idUsuario != id) {
        const mensaje = notificacion(`${nombre} se ha desconectado`);
        document.body.appendChild(mensaje);
        setTimeout(() => {
            document.body.removeChild(document.querySelector(".desconectado"));
        }, 2000);
    }
});

socket.on("sigueEnJuego", (jugadas) => {
    listJugadas = jugadas.map(x => x.posicion);
    contenedorComenzar.innerHTML = "";
    contenedorComenzar.appendChild(cronometro());
    const cuadros = document.querySelectorAll(".item");
    console.log("Yo me")
    for (let i = 0; i < jugadas.length; i++) {
        const span = document.createElement("span");
        span.classList.add(jugadas[i].juegaCon == 1 ? "formaX" : "formaO");
        cuadros[jugadas[i].posicion - 1].appendChild(span);
    }
})

socket.on("disconnect", () => {
    socket.emit("desconectado");
});