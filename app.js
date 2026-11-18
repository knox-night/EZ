const SUPABASE_URL = "https://pxettzglcudocjzyzvzd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zYMmahOa_OmlYcanFyaBTQ_WRqZeVJs";
const ENABLE_GOOGLE = true;
const supabaseClient = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const pageLabels = {
  landing: "OVERVIEW",
  dashboard: "MISSION CONTROL",
  missions: "MISSION BOARD",
  create: "CREATE MISSION"
};
const sampleMissions = [
  {
    id: "orbit",
    kind: "sample",
    company: "Orbit Notes",
    sector: "Productivity · Example",
    title: "Find your focus flow",
    description: "Can a calmer notes app make daily planning feel effortless?",
    type: "Mobile app",
    duration: "12 min",
    reward: 10,
    logo: "O",
    tone: "",
    spots: 8,
    audience: "People who plan their work with notes",
    brief: "Explore Orbit Notes on a short planning task. Capture an idea, organize it, and find it again. Tell the team what feels natural and where you had to stop and think.",
    goal: "Complete a 3-step planning flow",
    feedback: "What felt clear, and where did you get stuck?",
    platform: "iOS · TestFlight"
  },
  {
    id: "luma",
    kind: "sample",
    company: "Luma Goods",
    sector: "Commerce · Example",
    title: "A smoother way to shop",
    description: "Help shape a more thoughtful checkout for everyday essentials.",
    type: "Website",
    duration: "8 min",
    reward: 10,
    logo: "L",
    tone: "violet",
    spots: 12,
    audience: "People shopping for everyday essentials",
    brief: "Browse a small collection, add an item to your bag, and move through checkout. Is it easy to find essentials and are the final steps clear?",
    goal: "Browse and try a sample checkout",
    feedback: "Was the checkout understandable and easy to complete?",
    platform: "Web · Desktop or mobile"
  },
  {
    id: "pulse",
    kind: "sample",
    company: "Pulse Budget",
    sector: "Personal finance · Example",
    title: "Make money feel simple",
    description: "A fresh approach to everyday budgeting.",
    type: "Prototype",
    duration: "15 min",
    reward: 10,
    logo: "P",
    tone: "blue",
    spots: 5,
    audience: "People who want a clearer monthly budget",
    brief: "Use a clickable prototype to set a monthly goal and review a spending snapshot. Share what you expected and anything that felt unclear.",
    goal: "Set a goal in the prototype",
    feedback: "What did you expect the budget summary to show?",
    platform: "Web · Clickable prototype"
  },
  {
    id: "frame",
    kind: "sample",
    company: "Frameflow",
    sector: "Creative tools · Example",
    title: "Your canvas, in motion",
    description: "Try a new way to collect references and build a moodboard.",
    type: "Website",
    duration: "10 min",
    reward: 10,
    logo: "F",
    tone: "orange",
    spots: 9,
    audience: "Designers collecting visual references",
    brief: "Start a moodboard from sample images. Add, move, and group things on the canvas. The team wants to know where you get stuck.",
    goal: "Create a small moodboard",
    feedback: "Which canvas actions were difficult to discover?",
    platform: "Web · Desktop"
  },
  {
    id: "atlas",
    kind: "sample",
    company: "Atlas Weekends",
    sector: "Travel · Example",
    title: "Plan a local escape",
    description: "Turn a free Saturday into a small adventure.",
    type: "Mobile app",
    duration: "9 min",
    reward: 10,
    logo: "A",
    tone: "pink",
    spots: 6,
    audience: "People looking for nearby weekend activities",
    brief: "Explore nearby day trips and save one. Is it easy to find a plan that fits your time and interests?",
    goal: "Find and save a weekend plan",
    feedback: "Did the plan match the time and interests you selected?",
    platform: "iOS · Prototype"
  },
  {
    id: "moss",
    kind: "sample",
    company: "Moss & Main",
    sector: "Wellness · Example",
    title: "A gentler start to the day",
    description: "Refine a new morning routine app for a small wellness studio.",
    type: "Prototype",
    duration: "7 min",
    reward: 10,
    logo: "M",
    tone: "teal",
    spots: 14,
    audience: "People exploring short morning routines",
    brief: "Take a first look at a guided morning routine. Try the opening screen and one short breathing exercise, then share your first impressions.",
    goal: "Try the intro and one exercise",
    feedback: "How did the opening instructions feel?",
    platform: "Web · Mobile prototype"
  }
];

