import express, { json } from "express";

const router = express.Router();

// router.use("/admin", admin);

router.use(json());

export default router;
