(async function () {
  const form = document.querySelector("[data-join-form]");
  if (!form || !window.NP) return;

  const referralCode = window.NP.getReferralCode ? window.NP.getReferralCode() : "";
  const panel = form.querySelector("[data-referral-panel]");
  const nameTarget = form.querySelector("[data-referral-name]");
  const codeField = form.querySelector("[data-referral-code-field]");
  const businessField = form.querySelector("[data-referral-business-field]");
  const status = form.querySelector("[data-join-status]");

  let referralName = "";
  if (referralCode) {
    const businesses = await window.NP.loadBusinesses();
    const referrer = businesses.find((business) => {
      const aliases = business.aliases || [];
      return [business.id, business.referralCode, ...aliases].filter(Boolean).includes(referralCode);
    });
    referralName = referrer?.name || referralCode;

    if (panel && nameTarget) {
      nameTarget.textContent = referralName;
      panel.hidden = false;
    }
    if (codeField) codeField.value = referralCode;
    if (businessField) businessField.value = referralName;
  }

  form.addEventListener("submit", (event) => {
    if (location.protocol !== "file:") return;
    if (!status) return;
    event.preventDefault();
    const data = new FormData(form);
    const summary = [
      `Business: ${data.get("businessName") || ""}`,
      `Contact: ${data.get("contactName") || ""}`,
      `Email: ${data.get("email") || ""}`,
      `Category: ${data.get("category") || ""}`,
      `Online presence: ${data.get("onlinePresence") || ""}`,
      `Message: ${data.get("message") || ""}`,
      `Referral code: ${data.get("referralCode") || "None"}`,
      `Referred by: ${data.get("referralBusiness") || "None"}`
    ].join("\n");

    status.textContent = referralCode
      ? `Referral captured: ${referralName}. Form data is ready to connect to your launch enquiry system.`
      : "Form data is ready to connect to your launch enquiry system.";
    status.hidden = false;
    form.dataset.lastSubmission = summary;
  });
})();
