const STORAGE_KEY = "opener_platform_v1";

const demoData = {
  users: [
    { id: "teacher-1", role: "instructor", name: "Ms. Rivera", email: "teacher@opener.test" },
    { id: "student-1", role: "student", name: "Avery Johnson", email: "avery@opener.test" },
    { id: "student-2", role: "student", name: "Maya Chen", email: "maya@opener.test" },
    { id: "student-3", role: "student", name: "Jordan Lee", email: "jordan@opener.test" }
  ],
  classes: [
    { id: "class-1", name: "Period 2 Algebra", instructorId: "teacher-1", joinCode: "ALG2" },
    { id: "class-2", name: "Period 4 Geometry", instructorId: "teacher-1", joinCode: "GEO4" }
  ],
  memberships: [
    { classId: "class-1", studentId: "student-1" },
    { classId: "class-1", studentId: "student-2" },
    { classId: "class-1", studentId: "student-3" },
    { classId: "class-2", studentId: "student-1" },
    { classId: "class-2", studentId: "student-3" }
  ],
  tasks: [
    {
      id: "task-1",
      classId: "class-1",
      title: "Linear Equations Warm-Up",
      instructions: "Answer both questions before the first ten minutes of class are over.",
      opensAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      closesAt: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
      questions: [
        {
          id: "q-1",
          type: "multiple",
          prompt: "What is the slope of y = 3x + 2?",
          options: ["2", "3", "-3", "5"],
          correctAnswer: "3",
          points: 1
        },
        {
          id: "q-2",
          type: "short",
          prompt: "In one sentence, explain what the y-intercept tells us.",
          correctAnswer: "",
          points: 2
        }
      ]
    }
  ],
  submissions: [
    {
      id: "sub-1",
      taskId: "task-1",
      studentId: "student-2",
      submittedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      answers: { "q-1": "3", "q-2": "It is where the line crosses the y-axis." },
      manualScores: { "q-2": 2 }
    }
  ],
  session: null,
  selectedClassId: "class-1"
};

