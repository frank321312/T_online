-- SQLBook: Code
SOURCE DDL.sql
SOURCE SP.sql

UPDATE Usuario
SET `idSala` = NULL
WHERE `idUsuario` = 2

UPDATE Sala 
SET `enJuego` = 0
WHERE `idSala` = 11