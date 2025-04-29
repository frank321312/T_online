# tateti_online

T_online es un programa que permite jugar al clasico tateti, tambien pudiendo enviar mensajes durante la partida. El proyecto cuenta como un practica de la bilbioteca Socket.io que permite la comunicación en tiempo real mediante eventos.

## ¿Tiene vulnerabilidades?
Si, como todo programa, si entiendes el codigo te daras cuenta de ciertas vulnerabilidades, por ejemplo en sala.js se delega que el temporizador lo emita el socket, lo cual es una mala practica delegarle tal tarea al cliente ya que si se borra esa linea de codigo la partida nunca avanzara y se quedara asi indefinidamente, obviamente se pudo delegar al servidor emitiendo un evento interno que solo lo escuchara el pero durante el desarrollo no le di mucha imporancia.

## Ejecución
El programa puede ser ejecutado tanto con bun como node, recomiendo usar bun, tambien puede ver los camandos con los cual ejecutar el programa en el package.json en la seccion de scripts.
Tambien debe tener en cuenta las variables de entorno para su correcto funcionamiente entre ellos:
DB_HOST
DB_PORT
DB_NAME
DB_USERNAME
DB_PASSWORD
JWT_SECRET -> La llave secreta para crear los tokens, ej: EstaEsMiPass

- Para instalar todas las dependencias, tambien se puede instalar con npm
```js
    bun install
```
- Para transpilar el codigo ts a js
```js
    npm run build
```
- Para ejecutar el programa
```js
    npm run dev
```

## ¿Es responsivo?
No, no se recomienda usarlo en un telefono ya que todos los elementos se veran horribles al tener poco espacio.
