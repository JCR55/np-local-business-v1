(async function () {
  const form = document.querySelector("[data-join-form]");
  if (!form || !window.NP) return;

  const codeField = form.querySelector("[data-referral-code-field]");
  const businessField = form.querySelector("[data-referral-business-field]");
  const methodField = form.querySelector("[data-referral-method-field]");
  const dateField = form.querySelector("[data-referral-date-field]");
  const urlField = form.querySelector("[data-referral-url-field]");
  const offlineField = form.querySelector("[data-offline-referral-field]");
  const status = form.querySelector("[data-join-status]");

  let referralMethod = "none";
  if (codeField) codeField.value = "";
  if (businessField) businessField.value = "";
  if (methodField) methodField.value = referralMethod;
  if (dateField) dateField.value = new Date().toISOString();
  if (urlField) urlField.value = location.href;

  offlineField?.addEventListener("input", () => {
    const value = offlineField.value.trim();
    referralMethod = value ? "offline_referral" : "none";
    if (methodField) methodField.value = referralMethod;
    if (businessField) businessField.value = value;
    if (codeField) codeField.value = "";
  });

  form.addEventListener("submit", (event) => {
    if (dateField) dateField.value = new Date().toISOString();
    if (urlField) urlField.value = location.href;
    const offlineValue = offlineField?.value.trim() || "";
    referralMethod = offlineValue ? "offline_referral" : "none";
    if (methodField) methodField.value = referralMethod;
    if (businessField) businessField.value = offlineValue;
    if (codeField) codeField.value = "";
    if (location.protocol !== "file:") return;
    if (!status) return;
    event.preventDefault();
    const data = new FormData(form);
    const summary = [
      `Business: ${data.get("businessName") || ""}`,
      `Contact: ${data.get("contactName") || ""}`,
      `Email: ${data.get("email") || ""}`,
      `Telephone: ${data.get("telephone") || ""}`,
      `Category: ${data.get("category") || ""}`,
      `Online presence: ${data.get("onlinePresence") || ""}`,
      `Message: ${data.get("message") || ""}`,
      `Referral method: ${data.get("referralMethod") || "none"}`,
      `Referral code: ${data.get("referralCode") || "None"}`,
      `Referred by: ${data.get("referralBusiness") || "None"}`,
      `Referral date: ${data.get("referralDate") || ""}`,
      `Referral URL: ${data.get("referralUrl") || ""}`
    ].join("\n");

    status.textContent = "Form data is ready to connect to your launch enquiry system.";
    status.hidden = false;
    form.dataset.lastSubmission = summary;
  });
})();
