import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController.js";
import { verificarToken } from "../utils/sharedFunc.js";

const router = Router();
const usuarioController = new UsuarioController();

router.post('/crear-usuario', usuarioController.crearUsuario);
router.post("/unirse-sala", verificarToken, usuarioController.unirseSala);

export default router;