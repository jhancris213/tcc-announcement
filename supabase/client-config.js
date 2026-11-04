// The Supabase URL and publishable key are public client settings.
// Never put an iProg token or Supabase secret/service-role key in this file.
(() => {
  const projectUrl = "https://YOUR_PROJECT_REF.supabase.co";
  const publishableKey = "YOUR_SUPABASE_PUBLISHABLE_KEY";

  if (
    !window.supabase?.createClient ||
    projectUrl.includes("YOUR_PROJECT_REF") ||
    publishableKey === "YOUR_SUPABASE_PUBLISHABLE_KEY"
  ) {
    window.tccSupabase = null;
    return;
  }

  window.tccSupabase = window.supabase.createClient(projectUrl, publishableKey);
})();
