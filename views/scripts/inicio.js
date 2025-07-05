const selectType = document.querySelector("#select-type");
const codigo = document.getElementById("codigo");
const btnCrear = document.querySelector(".btn-crear");
const errCodigo = document.querySelector(".err-codigo");
const errSelect = document.querySelector(".err-select");
const crearSala = document.querySelector(".crear-sala");
const btnUnirse = document.querySelectorAll(".btn-unirse");
const mostrarSalas = document.querySelector(".mostrarSalas");
const contenedorSala = document.querySelector(".contenedor-sala");
const isIp = false
const domain = isIp ? "192.168.0.10" : "http://localhost"
const urlApi = `${domain}:4005`

const contenedorUnirse = document.querySelector(".contenedor-unirse");
const codigoSala = document.querySelector("#codigo-unirse");
const messageErrorCode = document.querySelector(".err-unirse");
const btnUniserCodigo = document.querySelector(".btn-unirse-sala");
const socket = io("/inicio", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: {
        idSala: 0,
        reconexion: false
    }
});

document.querySelectorAll(".item")[0].addEventListener("click", () => {
    contenedorSearch.style.display = "none";
});

document.querySelectorAll(".item")[1].addEventListener("click", () => {
    crearSala.style.display = "block";
});

document.querySelector(".btn-cancelar").addEventListener("click", (e) => {
    e.preventDefault();
    crearSala.style.display = "none";
});

document.querySelector(".btn-cancelar-unirse").addEventListener("click", (e) => {
    e.preventDefault();
    contenedorUnirse.style.display = "none";
});

function reiniciar() {
    errCodigo.textContent = "";
    errSelect.textContent = "";
    codigo.classList.remove("codigo-error");
    selectType.classList.remove("codigo-error");
}

selectType.addEventListener("change", (e) => {
    const value = e.target.value;
    if (value == "privado") {
        codigo.removeAttribute("disabled");
    } else {
        reiniciar();
        codigo.value = "";
        codigo.setAttribute("disabled", "");
    }
});

btnCrear.addEventListener("click", (e) => {
    e.preventDefault();
    
    fetch(`${urlapi}/api/sala/crear-sala`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ publico: selectType.value == "publico" ? true : false, codigo: codigo.value })
    })
        .then(res => {
            if (res.status == 204) {
                return null;
            }
            
            return res.json();
        })
        .then(data => {
            if (data == null) {
                reiniciar();
                crearSala.style.display = "none";
                selectType.value = "publico";
                socket.emit("salaNueva");
                window.location.assign(`${urlapi}/sala`);
            } else if (data.path == "publico") {
                errSelect.textContent = data.message;
                selectType.classList.add("codigo-error");
            } else if (data.path == "codigo") {
                errCodigo.textContent = data.message;
                codigo.classList.add("codigo-error");
            }
        })
        .catch(err => console.log(err))
});

function insertarSalas(salas) {
    for (let i = 0; i < salas.length; i++) {
        const sala = salas[i];
        const htmlSala = document.createElement("div");
        const htmlDiv = document.createElement("div");
        const htmlP1 = document.createElement("p");
        const htmlP2 = document.createElement("p");
        const htmlB1 = document.createElement("b");
        const htmlB2 = document.createElement("b");
        const htmlBtn = document.createElement("button");
        
        htmlBtn.classList.add("btn-unirse");
        htmlSala.classList.add("sala");
        htmlB1.textContent = `Id: ${sala.idSala}`;
        htmlB2.textContent = `Sala: ${sala.publico == 0 ? "privada" : "publica"}`;
        htmlP1.appendChild(htmlB1);
        htmlP2.appendChild(htmlB2);
        htmlDiv.appendChild(htmlP1);
        htmlDiv.appendChild(htmlP2);
        htmlBtn.textContent = "Unirse";

        if (sala.publico == 1) {
            htmlBtn.addEventListener("click", () => {
                fetch(`${urlapi}/api/usuario/unirse-sala`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ idSala: sala.idSala })
                })
                    .then(res => {
                        if (res.status == 204) {
                            return null;
                        }
    
                        return res.json();
                    })
                    .then(data => {
                        if (data == null) {
                            window.location.assign(`${urlapi}/sala`);
                        } else {
                            console.log(data);
                        }
                    })
                    .catch(err => console.log(err))
                });
        } else {
            htmlBtn.addEventListener("click", () => {
                contenedorUnirse.style.display = "block";
                btnUniserCodigo.addEventListener("click", async (e) => {
                    e.preventDefault();

                    try {
                        const res = await fetch(urlApi+`/api/usuario/unirse-sala`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ idSala: sala.idSala, codigo: codigoSala.value })
                        });
                        console.log(res)
                        const data = res.status == 204 ? null : await res.json();
                        console.log(data)
                        if (data == null) {
                            reiniciar();
                            window.location.assign(`http://localhost:4005/sala`);
                        } else {
                            messageErrorCode.textContent = data.message;
                        }
                    } catch (error) {
                        console.log(error)                        
                    }
                })
            });
        }

        htmlSala.appendChild(htmlDiv);
        htmlSala.appendChild(htmlBtn);
        contenedorSala.appendChild(htmlSala);
    }
}

socket.on("salas", (salas) => {
    if (!salas || salas.length == 0) {
        contenedorSala.innerHTML = `<h1 class="msg-sala" style="margin-top: 100px; width: 100%; text-align: center;">No hay salas en este momento</h1>`;
        mostrarSalas.style.display = "none"
        return;
    }

    socket.disconnect();
    socket.auth.idSala = salas[salas.length - 1].idSala;
    socket.auth.reconexion = true;
    socket.connect();

    insertarSalas(salas);
});

mostrarSalas.addEventListener("click", () => {
    socket.emit("masSalas");
});

socket.on("mostrarSalas", (salas) => {
    if (!salas || salas.length == 0) {
        return;
    }
    mostrarSalas.style.marginTop = "0";
    socket.disconnect();
    socket.auth.idSala = salas[salas.length - 1].idSala; 
    socket.auth.reconexion = true;
    socket.connect();

    insertarSalas(salas);
});

socket.on("salaCreada", () => {
    const msgSala = document.querySelector(".msg-sala");

    if (msgSala) {    
        contenedorSala.removeChild(msgSala);
    }

    mostrarSalas.style.display = "block";
    if (document.querySelectorAll(".sala").length == 0) {
        mostrarSalas.style.marginTop = "50px";
    }
});

socket.on("eliminarSala", () => {
    socket.emit("teniaEstasSalas");
});

socket.on("tusSalas", (salas) => {
    if (!salas || salas.length == 0) {
        contenedorSala.innerHTML = `<h1 class="msg-sala" style="margin-top: 100px; width: 100%; text-align: center;">No hay salas en este momento</h1>`;
        mostrarSalas.style.display = "none"
        return;
    }
    contenedorSala.innerHTML = "";
    insertarSalas(salas);
});
