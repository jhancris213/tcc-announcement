// The Supabase URL and publishable key are public client settings.
// Never put an iProg token or Supabase secret/service-role key in this file.
(() => {
  const projectUrl = "https://zxalcnsygntinpuwbjqi.supabase.co";
  const publishableKey = "sb_publishable_gB8-_IFjXnFXMaw3E7Ca0w_WhPZm40S";

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
