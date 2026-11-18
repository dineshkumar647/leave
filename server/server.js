import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import LeaveRequest from "./src/models/LeaveRequest.js";

dotenv.config();

const app = express();

// CORS FIX
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ],
  credentials: true
}));

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "LeaveEase API" });
});

// GET leaves
app.get("/api/leaves", async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load leave requests." });
  }
});

// POST leave
app.post("/api/leaves", async (req, res) => {
  try {
    const { leaveType, days, reason, employeeName } = req.body;

    if (
      !["Casual Leave", "Medical Leave"].includes(leaveType) ||
      !Number.isInteger(Number(days)) ||
      Number(days) < 1 ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        message: "Enter a valid leave type, number of days and reason."
      });
    }

    const leave = await LeaveRequest.create({
      leaveType,
      days: Number(days),
      reason: reason.trim(),
      employeeName: employeeName?.trim() || "Employee",
      status: "Pending Approval"
    });

    res.status(201).json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not submit leave request." });
  }
});

// PATCH status
app.patch("/api/leaves/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected", "Pending Approval"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found." });
    }

    res.json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update request." });
  }
});

// DELETE leave
app.delete("/api/leaves/:id", async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndDelete(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found." });
    }

    res.json({ message: "Request deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete request." });
  }
});

const PORT = process.env.PORT || 5000;

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`LeaveEase API running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });