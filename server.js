const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

function readDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({ tasks: [], team: [] }));
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Database read error:", err);
        return { tasks: [], team: [] };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error("Database write error:", err);
        return false;
    }
}

// Seed Initial Data
const db = readDatabase();
if (!db.tasks || db.tasks.length === 0 || !db.team || db.team.length === 0) {
    const seedTeam = [
        { id: "member-1", name: "Marcus Vance", accessLevel: "Administrator", role: "Chief Inspector" },
        { id: "member-2", name: "Elena Rostova", accessLevel: "Supporting Member", role: "HVAC Specialist" }
    ];
    const seedTasks = [
        { id: "task-1", title: "Emergency System Test", description: "Test emergency cut-offs on Assembly Line A.", status: "Pending", assignedTo: "member-1", createdAt: new Date().toISOString() },
        { id: "task-2", title: "HVAC Filter Replacement", description: "Replace standard filters on secondary intake unit.", status: "Ongoing", assignedTo: "member-2", createdAt: new Date().toISOString() },
        { id: "task-3", title: "Pressure Valve Calibration", description: "Recalibrate boiler valve intake flow.", status: "Completed", assignedTo: "member-1", createdAt: new Date().toISOString() }
    ];
    writeDatabase({ tasks: seedTasks, team: seedTeam });
}

/* ================== TASKS API ================== */

app.get('/api/tasks', (req, res) => {
    const database = readDatabase();
    res.status(200).json(database.tasks || []);
});

app.post('/api/tasks', (req, res) => {
    const { title, description, assignedTo } = req.body;

    if (!title || !description || title.trim() === '' || description.trim() === '') {
        return res.status(400).json({ error: "Both title and description are required fields." });
    }

    const database = readDatabase();
    const newTask = {
        id: "task-" + Date.now(),
        title: title.trim(),
        description: description.trim(),
        status: "Pending",
        assignedTo: assignedTo || null,
        createdAt: new Date().toISOString()
    };

    database.tasks.push(newTask);
    if (writeDatabase(database)) {
        res.status(201).json(newTask);
    } else {
        res.status(500).json({ error: "Failed to save the task to the database." });
    }
});

// Update Task Status & Assignee
app.patch('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    const database = readDatabase();
    const taskIndex = database.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
        return res.status(404).json({ error: "Requested task not found." });
    }

    if (status) {
        if (status !== 'Pending' && status !== 'Ongoing' && status !== 'Completed') {
            return res.status(400).json({ error: "Invalid status value." });
        }
        database.tasks[taskIndex].status = status;
    }

    if (assignedTo !== undefined) {
        database.tasks[taskIndex].assignedTo = assignedTo;
    }

    if (writeDatabase(database)) {
        res.status(200).json(database.tasks[taskIndex]);
    } else {
        res.status(500).json({ error: "Failed to update task." });
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const database = readDatabase();
    const taskIndex = database.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
        return res.status(404).json({ error: "Task not found." });
    }

    database.tasks.splice(taskIndex, 1);

    if (writeDatabase(database)) {
        res.status(200).json({ message: "Task deleted." });
    } else {
        res.status(500).json({ error: "Failed to delete task." });
    }
});

/* ================== TEAM API ================== */

app.get('/api/team', (req, res) => {
    const database = readDatabase();
    res.status(200).json(database.team || []);
});

app.post('/api/team', (req, res) => {
    const { name, accessLevel, role } = req.body;

    if (!name || !accessLevel || !role) {
        return res.status(400).json({ error: "Name, access level, and role are required." });
    }

    const database = readDatabase();
    const newMember = {
        id: "member-" + Date.now(),
        name: name.trim(),
        accessLevel,
        role: role.trim()
    };

    database.team.push(newMember);
    if (writeDatabase(database)) {
        res.status(201).json(newMember);
    } else {
        res.status(500).json({ error: "Failed to save team member." });
    }
});

// Update Team Member Role and Access level
app.patch('/api/team/:id', (req, res) => {
    const { id } = req.params;
    const { role, accessLevel } = req.body;

    const database = readDatabase();
    const memberIndex = database.team.findIndex(m => m.id === id);

    if (memberIndex === -1) {
        return res.status(404).json({ error: "Team member not found." });
    }

    if (role !== undefined) database.team[memberIndex].role = role.trim();
    if (accessLevel !== undefined) database.team[memberIndex].accessLevel = accessLevel;

    if (writeDatabase(database)) {
        res.status(200).json(database.team[memberIndex]);
    } else {
        res.status(500).json({ error: "Failed to update team member." });
    }
});

app.delete('/api/team/:id', (req, res) => {
    const { id } = req.params;
    const database = readDatabase();
    const memberIndex = database.team.findIndex(m => m.id === id);

    if (memberIndex === -1) {
        return res.status(404).json({ error: "Team member not found." });
    }

    database.team.splice(memberIndex, 1);

    // Unassign tasks mapped to this deleted member
    database.tasks.forEach(t => {
        if (t.assignedTo === id) t.assignedTo = null;
    });

    if (writeDatabase(database)) {
        res.status(200).json({ message: "Team member removed." });
    } else {
        res.status(500).json({ error: "Failed to delete team member." });
    }
});

app.listen(PORT, () => {
    console.log(`Server launched successfully at http://localhost:${PORT}`);
});