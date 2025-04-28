import { Router } from "express";
import { SalaController } from "../controllers/SalaController.js";

const router = Router();
const salaController = new SalaController();

router.get("/obtener-salas", salaController.obtenerSalas);
router.get("/buscar-sala", salaController.buscarSala);

router.post("/crear-sala", salaController.crearSala);

export default router;