let userMissions = [];
let currentUser = null;
let activeFilter = "All";
let sortMode = "newest";
let toastTimeout;

const authScreen = document.getElementById("auth-screen");
const authError = document.getElementById("auth-error");
const loginGithub = document.getElementById("login-github");
const loginGoogle = document.getElementById("login-google");
const guestButton = document.getElementById("guest");
const userBox = document.querySelector(".sidefoot .profile");
const dialog = document.getElementById("dialog");
const createForm = document.getElementById("create-form");

function clearLegacyBrowserData() {
  try {
    localStorage.removeItem("ez-progress");
    localStorage.removeItem("ez-user-missions");
  } catch (error) {
    console.warn("Could not clear previous demo data", error);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function getVisibleMissions() {
  const ownedPreviews = currentUser
    ? userMissions.filter(mission => mission.ownerId === currentUser.id)
    : [];
  return [...sampleMissions, ...ownedPreviews];
}

function missionCard(mission) {
  const isPreview = mission.kind === "preview";
  const canDelete = isPreview && currentUser && mission.ownerId === currentUser.id;
  const spotLabel = mission.spots > 0
    ? `${mission.spots} spots listed`
    : "No spots available";
  const sourceLabel = isPreview ? "PREVIEW ONLY" : "SAMPLE ONLY";
  const actionLabel = mission.spots > 0
    ? (isPreview ? "OPEN PREVIEW ↗" : "VIEW SAMPLE ↗")
    : "NO SPOTS AVAILABLE";

  return `<article class="mission-card">
    <div class="mission-top">
      <div class="mbrand">
        <i class="logo ${escapeHtml(mission.tone)}">${escapeHtml(mission.logo)}</i>
        <span><b class="company">${escapeHtml(mission.company)}</b><small class="sector">${escapeHtml(mission.sector)}</small></span>
      </div>
      <b class="reward">✳ ${escapeHtml(mission.reward)} DEMO CR</b>
    </div>
    <div class="mission-source-badge">${sourceLabel}</div>
    <h3 class="mission-title">${escapeHtml(mission.title)}</h3>
    <p class="mission-desc">${escapeHtml(mission.description)}</p>
    <div class="mission-meta">
      <small class="tag">${escapeHtml(mission.type)}</small>
      <span class="duration">◷ &nbsp;${escapeHtml(mission.duration)}</span>
    </div>
    <div class="mission-bottom">
      <span class="spots">${escapeHtml(spotLabel)}</span>
      ${canDelete ? `<button class="mission-delete" data-delete="${escapeHtml(mission.id)}">DELETE PREVIEW</button>` : ""}
      <button class="mission-action" data-open="${escapeHtml(mission.id)}" ${mission.spots <= 0 ? "disabled" : ""}>${actionLabel}</button>
    </div>
  </article>`;
}

function renderCreditStatus() {
  document.getElementById("balance").textContent = "—";
  document.getElementById("wallet").textContent = "Demo only";
}

function render() {
  const missions = getVisibleMissions();
  const featured = missions.slice(0, 2);
  const filtered = activeFilter === "All"
    ? missions
    : missions.filter(mission => mission.type === activeFilter);
  const sorted = sortMode === "newest"
    ? filtered
    : filtered.slice().sort((first, second) => second.reward - first.reward);

  document.getElementById("featured").innerHTML = featured.map(missionCard).join("");
  document.getElementById("all").innerHTML = sorted.length
    ? sorted.map(missionCard).join("")
    : '<p class="mvp-empty">No mission previews in this category.</p>';
  document.getElementById("sort-label").textContent = sortMode === "newest"
    ? "NEWEST PREVIEWS"
    : "HIGHEST SAMPLE REWARD";

  const count = String(missions.length).padStart(2, "0");
  document.getElementById("nav-count").textContent = count;
  document.getElementById("open-count").textContent = count;
  document.getElementById("filter-count").textContent = count;
  document.getElementById("total-count").textContent = count;
  renderCreditStatus();
}

function navigate(pageName) {
  if (pageName === "create" && !currentUser) {
    requireSignedInToCreate();
    return;
  }

  const wasLanding = document.body.classList.contains("is-landing");
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("show", view.dataset.page === pageName);
  });
  document.querySelectorAll(".nav[data-view-link]").forEach(link => {
    link.classList.toggle("active", link.dataset.viewLink === pageName);
  });
  document.body.classList.toggle("is-landing", pageName === "landing");
  document.getElementById("crumb").textContent = pageLabels[pageName];
  document.getElementById("side").classList.remove("open");

  if (wasLanding || pageName === "landing") {
    window.scrollTo(0, 0);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove("show"), 2600);
}

