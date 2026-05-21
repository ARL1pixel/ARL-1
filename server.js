// ═══════════════════════════════════════════════════════════════
// A.R. Library — Express + MySQL Server
// ═══════════════════════════════════════════════════════════════
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const mysql   = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── MYSQL POOL ────────────────────────────────────────────────
const pool = mysql.createPool({
  host              : process.env.MYSQLHOST     || process.env.DB_HOST     || 'mysql.railway.internal',
  port              : Number(process.env.MYSQLPORT     || process.env.DB_PORT)     || 3306,
  user              : process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password          : process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'BDexyOTeerEPeLELdeklKQNeqEzPmCdm',
  database          : process.env.MYSQLDATABASE || process.env.DB_NAME     || 'railway',
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0,
  charset           : 'utf8mb4'
});

const ok  = (res, data) => res.json({ ok: true, data });
const err = (res, e)    => { console.error(e.message); res.status(500).json({ ok: false, error: e.message }); };

// ── AUTO INIT TABLES ──────────────────────────────────────────
async function initDB() {
  const conn = await pool.getConnection();
  try {
    console.log('🔧 Initializing tables...');

    await conn.query(`CREATE TABLE IF NOT EXISTS members (
      id        VARCHAR(20)  PRIMARY KEY,
      name      VARCHAR(100) NOT NULL,
      phone     VARCHAR(20)  DEFAULT '',
      cls       VARCHAR(100) DEFAULT '',
      shift     VARCHAR(80)  DEFAULT '',
      plan      VARCHAR(100) DEFAULT '',
      category  VARCHAR(20)  DEFAULT '',
      \`from\`  DATE,
      \`to\`    DATE,
      dob       DATE,
      feeStatus VARCHAR(20)  DEFAULT 'Due',
      dueAmount DECIMAL(10,2) DEFAULT 0,
      seat      VARCHAR(10),
      color     VARCHAR(20)  DEFAULT '#3b82f6',
      addr      TEXT,
      guardian  VARCHAR(100) DEFAULT '',
      gphone    VARCHAR(20)  DEFAULT '',
      aadhar    VARCHAR(20)  DEFAULT '',
      aadharImg LONGTEXT,
      photo     LONGTEXT,
      createdAt DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Agar purani table hai toh dob column add karo (ALTER ignore karo agar already hai)
    try { await conn.query(`ALTER TABLE members ADD COLUMN dob DATE`); } catch(_) {}
    try { await conn.query(`ALTER TABLE members ADD COLUMN dueAmount DECIMAL(10,2) DEFAULT 0`); } catch(_) {}
    // Lockers table
    await conn.query(`CREATE TABLE IF NOT EXISTS lockers (
      no         INT          PRIMARY KEY,
      memberId   VARCHAR(20)  DEFAULT '',
      memberName VARCHAR(100) DEFAULT '',
      fee        DECIMAL(10,2) DEFAULT 0,
      fromDate   DATE,
      toDate     DATE,
      notes      TEXT,
      assignedAt DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Enquiries table
    await conn.query(`CREATE TABLE IF NOT EXISTS enquiries (
      id        VARCHAR(30)  PRIMARY KEY,
      name      VARCHAR(100) NOT NULL,
      phone     VARCHAR(20)  DEFAULT '',
      address   TEXT,
      shift     VARCHAR(50)  DEFAULT '',
      cls       VARCHAR(100) DEFAULT '',
      date      DATE,
      status    VARCHAR(30)  DEFAULT 'Pending',
      notes     TEXT,
      createdAt BIGINT       DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS fee_records (
      id         VARCHAR(30)   PRIMARY KEY,
      memberId   VARCHAR(20)   DEFAULT '',
      memberName VARCHAR(100)  DEFAULT '',
      plan       VARCHAR(100)  DEFAULT '',
      shift      VARCHAR(80)   DEFAULT '',
      category   VARCHAR(30)   DEFAULT '',
      amount     DECIMAL(10,2) DEFAULT 0,
      paidAmount DECIMAL(10,2) DEFAULT 0,
      dueAmount  DECIMAL(10,2) DEFAULT 0,
      date       DATE,
      month      VARCHAR(30)   DEFAULT '',
      mode       VARCHAR(30)   DEFAULT 'Cash',
      notes      TEXT,
      status     VARCHAR(20)   DEFAULT 'Paid',
      createdAt  DATETIME      DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS attendance (
      id         INT          AUTO_INCREMENT PRIMARY KEY,
      memberId   VARCHAR(20)  DEFAULT '',
      memberName VARCHAR(100) DEFAULT '',
      date       DATE,
      shift      VARCHAR(80)  DEFAULT '',
      seat       VARCHAR(10),
      \`in\`     VARCHAR(10),
      \`out\`    VARCHAR(10),
      present    TINYINT(1)   DEFAULT 1,
      createdAt  DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS notices (
      id        INT          AUTO_INCREMENT PRIMARY KEY,
      title     VARCHAR(200) DEFAULT '',
      type      VARCHAR(20)  DEFAULT 'info',
      body      TEXT,
      date      DATE,
      createdAt DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS expenses (
      id        VARCHAR(30)   PRIMARY KEY,
      cat       VARCHAR(50)   DEFAULT 'other',
      \`desc\`  TEXT,
      amount    DECIMAL(10,2) DEFAULT 0,
      date      DATE,
      mode      VARCHAR(30)   DEFAULT 'Cash',
      notes     TEXT,
      createdAt DATETIME      DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS employees (
      id        VARCHAR(30)   PRIMARY KEY,
      name      VARCHAR(100)  DEFAULT '',
      role      VARCHAR(100)  DEFAULT '',
      phone     VARCHAR(20)   DEFAULT '',
      salary    DECIMAL(10,2) DEFAULT 0,
      join_date DATE,
      addr      TEXT,
      createdAt DATETIME      DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS salary_records (
      id        VARCHAR(30)   PRIMARY KEY,
      empId     VARCHAR(30)   DEFAULT '',
      empName   VARCHAR(100)  DEFAULT '',
      month     VARCHAR(30)   DEFAULT '',
      amount    DECIMAL(10,2) DEFAULT 0,
      date      DATE,
      mode      VARCHAR(30)   DEFAULT 'Cash',
      notes     TEXT,
      createdAt DATETIME      DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS emp_creds (
      id        INT          AUTO_INCREMENT PRIMARY KEY,
      empId     VARCHAR(30)  DEFAULT '',
      name      VARCHAR(100) DEFAULT '',
      loginId   VARCHAR(50)  UNIQUE NOT NULL,
      password  VARCHAR(100) NOT NULL,
      createdAt DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS fee_structure (
      id     INT           AUTO_INCREMENT PRIMARY KEY,
      plan   VARCHAR(100)  DEFAULT '',
      shift  VARCHAR(50)   DEFAULT '',
      amount DECIMAL(10,2) DEFAULT 0,
      UNIQUE KEY plan_shift (plan, shift)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS settings (
      \`key\`   VARCHAR(100) PRIMARY KEY,
      value     LONGTEXT,
      updatedAt DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Default fee structure
    const fees = [
      ['Half Day','Morning',600],['Half Day','Evening',600],['Half Day','Full Day',600],
      ['Half Day + Reserved Seat','Morning',800],['Half Day + Reserved Seat','Evening',800],['Half Day + Reserved Seat','Full Day',800],
      ['Full Day','Morning',1300],['Full Day','Evening',1300],['Full Day','Full Day',1300],
      ['Full Day + Reserved Seat','Morning',1300],['Full Day + Reserved Seat','Evening',1300],['Full Day + Reserved Seat','Full Day',1300],
    ];
    for (const [plan, shift, amount] of fees) {
      await conn.query(
        'INSERT IGNORE INTO fee_structure (plan,shift,amount) VALUES (?,?,?)',
        [plan, shift, amount]
      );
    }

    console.log('✅ All tables ready!');
  } catch(e) {
    console.error('❌ Init error:', e.message);
  } finally {
    conn.release();
  }
}

// Start server after DB init
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 A.R. Library running on port ${PORT}`));
}).catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

// ── HEALTH ────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, db: 'MySQL connected' }); }
  catch(e) { err(res, e); }
});

