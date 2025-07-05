const nombre = document.querySelector("#nombre");
const btn = document.querySelector(".btn");
const error = document.querySelector(".error");
const isIp = false
const domain = isIp ? "192.168.0.10" : "http://localhost"
const urlApi = `${domain}:4005`

btn.addEventListener('click', (e) => {
    e.preventDefault()

    fetch(`${urlApi}/api/usuario/crear-usuario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"  
        },
        body: JSON.stringify({ nombre: nombre.value })
    })
    .then(res => {
        if (res.status == 204) {
            return null
        } else {
            return res.json()
        }
    })
    .then(data => {
        console.log(data);
        if (data == null) {
            error.textContent = "";
            window.location.replace(`${urlApi}/inicio`);
        } else if (data.message) {
            error.textContent = data.message;
        }
    })
    .catch(err => console.log(err))
});