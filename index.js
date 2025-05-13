const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// ROUTES

// 1. Add a new employee
app.post('/employees', async (req, res) => {
  const { name, role } = req.body;
  const employee = await prisma.employee.create({
    data: { name, role }
  });
  res.json(employee);
});

// 2. Get all employees
app.get('/employees', async (req, res) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
});

// 3. Add a shift
app.post('/shifts', async (req, res) => {
  const { startTime, endTime, employeeId } = req.body;
  const shift = await prisma.shift.create({
    data: {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      employeeId: Number(employeeId),
    }
  });
  res.json(shift);
});

// 4. Get all shifts (with employee info)
app.get('/shifts', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    include: { employee: true }
  });
  res.json(shifts);
});

// 5. Summary: total hours and shift type
app.get('/summary', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    include: {
      employee: true,
    },
  });

  const DAY_START = 8;    // 08:00
  const DAY_END = 16;     // 16:00
  const NIGHT_START = 16; // 16:00
  const NIGHT_END = 21;   // 21:00

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const summary = {};
  weekdays.forEach(day => {
    summary[day] = {
      dayShift: new Set(),
      nightShift: new Set(),
    };
  });

  shifts.forEach(shift => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const weekdayName = weekdays[start.getDay()];

    const shiftStartHour = start.getHours() + start.getMinutes() / 60;
    const shiftEndHour = end.getHours() + end.getMinutes() / 60;

    const employeeName = shift.employee.name;

    // Check overlap with day shift
    if (shiftEndHour > DAY_START && shiftStartHour < DAY_END) {
      summary[weekdayName].dayShift.add(employeeName);
    }

    // Check overlap with night shift
    if (shiftEndHour > NIGHT_START && shiftStartHour < NIGHT_END) {
      summary[weekdayName].nightShift.add(employeeName);
    }
  });

  // Convert Sets to arrays
  for (const day in summary) {
    summary[day].dayShift = Array.from(summary[day].dayShift);
    summary[day].nightShift = Array.from(summary[day].nightShift);
  }

  res.json(summary);
});

//6. Update Employee
app.put('/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role } = req.body;
  const updated = await prisma.employee.update({
    where: { id: Number(id) },
    data: { name, role }
  });
  res.json(updated);
});

//7. delete employee
app.delete('/employees/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await prisma.employee.delete({
    where: { id: Number(id) }
  });
  res.json(deleted);
});

//8.Update Shift
app.put('/shifts/:id', async (req, res) => {
  const { id } = req.params;
  const { startTime, endTime, employeeId } = req.body;
  const updated = await prisma.shift.update({
    where: { id: Number(id) },
    data: { startTime: new Date(startTime), endTime: new Date(endTime), employeeId }
  });
  res.json(updated);
});

//9.Delete Shift
app.delete('/shifts/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await prisma.shift.delete({
    where: { id: Number(id) }
  });
  res.json(deleted);
});

//10. export
app.get('/shifts/export', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    include: {
      employee: true,
    },
  });

  const data = shifts.map(shift => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    return {
      name: shift.employee.name,
      startTime: start.toLocaleString(),
      endTime: end.toLocaleString(),
      dayOfWeek: start.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  });

  res.json(data);
});

//11. weekly schedule
app.get('/shifts/by-employee-weekly', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    include: { employee: true },
  });

  const schedule = {};

  shifts.forEach(shift => {
    const name = shift.employee.name;
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const day = start.toLocaleDateString('en-US', { weekday: 'long' });

    const timeRange = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (!schedule[name]) {
      schedule[name] = {
        Monday: '',
        Tuesday: '',
        Wednesday: '',
        Thursday: '',
        Friday: '',
        Saturday: '',
        Sunday: '',
      };
    }

    schedule[name][day] = timeRange;
  });

  res.json(schedule);
});

//12. weekly schedule export
app.get('/shifts/export-weekly', async (req, res) => {
  const shifts = await prisma.shift.findMany({
    include: { employee: true },
  });

  const schedule = {};

  shifts.forEach(shift => {
    const name = shift.employee.name;
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const day = start.toLocaleDateString('en-US', { weekday: 'long' });

    const timeRange = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (!schedule[name]) {
      schedule[name] = {
        Employee: name,
        Monday: '',
        Tuesday: '',
        Wednesday: '',
        Thursday: '',
        Friday: '',
        Saturday: '',
        Sunday: '',
      };
    }

    schedule[name][day] = timeRange;
  });

  const data = Object.values(schedule);

  res.json(data); // Let frontend download this as CSV
});



// Start the server
app.listen(3001, () => {
  console.log('🚀 Server running at http://localhost:3001');
});