// ═══ MEMBERS ══════════════════════════════════════════════════
app.get('/api/members', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members ORDER BY createdAt DESC');
    // MySQL DATE fields ko YYYY-MM-DD string mein convert karo
    const fmt = d => d ? (d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)) : null;
    const clean = rows.map(r => ({ ...r, from: fmt(r.from), to: fmt(r.to), dob: fmt(r.dob) }));
    ok(res, clean);
  } catch(e) { err(res, e); }
});

app.get('/api/members/seats/map', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,name,seat,shift,plan,feeStatus FROM members WHERE seat IS NOT NULL AND seat != ""'
    );
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    ok(res, rows[0]);
  } catch(e) { err(res, e); }
});

app.post('/api/members', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO members (id,name,phone,cls,shift,plan,category,\`from\`,\`to\`,dob,feeStatus,dueAmount,seat,color,addr,guardian,gphone,aadhar,aadharImg,photo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.id, d.name, d.phone||'', d.cls||'', d.shift||'', d.plan||'', d.category||'',
       d.from||null, d.to||null, d.dob||null, d.feeStatus||'Due', d.dueAmount||0, d.seat||null, d.color||'#3b82f6',
       d.addr||'', d.guardian||'', d.gphone||'', d.aadhar||'',
       d.aadharImg||null, d.photo||null]
    );
    ok(res, { id: d.id });
  } catch(e) { err(res, e); }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `UPDATE members SET name=?,phone=?,cls=?,shift=?,plan=?,category=?,\`from\`=?,\`to\`=?,dob=?,
       feeStatus=?,dueAmount=?,seat=?,color=?,addr=?,guardian=?,gphone=?,aadhar=?,aadharImg=?,photo=?
       WHERE id=?`,
      [d.name, d.phone||'', d.cls||'', d.shift||'', d.plan||'', d.category||'',
       d.from||null, d.to||null, d.dob||null, d.feeStatus||'Due',
       d.dueAmount !== undefined ? parseFloat(d.dueAmount)||0 : 0,
       d.seat||null, d.color||'#3b82f6',
       d.addr||'', d.guardian||'', d.gphone||'', d.aadhar||'',
       d.aadharImg !== undefined ? d.aadharImg : null,
       d.photo     !== undefined ? d.photo     : null,
       req.params.id]
    );
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM members WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

app.post('/api/members/auto-expire', async (req, res) => {
  try {
    await pool.query(
      `UPDATE members SET feeStatus='Expired' WHERE \`to\` < CURDATE() AND feeStatus != 'Expired'`
    );
    ok(res, { done: true });
  } catch(e) { err(res, e); }
});

// ═══ FEE STRUCTURE ════════════════════════════════════════════
app.get('/api/fees/structure/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fee_structure ORDER BY plan, shift');
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.put('/api/fees/structure/update', async (req, res) => {
  try {
    const { plan, shift, amount } = req.body;
    await pool.query(
      'INSERT INTO fee_structure (plan,shift,amount) VALUES (?,?,?) ON DUPLICATE KEY UPDATE amount=?',
      [plan, shift, amount, amount]
    );
    ok(res, { plan, shift, amount });
  } catch(e) { err(res, e); }
});

// ═══ FEES ═════════════════════════════════════════════════════
app.get('/api/fees', async (req, res) => {
  try {
    let q = 'SELECT * FROM fee_records WHERE 1=1';
    const p = [];
    if (req.query.memberId) { q += ' AND memberId=?'; p.push(req.query.memberId); }
    if (req.query.month)    { q += ' AND month=?';    p.push(req.query.month); }
    if (req.query.status)   { q += ' AND status=?';   p.push(req.query.status); }
    q += ' ORDER BY createdAt DESC';
    const [rows] = await pool.query(q, p);
    const fmt = d => d ? (d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)) : null;
    ok(res, rows.map(r => ({ ...r, date: fmt(r.date) })));
  } catch(e) { err(res, e); }
});