function openMission(missionId) {
  const mission = getVisibleMissions().find(item => item.id === missionId);
  if (!mission) {
    toast("This mission preview is no longer available.");
    return;
  }

  const links = [];
  if (mission.link) {
    links.push(`<a class="mission-link" href="${escapeHtml(mission.link)}" target="_blank" rel="noopener noreferrer">Open product ↗</a>`);
  }
  if (mission.formUrl) {
    links.push(`<a class="mission-link" href="${escapeHtml(mission.formUrl)}" target="_blank" rel="noopener noreferrer">Open feedback form ↗</a>`);
  }

  const prototypeNote = mission.kind === "sample"
    ? "This is an example brief only. EZ has no live product, application, feedback submission or reward for it."
    : "These links open outside EZ. This preview is not saved or published; EZ cannot record submissions, conduct reviews or award credits.";

  document.getElementById("detail").innerHTML = `
    <div class="dialog-kicker">${mission.kind === "sample" ? "SAMPLE BRIEF" : "MISSION PREVIEW"}</div>
    <h2 class="dialog-title">${escapeHtml(mission.title)}</h2>
    <div class="dialog-company">${escapeHtml(mission.company)} · ${escapeHtml(mission.sector)}</div>
    <p class="dialog-desc">${escapeHtml(mission.brief)}</p>
    <div class="dialog-details">
      <div class="dialog-detail"><small>TARGET AUDIENCE</small><strong>${escapeHtml(mission.audience)}</strong></div>
      <div class="dialog-detail"><small>TASK</small><strong>${escapeHtml(mission.goal)}</strong></div>
      <div class="dialog-detail"><small>DESIRED FEEDBACK</small><strong>${escapeHtml(mission.feedback)}</strong></div>
      <div class="dialog-detail"><small>TIME / PLATFORM</small><strong>${escapeHtml(mission.duration)} · ${escapeHtml(mission.platform)}</strong></div>
      <div class="dialog-detail"><small>SPOTS LISTED</small><strong>${escapeHtml(mission.spots)}</strong></div>
      <div class="dialog-detail"><small>ILLUSTRATIVE REWARD</small><strong>${escapeHtml(mission.reward)} demo credits; not redeemable</strong></div>
    </div>
    ${links.length ? `<div class="dialog-actions">${links.join("")}</div>` : ""}
    <p class="mission-note">${escapeHtml(prototypeNote)}</p>`;
  dialog.showModal();
}

function showAuthScreen(visible) {
  authScreen.hidden = !visible;
}

function setAuthError(message) {
  authError.textContent = message || "";
}

function requireSignedInToCreate() {
  showAuthScreen(true);
  setAuthError("Sign in to create a temporary mission preview.");
}

function getUserDisplayName(user) {
  const metadata = user && user.user_metadata && typeof user.user_metadata === "object"
    ? user.user_metadata
    : {};
  const candidates = [metadata.full_name, metadata.name, metadata.user_name, user && user.email];
  const name = candidates.find(value => typeof value === "string" && value.trim());
  return name ? name.trim() : "EZ tester";
}

