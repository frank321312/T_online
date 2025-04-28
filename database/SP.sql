DELIMITER $$
CREATE PROCEDURE alta_usuario (IN unNombre VARCHAR(45))
BEGIN
    INSERT INTO Usuario (nombre)
        VALUES  (unNombre);
END
$$

DELIMITER $$
CREATE PROCEDURE alta_sala (IN unCodigo VARCHAR(45),
                            IN unPublico BOOLEAN)
BEGIN
    INSERT INTO Sala (publico, codigo)
        VALUES  (unPublico, unCodigo);
END
$$

DELIMITER $$
CREATE PROCEDURE alta_mensaje ( IN unContenido VARCHAR(255),
                                IN unIdUsuario INT UNSIGNED,
                                IN unIdSala INT UNSIGNED)
BEGIN
    INSERT INTO Mensaje (contenido, idUsuario, idSala)
        VALUES  (unContenido, unIdUsuario, unIdSala);
END
$$

DELIMITER $$
CREATE PROCEDURE alta_jugada (  IN unidUsuario INT UNSIGNED,
                                IN unIdSala INT UNSIGNED,
                                IN unPosicion TINYINT UNSIGNED)
BEGIN
    INSERT INTO Jugada (idSala, idUsuario, posicion)
        VALUES  (unIdSala, unidUsuario, unPosicion);
END
$$