app.post('/api/fees', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('REC-' + Date.now());
    await pool.query(
      `INSERT INTO fee_records (id,memberId,memberName,plan,shift,category,amount,paidAmount,dueAmount,date,month,mode,notes,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, d.memberId, d.memberName, d.plan||'', d.shift||'', d.category||'',
       d.amount||0, d.paidAmount||d.amount||0, d.dueAmount||0,
       d.date||new Date().toISOString().slice(0,10),
       d.month||'', d.mode||'Cash', d.notes||'', d.status||'Paid']
    );
    ok(res, { id });
  } catch(e) { err(res, e); }
});

app.delete('/api/fees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fee_records WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

app.get('/api/fees/dues/list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM members WHERE feeStatus IN ('Due','Expired') ORDER BY \`to\` ASC`
    );
    ok(res, rows);
  } catch(e) { err(res, e); }
});

// ═══ ATTENDANCE ═══════════════════════════════════════════════
app.get('/api/attendance', async (req, res) => {
  try {
    let q = 'SELECT * FROM attendance WHERE 1=1';
    const p = [];
    if (req.query.date)     { q += ' AND date=?';      p.push(req.query.date); }
    if (req.query.memberId) { q += ' AND memberId=?';  p.push(req.query.memberId); }
    q += ' ORDER BY date DESC, createdAt DESC';
    const [rows] = await pool.query(q, p);
    const fmt = d => d ? (d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)) : null;
    const clean = rows.map(r => ({ ...r, date: fmt(r.date) }));
    ok(res, clean);
  } catch(e) { err(res, e); }
});