let state = loadState();
let view = "tasks";
let selectedReportTaskId = "all";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoData);
  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(demoData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function app() {
  return document.querySelector("#app");
}

function currentUser() {
  return state.users.find((user) => user.id === state.session?.userId) || null;
}

function instructorClasses(instructorId) {
  return state.classes.filter((item) => item.instructorId === instructorId);
}

function selectedClass() {
  const user = currentUser();
  const classes = user?.role === "instructor" ? instructorClasses(user.id) : state.classes;
  return classes.find((item) => item.id === state.selectedClassId) || classes[0] || null;
}

function makeJoinCode(name) {
  const base = name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "CLS";
  return `${base}${Math.floor(10 + Math.random() * 90)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function taskStatus(task) {
  const now = Date.now();
  const opens = new Date(task.opensAt).getTime();
  const closes = new Date(task.closesAt).getTime();
  if (now < opens) return "waiting";
  if (now > closes) return "closed";
  return "open";
}

function statusLabel(status) {
  return status === "open" ? "Open" : status === "closed" ? "Closed" : "Upcoming";
}

function maxPoints(task) {
  return task.questions.reduce((sum, question) => sum + Number(question.points || 1), 0);
}

function getSubmission(taskId, studentId) {
  return state.submissions.find((sub) => sub.taskId === taskId && sub.studentId === studentId);
}

function autoScore(task, submission) {
  if (!submission) return 0;
  return task.questions.reduce((score, question) => {
    const value = submission.answers[question.id];
    if (question.type === "multiple" && value === question.correctAnswer) {
      return score + Number(question.points || 1);
    }
    if (question.type === "short") {
      return score + Number(submission.manualScores?.[question.id] || 0);
    }
    return score;
  }, 0);
}

function classStudents(classId) {
  const ids = state.memberships.filter((item) => item.classId === classId).map((item) => item.studentId);
  return state.users.filter((user) => ids.includes(user.id));
}

function renderShell(content) {
  const user = currentUser();
  app().innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">O</div>
          <div>
            <h1>Opening Tasks - Cyber Security</h1>
            <span>Ms. Budhu</span>
          </div>
        </div>
        ${user ? `<div class="btn-row"><span class="muted">${user.name} · ${user.role}</span><button class="btn secondary" data-action="logout">Sign out</button></div>` : ""}
      </header>
      ${content}
    </div>
  `;
}

function renderLogin() {
  renderShell(`
    <section class="hero">
      <h2>Opening Tasks - Cyber Security Ms. Budhu</h2>
      <p>On the respective days please submit and complete the opening task assignment as posted. Your cumulative grade will be a reflection at the end of your marking period of your opening task submissions under "Formative Assignments - Opening Tasks" within your gradebook.</p>
    </section>
    <main class="main">
      <div class="login-grid">
        <form class="card stack" data-form="login">
          <h3>Sign in</h3>
          <p class="muted">Use a demo account or create a new student/instructor below.</p>
          <div class="field">
            <label for="email">Email</label>
            <input class="input" id="email" name="email" value="teacher@opener.test" autocomplete="email" />
          </div>
          <button class="btn" type="submit">Sign in</button>
          <div class="btn-row">
            <button class="btn secondary" type="button" data-demo="teacher@opener.test">Teacher demo</button>
            <button class="btn secondary" type="button" data-demo="avery@opener.test">Student demo</button>
          </div>
        </form>
        <form class="card stack" data-form="register">
          <h3>Create account</h3>
          <div class="grid">
            <div class="field">
              <label for="new-name">Name</label>
              <input class="input" id="new-name" name="name" required />
            </div>
            <div class="field">
              <label for="new-role">Role</label>
              <select id="new-role" name="role">
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="new-email">Email</label>
            <input class="input" id="new-email" name="email" type="email" required />
          </div>
          <div class="field">
            <label for="join-code">Class join code</label>
            <input class="input" id="join-code" name="joinCode" placeholder="Students enter teacher code, e.g. ALG2" />
          </div>
          <button class="btn" type="submit">Create and sign in</button>
        </form>
      </div>
    </main>
  `);
}

function renderInstructor() {
  const klass = selectedClass();
  const classes = instructorClasses(currentUser().id);
  const tabs = [
    ["tasks", "Opening Tasks"],
    ["students", "Students"],
    ["reports", "Reports"]
  ];

  if (!klass) {
    renderShell(`
      <main class="main">
        <section class="panel stack">
          <h2>Create Your First Class</h2>
          <p class="muted">Classes keep rosters, tasks, and reports separated.</p>
          ${renderClassForm()}
        </section>
      </main>
    `);
    return;
  }

  renderShell(`
    <main class="main layout">
      <aside class="panel sidebar">
        <div class="stack">
          <div>
            <h3>${klass.name}</h3>
            <p class="muted">Join code: <b>${klass.joinCode}</b></p>
          </div>
          <div class="field">
            <label for="class-switcher">Class</label>
            <select id="class-switcher" data-control="class-switcher">
              ${classes.map((item) => `<option value="${item.id}" ${item.id === klass.id ? "selected" : ""}>${item.name}</option>`).join("")}
            </select>
          </div>
          <details class="class-tools">
            <summary>New class</summary>
            ${renderClassForm()}
          </details>
        </div>
        <nav class="tabs">
          ${tabs.map(([id, label]) => `<button class="tab ${view === id ? "active" : ""}" data-view="${id}">${label}<span>›</span></button>`).join("")}
        </nav>
      </aside>
      <section class="stack">${view === "tasks" ? renderTasksPanel(klass) : view === "students" ? renderStudentsPanel(klass) : renderReportsPanel(klass)}</section>
    </main>
  `);
}

function renderClassForm() {
  return `
    <form class="stack" data-form="class">
      <div class="field">
        <label>Class name</label>
        <input class="input" name="name" required placeholder="Period 1 Biology" />
      </div>
      <button class="btn" type="submit">Create class</button>
    </form>
  `;
}

function renderTasksPanel(klass) {
  const tasks = state.tasks.filter((task) => task.classId === klass.id).sort((a, b) => new Date(b.opensAt) - new Date(a.opensAt));
  return `
    <section class="panel stack">
      <div class="row">
        <div>
          <h2>Opening Tasks</h2>
          <p class="muted">Create questions, set close times, and grade short answers after students submit.</p>
        </div>
      </div>
      <form class="stack" data-form="task">
        <div class="grid">
          <div class="field">
            <label>Task title</label>
            <input class="input" name="title" required placeholder="Monday warm-up" />
          </div>
          <div class="field">
            <label>Close time</label>
            <input class="input" name="closesAt" type="datetime-local" required />
          </div>
        </div>
        <div class="field">
          <label>Instructions</label>
          <textarea name="instructions" placeholder="Answer before the timer closes."></textarea>
        </div>
        <div class="question-list" id="question-builder">
          ${questionBuilderRow(1)}
        </div>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-action="add-question">Add question</button>
          <button class="btn" type="submit">Publish task</button>
        </div>
      </form>
    </section>
    <section class="panel stack">
      <h3>Current Tasks</h3>
      ${tasks.length ? tasks.map(renderTaskSummary).join("") : `<div class="empty">No tasks yet.</div>`}
    </section>
  `;
}

function questionBuilderRow(number) {
  return `
    <div class="question" data-question-row>
      <div class="row">
        <strong>Question ${number}</strong>
        <button class="btn ghost" type="button" data-action="remove-question">Remove</button>
      </div>
      <div class="field">
        <label>Prompt</label>
        <textarea name="prompt" required></textarea>
      </div>
      <div class="grid">
        <div class="field">
          <label>Type</label>
          <select name="type">
            <option value="multiple">Multiple choice</option>
            <option value="short">Short answer</option>
          </select>
        </div>
        <div class="field">
          <label>Points</label>
          <input class="input" name="points" type="number" min="1" value="1" />
        </div>
      </div>
      <div class="field">
        <label>Options for multiple choice, separated by commas</label>
        <input class="input" name="options" placeholder="A, B, C, D" />
      </div>
      <div class="field">
        <label>Correct answer for multiple choice</label>
        <input class="input" name="correctAnswer" />
      </div>
    </div>
  `;
}

function renderTaskSummary(task) {
  const status = taskStatus(task);
  const students = classStudents(task.classId);
  const submitted = students.filter((student) => getSubmission(task.id, student.id)).length;
  return `
    <article class="question">
      <div class="row">
        <div>
          <strong>${task.title}</strong>
          <div class="muted">${formatDate(task.opensAt)} to ${formatDate(task.closesAt)}</div>
        </div>
        <span class="pill ${status}">${statusLabel(status)}</span>
      </div>
      <div class="muted">${task.questions.length} questions · ${submitted}/${students.length} submitted · ${maxPoints(task)} points</div>
    </article>
  `;
}

function renderStudentsPanel(klass) {
  const students = classStudents(klass.id);
  return `
    <section class="panel stack">
      <div>
        <h2>Students</h2>
        <p class="muted">Students added here belong to ${klass.name} only.</p>
      </div>
      <form class="grid" data-form="student">
        <div class="field">
          <label>Name</label>
          <input class="input" name="name" required />
        </div>
        <div class="field">
          <label>Email</label>
          <input class="input" name="email" type="email" required />
        </div>
        <button class="btn" type="submit">Add student</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>${students.map((student) => `<tr><td>${student.name}</td><td>${student.email}</td><td>${student.role}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderReportsPanel(klass) {
  const tasks = state.tasks.filter((task) => task.classId === klass.id);
  const students = classStudents(klass.id);
  if (selectedReportTaskId !== "all" && !tasks.some((task) => task.id === selectedReportTaskId)) {
    selectedReportTaskId = "all";
  }
  const reportTasks = selectedReportTaskId === "all" ? tasks : tasks.filter((task) => task.id === selectedReportTaskId);
  const visibleTask = selectedReportTaskId === "all" ? tasks[tasks.length - 1] : reportTasks[0];
  const totalSlots = reportTasks.length * students.length;
  const submittedCount = reportTasks.reduce((sum, task) => sum + students.filter((student) => getSubmission(task.id, student.id)).length, 0);
  const allScores = reportTasks.flatMap((task) =>
    students.map((student) => {
      const sub = getSubmission(task.id, student.id);
      return sub ? (autoScore(task, sub) / maxPoints(task)) * 100 : null;
    })
  ).filter((item) => item !== null);
  const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  return `
    <section class="panel stack">
      <div class="row">
        <div>
          <h2>Reports</h2>
          <p class="muted">Choose a class assignment, then export a CSV for that specific hosted opening task or the full class report.</p>
        </div>
        <button class="btn secondary" data-action="export">Download CSV Report</button>
      </div>
      <div class="grid">
        <div class="field">
          <label for="report-task">Assignment hosted</label>
          <select id="report-task" data-control="report-task">
            <option value="all" ${selectedReportTaskId === "all" ? "selected" : ""}>All hosted assignments for ${klass.name}</option>
            ${tasks.map((task) => `<option value="${task.id}" ${selectedReportTaskId === task.id ? "selected" : ""}>${task.title} · ${formatDate(task.opensAt)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="metrics">
        <div class="metric"><b>${reportTasks.length}</b><span class="muted">Assignments</span></div>
        <div class="metric"><b>${students.length}</b><span class="muted">Students</span></div>
        <div class="metric"><b>${submittedCount}/${totalSlots || 0}</b><span class="muted">Submissions</span></div>
        <div class="metric"><b>${avg}%</b><span class="muted">Average</span></div>
      </div>
      ${visibleTask ? renderGradingTable(visibleTask, students) : `<div class="empty">Create a task to see reporting.</div>`}
    </section>
  `;
}

function renderGradingTable(task, students) {
  return `
    <div class="stack">
      <h3>Grade: ${task.title}</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Status</th><th>Score</th><th>Answers</th><th>Short Answer Grade</th></tr>
          </thead>
          <tbody>
            ${students.map((student) => renderGradeRow(task, student)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderGradeRow(task, student) {
  const submission = getSubmission(task.id, student.id);
  if (!submission) return `<tr><td>${student.name}</td><td>Missing</td><td>0/${maxPoints(task)}</td><td></td><td></td></tr>`;
  const shortQuestions = task.questions.filter((question) => question.type === "short");
  return `
    <tr>
      <td>${student.name}</td>
      <td>Submitted ${formatDate(submission.submittedAt)}</td>
      <td>${autoScore(task, submission)}/${maxPoints(task)}</td>
      <td>
        ${task.questions.map((question) => `<div class="answer-block"><b>${question.prompt}</b><br>${submission.answers[question.id] || ""}</div>`).join("")}
      </td>
      <td>
        ${shortQuestions.map((question) => `
          <form class="btn-row" data-form="grade" data-submission="${submission.id}" data-question="${question.id}">
            <input class="input" name="score" type="number" min="0" max="${question.points}" value="${submission.manualScores?.[question.id] || 0}" />
            <button class="btn secondary" type="submit">Save</button>
          </form>
        `).join("")}
      </td>
    </tr>
  `;
}

function renderStudent() {
  const user = currentUser();
  const memberships = state.memberships.filter((item) => item.studentId === user.id);
  const tasks = state.tasks
    .filter((task) => memberships.some((item) => item.classId === task.classId))
    .sort((a, b) => new Date(b.opensAt) - new Date(a.opensAt));
  const activeTask = tasks.find((task) => taskStatus(task) === "open" && !getSubmission(task.id, user.id));
  const completed = tasks.filter((task) => getSubmission(task.id, user.id));

  renderShell(`
    <main class="main student-task">
      ${activeTask ? renderStudentTask(activeTask, user) : `<section class="panel stack"><h2>No open task right now</h2><p class="muted">When your instructor opens a task, it will appear here until the close time.</p></section>`}
      <section class="panel stack">
        <h3>Your Submissions</h3>
        ${completed.length ? completed.map((task) => {
          const submission = getSubmission(task.id, user.id);
          return `<article class="question"><div class="row"><strong>${task.title}</strong><span>${autoScore(task, submission)}/${maxPoints(task)}</span></div><div class="muted">Submitted ${formatDate(submission.submittedAt)}</div></article>`;
        }).join("") : `<div class="empty">No submissions yet.</div>`}
      </section>
    </main>
  `);
}

function renderStudentTask(task, user) {
  const klass = state.classes.find((item) => item.id === task.classId);
  return `
    <form class="panel stack" data-form="submission" data-task="${task.id}">
      <div class="row">
        <div>
          <h2>${task.title}</h2>
          <p class="muted">${klass.name}</p>
        </div>
        <span class="timer">Closes ${formatDate(task.closesAt)}</span>
      </div>
      <p>${task.instructions || ""}</p>
      ${task.questions.map((question, index) => renderStudentQuestion(question, index)).join("")}
      <button class="btn" type="submit">Submit opening task</button>
    </form>
  `;
}

function renderStudentQuestion(question, index) {
  if (question.type === "multiple") {
    return `
      <fieldset class="question">
        <legend><b>${index + 1}. ${question.prompt}</b></legend>
        ${question.options.map((option) => `
          <label><input type="radio" name="${question.id}" value="${option}" required /> ${option}</label>
        `).join("")}
      </fieldset>
    `;
  }
  return `
    <div class="question">
      <label class="field">
        <span><b>${index + 1}. ${question.prompt}</b></span>
        <textarea name="${question.id}" required></textarea>
      </label>
    </div>
  `;
}

function route() {
  const user = currentUser();
  if (!user) renderLogin();
  else if (user.role === "instructor") renderInstructor();
  else renderStudent();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.action === "logout") {
    state.session = null;
    saveState();
    route();
  }

  if (target.dataset.demo) {
    const user = state.users.find((item) => item.email === target.dataset.demo);
    state.session = { userId: user.id };
    saveState();
    route();
  }

  if (target.dataset.view) {
    view = target.dataset.view;
    route();
  }

  if (target.dataset.action === "add-question") {
    const builder = document.querySelector("#question-builder");
    builder.insertAdjacentHTML("beforeend", questionBuilderRow(builder.querySelectorAll("[data-question-row]").length + 1));
  }

  if (target.dataset.action === "remove-question") {
    const rows = document.querySelectorAll("[data-question-row]");
    if (rows.length > 1) target.closest("[data-question-row]").remove();
  }

  if (target.dataset.action === "export") {
    exportCsv();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset.control === "class-switcher") {
    state.selectedClassId = target.value;
    selectedReportTaskId = "all";
    saveState();
    route();
  }

  if (target.dataset.control === "report-task") {
    selectedReportTaskId = target.value;
    route();
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.dataset.form === "login") {
    const email = new FormData(form).get("email").trim().toLowerCase();
    const user = state.users.find((item) => item.email.toLowerCase() === email);
    if (!user) return alert("No account found for that email.");
    state.session = { userId: user.id };
  }

  if (form.dataset.form === "register") {
    const data = new FormData(form);
    const role = data.get("role");
    const joinCode = data.get("joinCode").trim().toUpperCase();
    const joinedClass = state.classes.find((klass) => klass.joinCode.toUpperCase() === joinCode);
    if (role === "student" && !joinedClass) {
      alert("Please enter a valid class join code from your instructor.");
      return;
    }
    const user = {
      id: uid("user"),
      name: data.get("name").trim(),
      email: data.get("email").trim(),
      role
    };
    state.users.push(user);
    if (user.role === "student") {
      state.memberships.push({ classId: joinedClass.id, studentId: user.id });
      state.selectedClassId = joinedClass.id;
    }
    state.session = { userId: user.id };
  }

  if (form.dataset.form === "class") {
    const name = new FormData(form).get("name").trim();
    const klass = {
      id: uid("class"),
      name,
      instructorId: currentUser().id,
      joinCode: makeJoinCode(name)
    };
    state.classes.push(klass);
    state.selectedClassId = klass.id;
    view = "tasks";
    form.reset();
  }

  if (form.dataset.form === "student") {
    const data = new FormData(form);
    const user = {
      id: uid("student"),
      role: "student",
      name: data.get("name").trim(),
      email: data.get("email").trim()
    };
    state.users.push(user);
    state.memberships.push({ classId: selectedClass().id, studentId: user.id });
    form.reset();
  }

  if (form.dataset.form === "task") {
    const data = new FormData(form);
    const rows = [...form.querySelectorAll("[data-question-row]")];
    const questions = rows.map((row) => {
      const prompt = row.querySelector('[name="prompt"]').value.trim();
      const type = row.querySelector('[name="type"]').value;
      const points = Number(row.querySelector('[name="points"]').value || 1);
      const options = row.querySelector('[name="options"]').value.split(",").map((item) => item.trim()).filter(Boolean);
      return {
        id: uid("q"),
        prompt,
        type,
        points,
        options: type === "multiple" ? options : [],
        correctAnswer: row.querySelector('[name="correctAnswer"]').value.trim()
      };
    });
    state.tasks.push({
      id: uid("task"),
      classId: selectedClass().id,
      title: data.get("title").trim(),
      instructions: data.get("instructions").trim(),
      opensAt: new Date().toISOString(),
      closesAt: new Date(data.get("closesAt")).toISOString(),
      questions
    });
    form.reset();
  }

  if (form.dataset.form === "submission") {
    const task = state.tasks.find((item) => item.id === form.dataset.task);
    if (taskStatus(task) !== "open") return alert("This task is closed.");
    const data = new FormData(form);
    const answers = {};
    task.questions.forEach((question) => {
      answers[question.id] = data.get(question.id) || "";
    });
    state.submissions.push({
      id: uid("sub"),
      taskId: task.id,
      studentId: currentUser().id,
      submittedAt: new Date().toISOString(),
      answers,
      manualScores: {}
    });
  }

  if (form.dataset.form === "grade") {
    const submission = state.submissions.find((item) => item.id === form.dataset.submission);
    submission.manualScores = submission.manualScores || {};
    submission.manualScores[form.dataset.question] = Number(new FormData(form).get("score") || 0);
  }

  saveState();
  route();
});

function exportCsv() {
  const klass = selectedClass();
  const students = classStudents(klass.id);
  const classTasks = state.tasks.filter((task) => task.classId === klass.id);
  const tasks = selectedReportTaskId === "all" ? classTasks : classTasks.filter((task) => task.id === selectedReportTaskId);
  if (!tasks.length) {
    alert("There is no assignment available to export for this class yet.");
    return;
  }
  const rows = [["Class", "Assignment Hosted", "Opens At", "Closes At", "Student", "Email", "Submitted At", "Status", "Score", "Max Points"]];
  tasks.forEach((task) => {
    students.forEach((student) => {
      const submission = getSubmission(task.id, student.id);
      rows.push([
        klass.name,
        task.title,
        task.opensAt,
        task.closesAt,
        student.name,
        student.email,
        submission ? submission.submittedAt : "",
        submission ? "Submitted" : "Missing",
        submission ? autoScore(task, submission) : 0,
        maxPoints(task)
      ]);
    });
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const assignmentPart = selectedReportTaskId === "all" ? "all-assignments" : tasks[0].title;
  link.download = `${slugify(klass.name)}-${slugify(assignmentPart)}-opener-report.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}

route();