function updateUserBox() {
  const avatar = document.getElementById("user-avatar");
  const name = document.getElementById("user-display-name");
  const action = document.getElementById("user-auth-action");
  const displayName = currentUser ? getUserDisplayName(currentUser) : "Guest";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase() || "G";

  name.textContent = displayName;
  avatar.replaceChildren();
  const metadata = currentUser && currentUser.user_metadata && typeof currentUser.user_metadata === "object"
    ? currentUser.user_metadata
    : {};

  if (typeof metadata.avatar_url === "string" && metadata.avatar_url.startsWith("https://")) {
    const image = document.createElement("img");
    image.className = "auth-avatar-image";
    image.src = metadata.avatar_url;
    image.alt = "";
    avatar.append(image);
  } else {
    avatar.textContent = initials;
  }

  action.textContent = currentUser ? "Log out" : "Sign in";
  action.dataset.signedIn = currentUser ? "true" : "false";
  document.getElementById("landing-guest-actions").hidden = !!currentUser;
  document.getElementById("landing-user-actions").hidden = !currentUser;
  if (currentUser) {
    document.getElementById("landing-first-name").textContent = displayName.split(/[\s@]+/)[0];
  }
}

function prepareAuthMarkup() {
  userBox.classList.add("auth-user-box");
  userBox.innerHTML = '<i id="user-avatar">G</i><span><b id="user-display-name">Guest</b><small>EZ tester</small></span><button type="button" class="auth-user-action" id="user-auth-action">Sign in</button>';
}

function setCurrentUser(user) {
  const nextId = user && typeof user.id === "string" ? user.id : null;
  const currentId = currentUser && currentUser.id ? currentUser.id : null;
  if (nextId !== currentId) {
    userMissions = [];
  }

  currentUser = user || null;
  updateUserBox();
  render();
}

function handleAuthSession(event, session) {
  const previousUserId = currentUser && currentUser.id;
  const nextUser = session && session.user ? session.user : null;
  setCurrentUser(nextUser);
  showAuthScreen(false);

  if (nextUser && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
    navigate("dashboard");
  } else if (!nextUser && (event === "SIGNED_OUT" || previousUserId)) {
    navigate("landing");
  }
}

async function login(provider) {
  if (provider === "google" && !ENABLE_GOOGLE) {
    return;
  }
  if (!supabaseClient) {
    setAuthError("Sign-in is unavailable because Supabase is not configured in this page.");
    return;
  }

  setAuthError("");
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(`Could not sign in with ${provider}`, error);
    setAuthError(error && typeof error.message === "string"
      ? error.message
      : "Sign-in failed. Please try again.");
  }
}

function validateHttpsUrl(input, label) {
  input.setCustomValidity("");
  let url;
  try {
    url = new URL(input.value.trim());
  } catch {
    input.setCustomValidity(`${label} must be a complete HTTPS URL.`);
    return false;
  }

  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    input.setCustomValidity(`${label} must be a valid HTTPS URL without embedded credentials.`);
    return false;
  }
  return true;
}

function validateMissionForm(form) {
  form.querySelectorAll("input, textarea").forEach(field => {
    field.setCustomValidity(field.value.trim() ? "" : "Please fill out this field.");
  });

  const reward = Number(form.elements.reward.value);
  const spots = Number(form.elements.spots.value);
  if (!Number.isSafeInteger(reward) || reward < 1) {
    form.elements.reward.setCustomValidity("Enter a whole number greater than zero.");
  }
  if (!Number.isSafeInteger(spots) || spots < 1) {
    form.elements.spots.setCustomValidity("Enter a whole number greater than zero.");
  }

  const productUrlValid = validateHttpsUrl(form.elements.link, "Product link");
  const feedbackUrlValid = validateHttpsUrl(form.elements.formUrl, "Feedback form link");
  const formIsValid = form.reportValidity();
  return productUrlValid && feedbackUrlValid && formIsValid;
}