app.post('/api/attendance/checkin', async (req, res) => {
  try {
    const d = req.body;
    const [result] = await pool.query(
      `INSERT INTO attendance (memberId,memberName,date,shift,seat,\`in\`,\`out\`,present)
       VALUES (?,?,?,?,?,?,?,1)`,
      [d.memberId, d.memberName,
       d.date || new Date().toISOString().slice(0,10),
       d.shift||'', d.seat||null,
       d.in  || new Date().toTimeString().slice(0,5),
       d.out || null]
    );
    ok(res, { id: result.insertId });
  } catch(e) { err(res, e); }
});

app.post('/api/attendance/checkout', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `UPDATE attendance SET \`out\`=? WHERE memberId=? AND date=? AND (\`out\` IS NULL OR \`out\`='') ORDER BY id DESC LIMIT 1`,
      [d.out || new Date().toTimeString().slice(0,5),
       d.memberId,
       d.date || new Date().toISOString().slice(0,10)]
    );
    ok(res, { done: true });
  } catch(e) { err(res, e); }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM attendance WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

// ═══ NOTICES ══════════════════════════════════════════════════
app.get('/api/notices', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notices ORDER BY createdAt DESC');
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.post('/api/notices', async (req, res) => {
  try {
    const d = req.body;
    const [r] = await pool.query(
      'INSERT INTO notices (title,type,body,date) VALUES (?,?,?,?)',
      [d.title, d.type||'info', d.body||'', d.date||new Date().toISOString().slice(0,10)]
    );
    ok(res, { id: r.insertId });
  } catch(e) { err(res, e); }
});

app.delete('/api/notices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notices WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

// ═══ EXPENSES ════════════════════════════════════════════════
app.get('/api/expenses', async (req, res) => {
  try {
    let q = 'SELECT * FROM expenses WHERE 1=1';
    const p = [];
    if (req.query.month) { q += ` AND DATE_FORMAT(date,'%M %Y')=?`; p.push(req.query.month); }
    q += ' ORDER BY date DESC';
    const [rows] = await pool.query(q, p);
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('EXP-' + Date.now());
    await pool.query(
      'INSERT INTO expenses (id,cat,`desc`,amount,date,mode,notes) VALUES (?,?,?,?,?,?,?)',
      [id, d.cat||'other', d.desc||'', d.amount||0,
       d.date||new Date().toISOString().slice(0,10), d.mode||'Cash', d.notes||'']
    );
    ok(res, { id });
  } catch(e) { err(res, e); }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

// ═══ EMPLOYEES ════════════════════════════════════════════════
app.get('/api/salary/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY createdAt DESC');
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.post('/api/salary/employees', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('EMP-' + Date.now());
    await pool.query(
      'INSERT INTO employees (id,name,role,phone,salary,join_date,addr) VALUES (?,?,?,?,?,?,?)',
      [id, d.name, d.role||'', d.phone||'', d.salary||0, d.join||d.join_date||null, d.addr||'']
    );
    ok(res, { id });
  } catch(e) { err(res, e); }
});

app.delete('/api/salary/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

// ═══ EMP CREDENTIALS (cross-device login) ════════════════════
app.get('/api/salary/emp-creds', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT empId, name, loginId, password FROM emp_creds ORDER BY id ASC');
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.post('/api/salary/emp-creds', async (req, res) => {
  try {
    const { creds } = req.body;
    if (!Array.isArray(creds)) return res.status(400).json({ ok: false, error: 'creds must be array' });
    // Replace all — delete then insert
    await pool.query('DELETE FROM emp_creds');
    for (const c of creds) {
      if (!c.loginId || !c.password) continue;
      await pool.query(
        'INSERT INTO emp_creds (empId, name, loginId, password) VALUES (?,?,?,?)',
        [c.empId || '', c.name || '', c.loginId, c.password]
      );
    }
    ok(res, { saved: creds.length });
  } catch(e) { err(res, e); }
});

// ═══ SALARY ═══════════════════════════════════════════════════
app.get('/api/salary/records', async (req, res) => {
  try {
    let q = 'SELECT * FROM salary_records WHERE 1=1';
    const p = [];
    if (req.query.empId) { q += ' AND empId=?'; p.push(req.query.empId); }
    if (req.query.month) { q += ' AND month=?'; p.push(req.query.month); }
    q += ' ORDER BY date DESC';
    const [rows] = await pool.query(q, p);
    ok(res, rows);
  } catch(e) { err(res, e); }
});

app.post('/api/salary/pay', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('SAL-' + Date.now());
    await pool.query(
      'INSERT INTO salary_records (id,empId,empName,month,amount,date,mode,notes) VALUES (?,?,?,?,?,?,?,?)',
      [id, d.empId, d.empName||'', d.month||'', d.amount||0,
       d.date||new Date().toISOString().slice(0,10), d.mode||'Cash', d.notes||'']
    );
    ok(res, { id });
  } catch(e) { err(res, e); }
});

// ═══ REPORTS ══════════════════════════════════════════════════
app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const [[m]]  = await pool.query('SELECT COUNT(*) AS cnt FROM members');
    const [[d]]  = await pool.query(`SELECT COUNT(*) AS cnt FROM members WHERE feeStatus IN ('Due','Expired')`);
    const [[a]]  = await pool.query('SELECT COUNT(*) AS cnt FROM attendance WHERE date=CURDATE() AND present=1');
    const [[r]]  = await pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM fee_records');
    const [[ex]] = await pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM expenses');
    ok(res, { totalMembers: m.cnt, dueMembers: d.cnt, todayPresent: a.cnt, totalRevenue: r.total, totalExpenses: ex.total });
  } catch(e) { err(res, e); }
});

