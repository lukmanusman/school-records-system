import express from "express";
import prisma from "./lib/prisma.js";

// const express = require("express");
const app = express();
// const port = process.env.PORT || 3000;
const PORT = 5000;

app.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      message: "School Records System API",
      database: "Connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