function createMissionPreview(form) {
  if (!currentUser) {
    requireSignedInToCreate();
    return;
  }
  if (!validateMissionForm(form)) {
    return;
  }

  const values = Object.fromEntries(new FormData(form));
  const company = values.company.trim();
  const mission = {
    id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "preview",
    ownerId: currentUser.id,
    company,
    sector: "Your preview · Not published",
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    duration: values.duration.trim(),
    reward: Number(values.reward),
    logo: company.charAt(0).toUpperCase(),
    tone: "",
    spots: Number(values.spots),
    audience: values.audience.trim(),
    brief: values.brief.trim(),
    goal: values.goal.trim(),
    feedback: values.feedback.trim(),
    platform: values.platform.trim(),
    link: values.link.trim(),
    formUrl: values.formUrl.trim()
  };

  userMissions.unshift(mission);
  form.reset();
  render();
  toast("Temporary mission preview created. Nothing was published or saved.");
  navigate("missions");
}

function deleteMissionPreview(missionId) {
  const index = userMissions.findIndex(mission =>
    mission.id === missionId && currentUser && mission.ownerId === currentUser.id
  );
  if (index < 0) {
    toast("This mission preview could not be found.");
    return;
  }
  if (!window.confirm("Remove this temporary mission preview?")) {
    return;
  }

  userMissions.splice(index, 1);
  render();
  toast("Temporary mission preview removed.");
}

function handleDocumentClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const deleteButton = target.closest("[data-delete]");
  if (deleteButton) {
    deleteMissionPreview(deleteButton.dataset.delete);
    return;
  }

  if (target.closest("#sort")) {
    sortMode = sortMode === "newest" ? "reward" : "newest";
    render();
    return;
  }

  const viewLink = target.closest("[data-view-link]");
  if (viewLink) {
    event.preventDefault();
    navigate(viewLink.dataset.viewLink);
    return;
  }

  const missionButton = target.closest("[data-open]");
  if (missionButton && !missionButton.disabled) {
    openMission(missionButton.dataset.open);
    return;
  }

  const filterButton = target.closest("[data-filter]");
  if (filterButton) {
    activeFilter = filterButton.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(button => {
      button.classList.toggle("selected", button === filterButton);
    });
    render();
  }
}

clearLegacyBrowserData();
prepareAuthMarkup();
loginGoogle.hidden = !ENABLE_GOOGLE;
updateUserBox();
render();

document.addEventListener("click", handleDocumentClick);
document.getElementById("close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) {
    dialog.close();
  }
});
document.getElementById("menu").addEventListener("click", () => {
  document.getElementById("side").classList.toggle("open");
});
createForm.addEventListener("submit", event => {
  event.preventDefault();
  createMissionPreview(createForm);
}, true);
loginGithub.addEventListener("click", () => login("github"));
loginGoogle.addEventListener("click", () => login("google"));
guestButton.addEventListener("click", () => {
  setAuthError("");
  showAuthScreen(false);
  navigate("missions");
});
document.getElementById("landing-sign-in").addEventListener("click", () => {
  setAuthError("");
  showAuthScreen(true);
});
document.getElementById("landing-create").addEventListener("click", () => navigate("create"));
document.getElementById("user-auth-action").addEventListener("click", async event => {
  if (event.currentTarget.dataset.signedIn !== "true") {
    setAuthError("");
    showAuthScreen(true);
    return;
  }
  if (!supabaseClient) {
    setAuthError("Sign-out is unavailable because Supabase is not configured in this page.");
    showAuthScreen(true);
    return;
  }

  setAuthError("");
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Could not sign out", error);
    toast(error && typeof error.message === "string"
      ? error.message
      : "Sign-out failed. Please try again.");
  }
});

if (supabaseClient) {
  let authEventReceived = false;
  supabaseClient.auth.onAuthStateChange((event, session) => {
    authEventReceived = true;
    handleAuthSession(event, session);
  });
  supabaseClient.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        throw error;
      }
      if (!authEventReceived) {
        handleAuthSession("INITIAL_SESSION", data && data.session);
      }
    })
    .catch(error => {
      console.error("Could not get Supabase session", error);
      if (!authEventReceived) {
        setCurrentUser(null);
        showAuthScreen(false);
      }
    });
} else {
  showAuthScreen(false);
}