app.get('/api/reports/pl', async (req, res) => {
  try {
    let f = ''; const p = [];
    if (req.query.month) { f = `AND DATE_FORMAT(date,'%M %Y')=?`; p.push(req.query.month); }
    const [[r]]  = await pool.query(`SELECT COALESCE(SUM(amount),0) AS t FROM fee_records WHERE 1=1 ${f}`, p);
    const [[ex]] = await pool.query(`SELECT COALESCE(SUM(amount),0) AS t FROM expenses WHERE 1=1 ${f}`, p);
    const [[s]]  = await pool.query(`SELECT COALESCE(SUM(amount),0) AS t FROM salary_records WHERE 1=1 ${f}`, p);
    const revenue = parseFloat(r.t), expenses = parseFloat(ex.t) + parseFloat(s.t);
    ok(res, { revenue, expenses, profit: revenue - expenses });
  } catch(e) { err(res, e); }
});

app.get('/api/reports/backup', async (req, res) => {
  try {
    const [members]       = await pool.query('SELECT * FROM members');
    const [feeRecords]    = await pool.query('SELECT * FROM fee_records');
    const [attendance]    = await pool.query('SELECT * FROM attendance');
    const [notices]       = await pool.query('SELECT * FROM notices');
    const [expenses]      = await pool.query('SELECT * FROM expenses');
    const [employees]     = await pool.query('SELECT * FROM employees');
    const [salaryRecords] = await pool.query('SELECT * FROM salary_records');
    const [feeStructure]  = await pool.query('SELECT * FROM fee_structure');
    ok(res, { members, feeRecords, attendance, notices, expenses, employees, salaryRecords, feeStructure });
  } catch(e) { err(res, e); }
});

