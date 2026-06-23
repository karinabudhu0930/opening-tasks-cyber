"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const BASE_PATH = "/opening-tasks";

type Role = "student" | "instructor";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
};

type ClassRow = {
  id: string;
  instructor_id: string;
  name: string;
  join_code: string;
};

type Membership = {
  id: string;
  class_id: string;
  student_id: string;
};

type Question = {
  id: string;
  prompt: string;
  type: "multiple" | "short";
  points: number;
  options: string[];
  correctAnswer: string;
};

type Task = {
  id: string;
  class_id: string;
  title: string;
  instructions: string | null;
  opens_at: string;
  closes_at: string;
  locked: boolean;
  questions: Question[];
};

type Submission = {
  id: string;
  task_id: string;
  student_id: string;
  answers: Record<string, string>;
  manual_scores: Record<string, number>;
  submitted_at: string;
};

type BuilderQuestion = Omit<Question, "id" | "options"> & { optionsText: string };

const emptyQuestion = (): BuilderQuestion => ({
  prompt: "",
  type: "multiple",
  points: 1,
  optionsText: "",
  correctAnswer: ""
});

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [view, setView] = useState<"tasks" | "students" | "reports">("tasks");
  const [selectedReportTaskId, setSelectedReportTaskId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [creatingClass, setCreatingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [publishingTask, setPublishingTask] = useState(false);
  const [message, setMessage] = useState("");
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestion[]>([emptyQuestion()]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage("Missing Supabase environment variables. Add them in Vercel Project Settings, then redeploy.");
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setClasses([]);
      setMemberships([]);
      setTasks([]);
      setSubmissions([]);
      setStudents([]);
      return;
    }
    loadData(user.id);
  }, [user]);

  const selectedClass = useMemo(
    () => classes.find((klass) => klass.id === selectedClassId) ?? classes[0] ?? null,
    [classes, selectedClassId]
  );

  useEffect(() => {
    if (!selectedClass && classes[0]) setSelectedClassId(classes[0].id);
  }, [classes, selectedClass]);

  async function loadData(userId: string) {
    setLoading(true);
    setMessage("");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profileData) {
      setProfile(null);
      setMessage("Your login exists, but your classroom profile still needs to be completed below.");
      setLoading(false);
      return;
    }

    const typedProfile = profileData as Profile;
    setProfile(typedProfile);

    let classRows: ClassRow[] = [];
    let membershipRows: Membership[] = [];
    let taskRows: Task[] = [];
    let submissionRows: Submission[] = [];
    let studentRows: Profile[] = [];

    if (typedProfile.role === "instructor") {
      const { data: classData } = await supabase.from("classes").select("*").eq("instructor_id", userId).order("created_at");
      classRows = (classData ?? []) as ClassRow[];
      const classIds = classRows.map((item) => item.id);

      if (classIds.length) {
        const { data: membershipData } = await supabase.from("memberships").select("*").in("class_id", classIds);
        membershipRows = (membershipData ?? []) as Membership[];
        const studentIds = [...new Set(membershipRows.map((item) => item.student_id))];
        if (studentIds.length) {
          const { data: studentData } = await supabase.from("profiles").select("*").in("id", studentIds).order("full_name");
          studentRows = (studentData ?? []) as Profile[];
        }
        const { data: taskData } = await supabase.from("opening_tasks").select("*").in("class_id", classIds).order("opens_at");
        taskRows = (taskData ?? []) as Task[];
        const taskIds = taskRows.map((task) => task.id);
        if (taskIds.length) {
          const { data: submissionData } = await supabase.from("submissions").select("*").in("task_id", taskIds);
          submissionRows = (submissionData ?? []) as Submission[];
        }
      }
    } else {
      const { data: membershipData } = await supabase.from("memberships").select("*").eq("student_id", userId);
      membershipRows = (membershipData ?? []) as Membership[];
      const classIds = membershipRows.map((item) => item.class_id);
      if (classIds.length) {
        const { data: classData } = await supabase.from("classes").select("*").in("id", classIds).order("created_at");
        classRows = (classData ?? []) as ClassRow[];
        const { data: taskData } = await supabase.from("opening_tasks").select("*").in("class_id", classIds).order("opens_at");
        taskRows = (taskData ?? []) as Task[];
        const { data: submissionData } = await supabase.from("submissions").select("*").eq("student_id", userId);
        submissionRows = (submissionData ?? []) as Submission[];
      }
    }

    setClasses(classRows);
    setMemberships(membershipRows);
    setTasks(taskRows);
    setSubmissions(submissionRows);
    setStudents(studentRows);
    if (!selectedClassId && classRows[0]) setSelectedClassId(classRows[0].id);
    setLoading(false);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const role = String(form.get("role")) as Role;
    const joinCode = String(form.get("joinCode")).trim().toUpperCase();

    const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
    if (error || !signUpData.user) {
      setMessage(error?.message ?? "Could not create account.");
      return;
    }

    const profilePayload = {
      id: signUpData.user.id,
      email,
      full_name: fullName,
      role
    };

    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, {
      onConflict: "id"
    });
    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    if (role === "student") {
      const { data } = await supabase.from("classes").select("*").eq("join_code", joinCode).maybeSingle();
      if (!data) {
        setMessage("Account created, but the class join code was not found. Ask your instructor for the correct code, then sign in.");
        return;
      }
      const joinedClass = data as ClassRow;
      const { error: membershipError } = await supabase.from("memberships").insert({
        class_id: joinedClass.id,
        student_id: signUpData.user.id
      });
      if (membershipError) {
        setMessage(membershipError.message);
        return;
      }
    }

    setMessage("Account created. If email confirmation is enabled in Supabase, confirm your email before signing in.");
  }

  async function completeProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email) return;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name")).trim();
    const role = String(form.get("role")) as Role;
    const joinCode = String(form.get("joinCode")).trim().toUpperCase();

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      role
    }, {
      onConflict: "id"
    });

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    if (role === "student") {
      const { data } = await supabase.from("classes").select("*").eq("join_code", joinCode).maybeSingle();
      if (!data) {
        setMessage("Profile created, but the class join code was not found. Ask your instructor for the correct code.");
        await loadData(user.id);
        return;
      }
      const { error: membershipError } = await supabase.from("memberships").insert({
        class_id: (data as ClassRow).id,
        student_id: user.id
      });
      if (membershipError) {
        setMessage(membershipError.message);
        return;
      }
    }

    await loadData(user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setMessage("Please complete your instructor profile before creating a class.");
      return;
    }
    setCreatingClass(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    if (!name) {
      setMessage("Please enter a class name.");
      setCreatingClass(false);
      return;
    }
    let data: ClassRow | null = null;
    let error: { message: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const joinCode = makeJoinCode(name);
      const result = await supabase.from("classes").insert({
        instructor_id: profile.id,
        name,
        join_code: joinCode
      }).select("*").single();

      data = result.data as ClassRow | null;
      error = result.error;
      if (!error || error.code !== "23505") break;
    }

    if (error) setMessage(error.message);
    else if (data) {
      event.currentTarget.reset();
      setSelectedClassId(data.id);
      setMessage(`Class created. Join code: ${data.join_code}`);
      await loadData(profile.id);
    } else {
      setMessage("The class could not be created. Please try again.");
    }
    setCreatingClass(false);
  }

  async function deleteSelectedClass() {
    if (!profile || !selectedClass) return;
    const confirmed = window.confirm(`Delete ${selectedClass.name}? This also removes its opening tasks, submissions, memberships, and reports.`);
    if (!confirmed) return;

    setDeletingClass(true);
    const deletedClassId = selectedClass.id;
    const { data, error } = await supabase.from("classes").delete().eq("id", deletedClassId).select("id");
    if (error) setMessage(error.message);
    else if (!data?.length) {
      setMessage("Class was not deleted. Run the Supabase class delete policy SQL, then try again.");
    }
    else {
      const nextClass = classes.find((klass) => klass.id !== deletedClassId);
      setClasses(classes.filter((klass) => klass.id !== deletedClassId));
      setTasks(tasks.filter((task) => task.class_id !== deletedClassId));
      setMemberships(memberships.filter((membership) => membership.class_id !== deletedClassId));
      setSelectedClassId(nextClass?.id ?? "");
      setSelectedReportTaskId("all");
      setView("tasks");
      setMessage("Class deleted.");
      await loadData(profile.id);
    }
    setDeletingClass(false);
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || !profile) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const { data } = await supabase.from("profiles").select("*").eq("email", email).eq("role", "student").maybeSingle();
    if (!data) {
      setMessage("That student needs to create an account first, then you can add them by email.");
      return;
    }
    const { error } = await supabase.from("memberships").insert({
      class_id: selectedClass.id,
      student_id: (data as Profile).id
    });
    if (error) setMessage(error.message);
    else {
      event.currentTarget.reset();
      await loadData(profile.id);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || !profile) return;
    setPublishingTask(true);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const closeDate = String(form.get("closeDate"));
    const closeTime = String(form.get("closeTime"));
    const closesAt = parseLocalDateAndTime(closeDate, closeTime);
    if (!title) {
      setMessage("Please enter a task title.");
      setPublishingTask(false);
      return;
    }
    if (!closeDate || !closeTime || !closesAt) {
      setMessage("Please choose a valid close date and close time before publishing.");
      setPublishingTask(false);
      return;
    }
    if (closesAt.getTime() <= Date.now()) {
      setMessage("Please choose a close date and time in the future.");
      setPublishingTask(false);
      return;
    }
    const questions = builderQuestions.map(({ optionsText, ...question }) => ({
      ...question,
      prompt: question.prompt.trim(),
      correctAnswer: question.correctAnswer.trim(),
      id: crypto.randomUUID(),
      options: question.type === "multiple" ? optionsText.split(",").map((item) => item.trim()).filter(Boolean) : []
    }));
    if (questions.some((question) => !question.prompt)) {
      setMessage("Please enter a prompt for every question.");
      setPublishingTask(false);
      return;
    }
    if (questions.some((question) => question.type === "multiple" && (!question.correctAnswer.trim() || question.options.length < 2))) {
      setMessage("Multiple choice questions need at least two options and a correct answer.");
      setPublishingTask(false);
      return;
    }
    if (questions.some((question) => question.type === "multiple" && !question.options.includes(question.correctAnswer))) {
      setMessage("For multiple choice, the correct answer must match one of the options exactly.");
      setPublishingTask(false);
      return;
    }

    const { error } = await supabase.from("opening_tasks").insert({
      class_id: selectedClass.id,
      title,
      instructions: String(form.get("instructions")).trim(),
      opens_at: new Date().toISOString(),
      closes_at: closesAt.toISOString(),
      locked: false,
      questions
    });

    if (error) setMessage(error.message);
    else {
      event.currentTarget.reset();
      setBuilderQuestions([emptyQuestion()]);
      setMessage("Opening task published.");
      await loadData(profile.id);
    }
    setPublishingTask(false);
  }

  async function submitTask(event: FormEvent<HTMLFormElement>, task: Task) {
    event.preventDefault();
    if (!profile || taskStatus(task) !== "open") return;
    const form = new FormData(event.currentTarget);
    const answers = Object.fromEntries(task.questions.map((question) => [question.id, String(form.get(question.id) ?? "")]));
    const { error } = await supabase.from("submissions").insert({
      task_id: task.id,
      student_id: profile.id,
      answers,
      manual_scores: {}
    });
    if (error) setMessage(error.message);
    else await loadData(profile.id);
  }

  async function setTaskLock(task: Task, locked: boolean) {
    if (!profile) return;
    const { error } = await supabase.from("opening_tasks").update({ locked }).eq("id", task.id);
    if (error) setMessage(error.message);
    else {
      setMessage(locked ? "Opening task locked." : "Opening task unlocked.");
      await loadData(profile.id);
    }
  }

  async function saveGrade(event: FormEvent<HTMLFormElement>, submissionId: string, questionId: string) {
    event.preventDefault();
    if (!profile) return;
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) return;
    const score = Number(new FormData(event.currentTarget).get("score") ?? 0);
    const manual_scores = { ...submission.manual_scores, [questionId]: score };
    const { error } = await supabase.from("submissions").update({ manual_scores }).eq("id", submissionId);
    if (error) setMessage(error.message);
    else await loadData(profile.id);
  }

  const goHome = () => {
    setView("tasks");
    setSelectedReportTaskId("all");
    setMessage("");
  };

  if (loading) return renderFrame(<main className="main"><section className="panel">Loading...</section></main>, profile, signOut, goHome);
  if (!user) {
    if (authView === "register") {
      return renderRegister(register, message, () => {
        setMessage("");
        setAuthView("login");
      });
    }
    return renderLogin(signIn, message, () => {
      setMessage("");
      setAuthView("register");
    });
  }
  if (!profile) return renderFrame(renderCompleteProfile(user.email ?? "", completeProfile, message), null, signOut, goHome);
  if (profile.role === "student") return renderFrame(renderStudent(profile), profile, signOut, goHome);
  return renderFrame(renderInstructor(), profile, signOut, goHome);

  function renderInstructor() {
    if (!selectedClass) {
      return (
        <main className="main">
          <section className="panel stack">
            <h2>Create Your First Class</h2>
            {message && <div className="alert">{message}</div>}
            <ClassForm onSubmit={createClass} creating={creatingClass} />
          </section>
        </main>
      );
    }

    return (
      <main className="main layout">
        <aside className="panel sidebar stack">
          <div>
            <h3>{selectedClass.name}</h3>
            <p className="muted">Join code: <b>{selectedClass.join_code}</b></p>
          </div>
          <label className="field">
            <span>Class</span>
            <select value={selectedClass.id} onChange={(event) => {
              setSelectedClassId(event.target.value);
              setSelectedReportTaskId("all");
            }}>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
            </select>
          </label>
          <details className="class-tools">
            <summary>New class</summary>
            <ClassForm onSubmit={createClass} creating={creatingClass} />
          </details>
          <button className="btn danger" type="button" onClick={deleteSelectedClass} disabled={deletingClass}>
            {deletingClass ? "Deleting..." : "Delete class"}
          </button>
          <nav className="tabs">
            {(["tasks", "students", "reports"] as const).map((tab) => (
              <button className={`tab ${view === tab ? "active" : ""}`} key={tab} onClick={() => setView(tab)}>
                {tab === "tasks" ? "Opening Tasks" : tab[0].toUpperCase() + tab.slice(1)} <span>›</span>
              </button>
            ))}
          </nav>
        </aside>
        <section className="stack">
          {message && <div className="alert">{message}</div>}
          {view === "tasks" && renderTasksPanel()}
          {view === "students" && renderStudentsPanel()}
          {view === "reports" && renderReportsPanel()}
        </section>
      </main>
    );
  }

  function renderTasksPanel() {
    const classTasks = tasks.filter((task) => task.class_id === selectedClass?.id);
    return (
      <>
        <section className="panel stack">
          <h2>Opening Tasks</h2>
          <p className="muted">Create questions, set close times, and grade short answers after students submit.</p>
          <form className="stack" onSubmit={createTask} noValidate>
            <div className="grid">
              <label className="field"><span>Task title</span><input className="input" name="title" required /></label>
              <label className="field"><span>Close date</span><input className="input" name="closeDate" type="date" defaultValue={defaultCloseDate()} required /></label>
              <label className="field"><span>Close time</span><input className="input" name="closeTime" type="time" defaultValue={defaultCloseTime(15)} required /></label>
            </div>
            <label className="field"><span>Instructions</span><textarea name="instructions" /></label>
            {builderQuestions.map((question, index) => (
              <div className="question" key={index}>
                <div className="row">
                  <strong>Question {index + 1}</strong>
                  <button className="btn secondary" type="button" onClick={() => setBuilderQuestions(builderQuestions.filter((_, itemIndex) => itemIndex !== index))} disabled={builderQuestions.length === 1}>Remove</button>
                </div>
                <label className="field"><span>Prompt</span><textarea value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} required /></label>
                <div className="grid">
                  <label className="field"><span>Type</span><select value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as Question["type"] })}><option value="multiple">Multiple choice</option><option value="short">Short answer</option></select></label>
                  <label className="field"><span>Points</span><input className="input" type="number" min="1" value={question.points} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} /></label>
                </div>
                <label className="field"><span>Options for multiple choice, separated by commas</span><input className="input" value={question.optionsText} onChange={(event) => updateQuestion(index, { optionsText: event.target.value })} /></label>
                <label className="field"><span>Correct answer for multiple choice</span><input className="input" value={question.correctAnswer} onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })} /></label>
              </div>
            ))}
            <div className="btn-row">
              <button className="btn secondary" type="button" onClick={() => setBuilderQuestions([...builderQuestions, emptyQuestion()])}>Add question</button>
              <button className="btn" type="submit" disabled={publishingTask}>{publishingTask ? "Publishing..." : "Publish task"}</button>
            </div>
          </form>
        </section>
        <section className="panel stack">
          <h3>Current Tasks</h3>
          {classTasks.length ? classTasks.map((task) => <TaskSummary key={task.id} task={task} students={classStudents()} submissions={submissions} onLockChange={setTaskLock} />) : <div className="empty">No tasks yet.</div>}
        </section>
      </>
    );
  }

  function renderStudentsPanel() {
    const roster = classStudents();
    return (
      <section className="panel stack">
        <h2>Students</h2>
        <p className="muted">Students can join with code <b>{selectedClass?.join_code}</b>, or you can add an existing student by email.</p>
        <form className="grid" onSubmit={addStudent}>
          <label className="field"><span>Student email</span><input className="input" name="email" type="email" required /></label>
          <button className="btn" type="submit">Add student</button>
        </form>
        <Table headers={["Name", "Email"]} rows={roster.map((student) => [student.full_name, student.email])} />
      </section>
    );
  }

  function renderReportsPanel() {
    const classTasks = tasks.filter((task) => task.class_id === selectedClass?.id);
    const reportTasks = selectedReportTaskId === "all" ? classTasks : classTasks.filter((task) => task.id === selectedReportTaskId);
    const roster = classStudents();
    const totalSlots = reportTasks.length * roster.length;
    const submittedCount = reportTasks.reduce((sum, task) => sum + roster.filter((student) => getSubmission(task.id, student.id)).length, 0);
    const percents = reportTasks.flatMap((task) => roster.map((student) => {
      const submission = getSubmission(task.id, student.id);
      return submission ? (autoScore(task, submission) / maxPoints(task)) * 100 : null;
    })).filter((item): item is number => item !== null);
    const avg = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0;
    const visibleTask = selectedReportTaskId === "all" ? classTasks[classTasks.length - 1] : reportTasks[0];

    return (
      <section className="panel stack">
        <div className="row">
          <div>
            <h2>Reports</h2>
            <p className="muted">Choose a class assignment, then export a CSV for that specific hosted opening task or the full class report.</p>
          </div>
          <button className="btn secondary" onClick={() => exportCsv(reportTasks, roster)}>Download CSV Report</button>
        </div>
        <label className="field">
          <span>Assignment hosted</span>
          <select value={selectedReportTaskId} onChange={(event) => setSelectedReportTaskId(event.target.value)}>
            <option value="all">All hosted assignments for {selectedClass?.name}</option>
            {classTasks.map((task) => <option key={task.id} value={task.id}>{task.title} · {formatDate(task.opens_at)}</option>)}
          </select>
        </label>
        <div className="metrics">
          <div className="metric"><b>{reportTasks.length}</b><span className="muted">Assignments</span></div>
          <div className="metric"><b>{roster.length}</b><span className="muted">Students</span></div>
          <div className="metric"><b>{submittedCount}/{totalSlots}</b><span className="muted">Submissions</span></div>
          <div className="metric"><b>{avg}%</b><span className="muted">Average</span></div>
        </div>
        {visibleTask ? renderGradingTable(visibleTask, roster) : <div className="empty">Create a task to see reporting.</div>}
      </section>
    );
  }

  function renderGradingTable(task: Task, roster: Profile[]) {
    return (
      <div className="stack">
        <h3>Grade: {task.title}</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Status</th><th>Score</th><th>Answers</th><th>Short Answer Grade</th></tr></thead>
            <tbody>
              {roster.map((student) => {
                const submission = getSubmission(task.id, student.id);
                if (!submission) return <tr key={student.id}><td>{student.full_name}</td><td>Missing</td><td>0/{maxPoints(task)}</td><td /><td /></tr>;
                return (
                  <tr key={student.id}>
                    <td>{student.full_name}</td>
                    <td>Submitted {formatDate(submission.submitted_at)}</td>
                    <td>{autoScore(task, submission)}/{maxPoints(task)}</td>
                    <td>{task.questions.map((question) => <div className="answer-block" key={question.id}><b>{question.prompt}</b><br />{submission.answers[question.id] || ""}</div>)}</td>
                    <td>{task.questions.filter((question) => question.type === "short").map((question) => (
                      <form className="btn-row" key={question.id} onSubmit={(event) => saveGrade(event, submission.id, question.id)}>
                        <input className="input" name="score" type="number" min="0" max={question.points} defaultValue={submission.manual_scores?.[question.id] ?? 0} />
                        <button className="btn secondary" type="submit">Save</button>
                      </form>
                    ))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderStudent(activeProfile: Profile) {
    const activeTask = tasks.find((task) => taskStatus(task) === "open" && !getSubmission(task.id, activeProfile.id));
    const completed = tasks
      .filter((task) => getSubmission(task.id, activeProfile.id))
      .sort((first, second) => {
        const firstSubmission = getSubmission(first.id, activeProfile.id);
        const secondSubmission = getSubmission(second.id, activeProfile.id);
        return new Date(secondSubmission?.submitted_at ?? 0).getTime() - new Date(firstSubmission?.submitted_at ?? 0).getTime();
      });
    return (
      <main className="main stack">
        {message && <div className="alert">{message}</div>}
        {activeTask ? (
          <form className="panel stack" onSubmit={(event) => submitTask(event, activeTask)}>
            <div className="row">
              <div><h2>{activeTask.title}</h2><p className="muted">Closes {formatDate(activeTask.closes_at)}</p></div>
              <span className={`pill ${taskStatus(activeTask)}`}>{statusLabel(taskStatus(activeTask))}</span>
            </div>
            <p>{activeTask.instructions}</p>
            {activeTask.questions.map((question, index) => (
              <div className="question student-question" key={question.id}>
                <div className="question-prompt">
                  <span className="question-number">Question {index + 1}</span>
                  <strong>{question.prompt}</strong>
                  <span className="question-points">{question.points} {question.points === 1 ? "point" : "points"}</span>
                </div>
                {question.type === "multiple" ? (
                  <div className="option-list">
                    {question.options.map((option) => (
                      <label className="option-row" key={option}>
                        <input type="radio" name={question.id} value={option} required />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : <textarea className="student-answer" name={question.id} aria-label={`Answer for question ${index + 1}`} required />}
              </div>
            ))}
            <button className="btn" type="submit">Submit opening task</button>
          </form>
        ) : <section className="panel stack"><h2>No open task right now</h2><p className="muted">When your instructor opens a task, it will appear here until the close time.</p></section>}
        <section className="panel stack">
          <h3>Your Submissions</h3>
          {completed.length ? completed.map((task) => {
            const submission = getSubmission(task.id, activeProfile.id);
            if (!submission) return null;
            const score = autoScore(task, submission);
            const total = maxPoints(task);
            const hasPendingGrades = task.questions.some((question) => (
              question.type === "short" && !Object.prototype.hasOwnProperty.call(submission.manual_scores ?? {}, question.id)
            ));
            return (
              <details className="question submission-card" key={task.id}>
                <summary className="submission-summary">
                  <span>
                    <strong>{task.title}</strong>
                    <span className="muted submission-date">Submitted {formatDate(submission.submitted_at)}</span>
                  </span>
                  <span className="submission-score">
                    <strong>{score}/{total}</strong>
                    <span>{total ? Math.round((score / total) * 100) : 0}%</span>
                  </span>
                </summary>
                <div className="submission-details stack">
                  {hasPendingGrades && <div className="grading-note">Short-answer grading is still pending. Your total may change.</div>}
                  {task.questions.map((question, index) => {
                    const earned = questionScore(question, submission);
                    return (
                      <div className="submitted-answer" key={question.id}>
                        <div className="submitted-answer-heading">
                          <strong>{index + 1}. {question.prompt}</strong>
                          <span>{earned}/{question.points} points</span>
                        </div>
                        <div className="muted">Your answer</div>
                        <div className="answer-value">{submission.answers[question.id] || "No answer recorded"}</div>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          }) : <div className="empty">No submissions yet.</div>}
        </section>
      </main>
    );
  }

  function classStudents() {
    const ids = memberships.filter((item) => item.class_id === selectedClass?.id).map((item) => item.student_id);
    return students.filter((student) => ids.includes(student.id));
  }

  function getSubmission(taskId: string, studentId: string) {
    return submissions.find((submission) => submission.task_id === taskId && submission.student_id === studentId);
  }

  function updateQuestion(index: number, patch: Partial<BuilderQuestion>) {
    setBuilderQuestions(builderQuestions.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  function exportCsv(reportTasks: Task[], roster: Profile[]) {
    if (!selectedClass || !reportTasks.length) {
      setMessage("There is no assignment available to export for this class yet.");
      return;
    }
    const rows = [["Class", "Assignment Hosted", "Opens At", "Closes At", "Student", "Email", "Submitted At", "Status", "Score", "Max Points"]];
    reportTasks.forEach((task) => {
      roster.forEach((student) => {
        const submission = getSubmission(task.id, student.id);
        rows.push([
          selectedClass.name,
          task.title,
          task.opens_at,
          task.closes_at,
          student.full_name,
          student.email,
          submission ? submission.submitted_at : "",
          submission ? "Submitted" : "Missing",
          String(submission ? autoScore(task, submission) : 0),
          String(maxPoints(task))
        ]);
      });
    });
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const assignmentPart = selectedReportTaskId === "all" ? "all-assignments" : reportTasks[0].title;
    link.href = url;
    link.download = `${slugify(selectedClass.name)}-${slugify(assignmentPart)}-opener-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

function renderFrame(children: ReactNode, profile: Profile | null, signOut: () => void, goHome: () => void) {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <button className="brand-home-button" type="button" onClick={goHome} title="Home">
            <img className="brand-logo" src={`${BASE_PATH}/soc-logo.png`} alt="SOC logo" />
            <span className="brand-copy">
              <h1>Opening Tasks - Cyber Security</h1>
              <span>Ms. Budhu</span>
            </span>
          </button>
        </div>
        {profile && (
          <div className="top-actions">
            <span className="muted">{profile.full_name} · {profile.role}</span>
            <button className="btn secondary sign-out-btn" onClick={signOut}>Sign out</button>
          </div>
        )}
      </header>
      {children}
    </>
  );
}

function renderLogin(
  signIn: (event: FormEvent<HTMLFormElement>) => void,
  message: string,
  showRegister: () => void
) {
  return (
    <main className="auth-page">
      <section className="auth-copy-panel">
        <div className="hero-title">
          <img className="hero-logo" src={`${BASE_PATH}/soc-logo.png`} alt="SOC logo" />
          <div>
            <h2>Opening Tasks - Cyber Security</h2>
            <span>Ms. Budhu</span>
          </div>
        </div>
        <p>On the respective days please submit and complete the opening task assignment as posted. Your cumulative grade will be a reflection at the end of your marking period of your opening task submissions under &quot;Formative Assignments - Opening Tasks&quot; within your gradebook.</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card-shell">
          <div className="auth-heading">
            <h1>Welcome back</h1>
            <p>Please enter your details</p>
          </div>

          {message && <div className="alert">{message}</div>}
          <form className="auth-form" onSubmit={signIn}>
            <label className="field"><span>Email address</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
            <label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
            <button className="btn" type="submit">Sign in</button>
          </form>

          <p className="auth-switch">Don&apos;t have an account? <button type="button" onClick={showRegister}>Sign up</button></p>
        </div>
      </section>
    </main>
  );
}

function renderRegister(
  register: (event: FormEvent<HTMLFormElement>) => void,
  message: string,
  showLogin: () => void
) {
  return (
    <main className="auth-page register-page">
      <section className="auth-copy-panel">
        <div className="hero-title">
          <img className="hero-logo" src={`${BASE_PATH}/soc-logo.png`} alt="SOC logo" />
          <div>
            <h2>Create your account</h2>
            <span>Opening Tasks - Cyber Security</span>
          </div>
        </div>
        <p>Students can create an account with their class join code. Instructors can create an instructor account and set up classes after signing in.</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card-shell">
          <div className="auth-heading">
            <h1>Sign up</h1>
            <p>Create your classroom account</p>
          </div>

          {message && <div className="alert">{message}</div>}
          <form className="auth-form" onSubmit={register}>
            <label className="field"><span>Name</span><input className="input" name="name" autoComplete="name" required /></label>
            <label className="field"><span>Role</span><select name="role"><option value="student">Student</option><option value="instructor">Instructor</option></select></label>
            <label className="field"><span>Email address</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
            <label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
            <label className="field"><span>Class join code</span><input className="input" name="joinCode" placeholder="Students enter teacher code, e.g. CYBR42" /></label>
            <button className="btn" type="submit">Create and sign in</button>
          </form>

          <p className="auth-switch">Already have an account? <button type="button" onClick={showLogin}>Sign in</button></p>
        </div>
      </section>
    </main>
  );
}

function renderCompleteProfile(
  email: string,
  completeProfile: (event: FormEvent<HTMLFormElement>) => void,
  message: string
) {
  return (
    <main className="main">
      <section className="panel stack">
        <h2>Complete Your Account</h2>
        <p className="muted">Your login exists for {email}, but the classroom profile still needs to be created.</p>
        {message && <div className="alert">{message}</div>}
        <form className="stack" onSubmit={completeProfile}>
          <div className="grid">
            <label className="field"><span>Name</span><input className="input" name="name" required /></label>
            <label className="field"><span>Role</span><select name="role"><option value="student">Student</option><option value="instructor">Instructor</option></select></label>
          </div>
          <label className="field"><span>Class join code</span><input className="input" name="joinCode" placeholder="Students enter teacher code" /></label>
          <div className="btn-row">
            <button className="btn" type="submit">Continue</button>
          </div>
        </form>
      </section>
    </main>
  );
}

function ClassForm({ onSubmit, creating }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; creating: boolean }) {
  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <label className="field"><span>Class name</span><input className="input" name="name" required placeholder="Period 1 Cyber Security" /></label>
      <button className="btn" type="submit" disabled={creating}>{creating ? "Creating..." : "Create class"}</button>
    </form>
  );
}

function TaskSummary({
  task,
  students,
  submissions,
  onLockChange
}: {
  task: Task;
  students: Profile[];
  submissions: Submission[];
  onLockChange: (task: Task, locked: boolean) => void;
}) {
  const submitted = students.filter((student) => submissions.some((submission) => submission.task_id === task.id && submission.student_id === student.id)).length;
  const status = taskStatus(task);
  return (
    <article className="question">
      <div className="row">
        <div><strong>{task.title}</strong><div className="muted">{formatDate(task.opens_at)} to {formatDate(task.closes_at)}</div></div>
        <span className={`pill ${status}`}>{statusLabel(status)}</span>
      </div>
      <div className="muted">{task.questions.length} questions · {submitted}/{students.length} submitted · {maxPoints(task)} points</div>
      <div className="btn-row">
        <button className="btn secondary" type="button" onClick={() => onLockChange(task, true)} disabled={task.locked}>Lock</button>
        <button className="btn secondary" type="button" onClick={() => onLockChange(task, false)} disabled={!task.locked}>Unlock</button>
      </div>
    </article>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function taskStatus(task: Task) {
  const now = Date.now();
  if (task.locked) return "locked";
  if (now < new Date(task.opens_at).getTime()) return "waiting";
  if (now > new Date(task.closes_at).getTime()) return "closed";
  return "open";
}

function statusLabel(status: string) {
  if (status === "locked") return "Locked";
  return status === "open" ? "Open" : status === "closed" ? "Closed" : "Upcoming";
}

function maxPoints(task: Task) {
  return task.questions.reduce((sum, question) => sum + Number(question.points || 1), 0);
}

function autoScore(task: Task, submission: Submission) {
  return task.questions.reduce((score, question) => score + questionScore(question, submission), 0);
}

function questionScore(question: Question, submission: Submission) {
  if (question.type === "multiple" && submission.answers[question.id] === question.correctAnswer) return Number(question.points || 1);
  if (question.type === "short") return Number(submission.manual_scores?.[question.id] || 0);
  return 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function defaultCloseDate() {
  return toDateValue(new Date(Date.now() + 15 * 60 * 1000));
}

function defaultCloseTime(minutesFromNow: number) {
  const value = new Date(Date.now() + minutesFromNow * 60 * 1000);
  value.setSeconds(0, 0);
  return toTimeValue(value);
}

function toDateValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toTimeValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function parseLocalDateAndTime(dateValue: string, timeValue: string) {
  const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function makeJoinCode(name: string) {
  const base = name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "CYBR";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}
