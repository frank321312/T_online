// const contenedorSala = document.querySelector("contenedor-sala");
let inputBuscar;
let formulario;
const contenedorSearch = document.querySelector(".contenedor-search");
const isIp = false
const domain = isIp ? "192.168.0.10" : "http://localhost"
const urlApi = `${domain}:4005`

async function buscarSala(inputBuscar) {
    const res = await fetch(`${urlApi}/api/sala/buscar-sala?sala=${inputBuscar.value}`);
    const data = await res.json();
    console.log(data)
    return data
}

document.querySelectorAll(".item")[2].addEventListener("click", () => {
    contenedorSearch.style.display = "block";
    inputBuscar = document.querySelector("#inputBuscar");
    formulario = document.querySelector(".form");
    const errorMessage = document.querySelector(".error-message");
    const mostrarSala = document.querySelector(".mostrarSalas");
    const message = document.createElement("h1");
    message.classList.add(".message");
    mostrarSala.style.display = "none";
    
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();
        const sala = await buscarSala(inputBuscar);
        contenedorSala.innerHTML = "";
        errorMessage.textContent = "";

        if (Array.isArray(sala)) {
            insertarSalas(sala);
            return
        }

        if (sala.codigo == 1) {
            errorMessage.textContent = sala.message;
            return;
        }

        message.textContent = sala.message;
        contenedorSala.appendChild(message);
        document.querySelector(".contenedor-sala").style.justifyContent = "center";
    });
});