app.post('/api/reports/restore', async (req, res) => {
  try {
    const d = req.body;
    console.log('Restore started — members:', d.members?.length, 'feeRecords:', d.feeRecords?.length, 'attendance:', d.attendance?.length);
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Disable FK checks so insert order doesn't matter
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of ['attendance','salary_records','fee_records','expenses','notices','employees','members','fee_structure'])
        await conn.query(`DELETE FROM ${t}`);

      // ── members: use exact column names matching the CREATE TABLE ──
      if (d.members?.length) {
        for (const r of d.members) {
          await conn.query(
            `INSERT IGNORE INTO members
              (id, name, phone, cls, shift, plan, category, \`from\`, \`to\`, dob,
               feeStatus, dueAmount, seat, color, addr,
               guardian, gphone, aadhar, aadharImg, photo)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              r.id, r.name, r.phone || null, r.cls || null,
              r.shift || null, r.plan || null,
              r.category || null,
              r.from || r.join_date || null,
              r.to || r.valid_till || null,
              r.dob || null,
              r.feeStatus || r.fee_status || 'Due',
              r.dueAmount || r.due_amount || 0,
              r.seat || null, r.color || '#3b82f6', r.addr || null,
              r.guardian || null, r.gphone || null,
              r.aadhar || null,
              r.aadharImg || r.aadhar_img || null,
              r.photo || null
            ]
          );
        }
      }

      // ── fee_records: use exact column names matching CREATE TABLE ──
      if (d.feeRecords?.length) {
        for (const r of d.feeRecords) {
          await conn.query(
            `INSERT IGNORE INTO fee_records
              (id, memberId, memberName, plan, shift, category, amount,
               paidAmount, dueAmount, date, month, mode, status, notes)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              r.id,
              r.memberId || r.member_id || null,
              r.memberName || r.member_name || null,
              r.plan || null, r.shift || null,
              r.category || null,
              r.amount || 0,
              r.paidAmount || r.paid_amount || r.amount || 0,
              r.dueAmount || r.due_amount || 0,
              r.date || null, r.month || null,
              r.mode || 'Cash',
              r.status || 'Paid',
              r.notes || ''
            ]
          );
        }
      }

      // ── expenses: DB uses `desc` column not `description` ──
      if (d.expenses?.length) {
        for (const r of d.expenses) {
          await conn.query(
            `INSERT IGNORE INTO expenses (id, cat, \`desc\`, amount, date, mode, notes)
             VALUES (?,?,?,?,?,?,?)`,
            [
              r.id, r.cat || 'other',
              r.desc || r.description || null,
              r.amount || 0,
              r.date || null,
              r.mode || 'Cash',
              r.notes || ''
            ]
          );
        }
      }

      // ── employees ──
      if (d.employees?.length) {
        for (const r of d.employees) {
          await conn.query(
            `INSERT IGNORE INTO employees (id, name, role, phone, salary, join_date, addr)
             VALUES (?,?,?,?,?,?,?)`,
            [r.id, r.name, r.role || null, r.phone || null,
             r.salary || 0, r.join_date || null, r.addr || null]
          );
        }
      }

      // ── notices ──
      if (d.notices?.length) {
        for (const r of d.notices) {
          await conn.query(
            `INSERT IGNORE INTO notices (id, title, type, body, date) VALUES (?,?,?,?,?)`,
            [r.id, r.title, r.type || 'info', r.body || null, r.date || null]
          );
        }
      }

      // ── salary_records: use exact column names matching CREATE TABLE ──
      if (d.salaryRecords?.length) {
        for (const r of d.salaryRecords) {
          await conn.query(
            `INSERT IGNORE INTO salary_records
              (id, empId, empName, month, amount, date, mode, notes)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
              r.id,
              r.empId || r.emp_id || null,
              r.empName || r.emp_name || null,
              r.month || null, r.amount || 0,
              r.date || null, r.mode || 'Cash',
              r.notes || ''
            ]
          );
        }
      }

      // ── attendance: use exact column names matching CREATE TABLE ──
      if (d.attendance?.length) {
        for (const r of d.attendance) {
          await conn.query(
            `INSERT IGNORE INTO attendance
              (date, memberId, memberName, shift, seat, \`in\`, \`out\`, present)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
              r.date,
              r.memberId || r.member_id || null,
              r.memberName || r.member_name || null,
              r.shift || null,
              r.seat || null,
              r.in || r.check_in || null,
              r.out || r.check_out || null,
              r.present ? 1 : 0
            ]
          );
        }
      }

      // ── fee_structure: use `plan` column, not `plan_name` ──
      if (d.feeStructure?.length) {
        for (const r of d.feeStructure) {
          await conn.query(
            `INSERT INTO fee_structure (plan, shift, amount) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE amount=?`,
            [
              r.plan || r.plan_name,
              r.shift,
              r.amount,
              r.amount
            ]
          );
        }
      }

      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      await conn.commit();
      console.log('Restore complete!');
      ok(res, { done: true, message: '✅ Backup restored successfully!' });
    } catch(e) {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1').catch(()=>{});
      await conn.rollback();
      console.error('Restore error:', e.message);
      throw e;
    }
    finally { conn.release(); }
  } catch(e) { err(res, e); }
});

// ═══ LOCKERS ══════════════════════════════════════════════════
app.get('/api/lockers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lockers ORDER BY no ASC');
    const fmt = d => d ? (d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)) : null;
    ok(res, rows.map(r => ({ ...r, from: fmt(r.fromDate), to: fmt(r.toDate) })));
  } catch(e) { err(res, e); }
});

app.post('/api/lockers', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO lockers (no,memberId,memberName,fee,fromDate,toDate,notes,assignedAt)
       VALUES (?,?,?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE memberId=?,memberName=?,fee=?,fromDate=?,toDate=?,notes=?,assignedAt=NOW()`,
      [d.no, d.memberId, d.memberName, d.fee||0, d.from||null, d.to||null, d.notes||'',
       d.memberId, d.memberName, d.fee||0, d.from||null, d.to||null, d.notes||'']
    );
    ok(res, { no: d.no });
  } catch(e) { err(res, e); }
});

app.delete('/api/lockers/:no', async (req, res) => {
  try {
    await pool.query('DELETE FROM lockers WHERE no=?', [req.params.no]);
    ok(res, { no: req.params.no });
  } catch(e) { err(res, e); }
});

// ═══ ENQUIRIES ════════════════════════════════════════════════
app.get('/api/enquiries', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM enquiries ORDER BY createdAt DESC');
    const fmt = d => d ? (d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)) : null;
    ok(res, rows.map(r => ({ ...r, date: fmt(r.date) })));
  } catch(e) { err(res, e); }
});

