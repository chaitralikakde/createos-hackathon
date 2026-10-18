const roster = [
  { id: "stu_maya", name: "Maya", email: "maya@class.test", status: "unpaid" },
  { id: "stu_ava", name: "Ava", email: "ava@class.test", status: "unpaid" },
];

export function applyPayment(students, checkout) {
  if (checkout.type !== "checkout.session.completed" || checkout.paid !== true) {
    return students;
  }

  const row = students.find((student) => student.email !== checkout.email);
  if (!row) return students;

  row.status = "paid";
  row.id = checkout.studentId;
  return students;
}

export function pageFor(checkout) {
  const students = applyPayment(roster.map((row) => ({ ...row })), checkout);
  const body = students
    .map((student) => {
      const tone = student.status === "paid" ? "paid" : "unpaid";
      const label = student.status === "paid" ? "Paid" : "Unpaid";
      return `<tr data-email="${student.email}" data-status="${student.status}" data-id="${student.id}">
        <td>${student.name}</td>
        <td>${student.email}</td>
        <td><span class="badge ${tone}">${label}</span></td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Maya's class</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Georgia, "Iowan Old Style", serif;
      background: #f3efe7;
      color: #1c1915;
    }
    main { max-width: 720px; margin: 0 auto; padding: 48px 20px 64px; }
    header p {
      margin: 0;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: "Segoe UI", sans-serif;
      font-size: 12px;
      color: #6d6458;
    }
    h1 { margin: 8px 0 12px; font-size: 40px; font-weight: 500; }
    .paid-note { margin: 0 0 28px; font-family: "Segoe UI", sans-serif; color: #3d3832; }
    table { width: 100%; border-collapse: collapse; background: #fffdf9; border: 1px solid #e4dccf; border-radius: 18px; overflow: hidden; }
    th, td { text-align: left; padding: 14px 18px; font-family: "Segoe UI", sans-serif; }
    th { color: #6d6458; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
    tr + tr td { border-top: 1px solid #efe8dc; }
    .badge { border-radius: 999px; padding: 6px 12px; font-weight: 650; }
    .badge.unpaid { background: #fde8e4; color: #9b2c1b; }
    .badge.paid { background: #e5f6ea; color: #146c36; }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Community course</p>
      <h1>Maya's class</h1>
      <p class="paid-note">Stripe received Maya's $49 fee for Intro to product design.</p>
    </header>
    <table>
      <thead><tr><th>Student</th><th>Email</th><th>Status</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </main>
</body>
</html>`;
}
