DROP DATABASE IF EXISTS t_online;
CREATE DATABASE t_online;
USE t_online;

CREATE TABLE Sala (
    publico BOOLEAN NOT NULL,
    codigo VARCHAR(45),
    enJuego BOOLEAN,
    idSala INT UNSIGNED AUTO_INCREMENT,
    CONSTRAINT pk_sala PRIMARY KEY (idSala)
);

CREATE TABLE Usuario (
    nombre VARCHAR(45) NOT NULL,
    idUsuario INT UNSIGNED AUTO_INCREMENT,
    idSala INT UNSIGNED,
    puntos SMALLINT UNSIGNED,
    juegaCon BOOLEAN,
    turno BOOLEAN,
    CONSTRAINT pk_usuario PRIMARY KEY (idUsuario),
    CONSTRAINT fk_usuario_sala FOREIGN KEY (idSala)
    REFERENCES Sala (idSala)
);

CREATE TABLE Mensaje (
    contenido VARCHAR(255) NOT NULL,
    idUsuario INT UNSIGNED NOT NULL,
    idSala INT UNSIGNED NOT NULL,
    idMensaje INT AUTO_INCREMENT,
    CONSTRAINT pk_mensaje PRIMARY KEY (idMensaje),
    CONSTRAINT fk_mensaje_sala FOREIGN KEY (idSala)
    REFERENCES Sala (idSala),
    CONSTRAINT fk_mensaje_usuario FOREIGN KEY (idUsuario)
    REFERENCES Usuario (idUsuario)
);

CREATE TABLE Jugada (
    idSala INT UNSIGNED NOT NULL,
    idUsuario INT UNSIGNED NOT NULL,
    idJugada INT UNSIGNED AUTO_INCREMENT,
    posicion TINYINT UNSIGNED NOT NULL,
    CONSTRAINT pk_jugada PRIMARY KEY (idJugada),
    CONSTRAINT fk_jugada_sala FOREIGN KEY (idSala)
    REFERENCES Sala (idSala),
    CONSTRAINT fk_jugada_usuario FOREIGN KEY (idUsuario)
    REFERENCES Usuario (idUsuario)
);