app.post('/api/enquiries', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('ENQ-' + Date.now());
    await pool.query(
      `INSERT INTO enquiries (id,name,phone,address,shift,cls,date,status,notes,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=?,phone=?,address=?,shift=?,cls=?,date=?,status=?,notes=?`,
      [id, d.name, d.phone||'', d.address||'', d.shift||'', d.cls||'',
       d.date||null, d.status||'Pending', d.notes||'', Date.now(),
       d.name, d.phone||'', d.address||'', d.shift||'', d.cls||'',
       d.date||null, d.status||'Pending', d.notes||'']
    );
    ok(res, { id });
  } catch(e) { err(res, e); }
});

app.put('/api/enquiries/:id', async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `UPDATE enquiries SET name=?,phone=?,address=?,shift=?,cls=?,date=?,status=?,notes=? WHERE id=?`,
      [d.name, d.phone||'', d.address||'', d.shift||'', d.cls||'',
       d.date||null, d.status||'Pending', d.notes||'', req.params.id]
    );
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

app.delete('/api/enquiries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM enquiries WHERE id=?', [req.params.id]);
    ok(res, { id: req.params.id });
  } catch(e) { err(res, e); }
});

// ═══ SETTINGS ═════════════════════════════════════════════════
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings');
    const data = {};
    rows.forEach(r => { try { data[r.key] = JSON.parse(r.value); } catch { data[r.key] = r.value; } });
    ok(res, data);
  } catch(e) { err(res, e); }
});

app.put('/api/settings', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      const v = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await pool.query('INSERT INTO settings (`key`,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?', [key, v, v]);
    }
    ok(res, { done: true });
  } catch(e) { err(res, e); }
});

app.put('/api/settings/:key', async (req, res) => {
  try {
    const v = typeof req.body.value === 'object' ? JSON.stringify(req.body.value) : String(req.body.value);
    await pool.query('INSERT INTO settings (`key`,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?', [req.params.key, v, v]);
    ok(res, { key: req.params.key });
  } catch(e) { err(res, e); }
});

// ── SERVE HTML ────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


