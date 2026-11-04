// Supabase Auth Send SMS Hook: forwards Supabase-generated OTPs through IPROG SMS.
// Configure IPROGSMS_TOKEN and SMS_HOOK_SECRET as Edge Function secrets.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const hookSecret = Deno.env.get("SMS_HOOK_SECRET")?.replace("v1,whsec_", "");
  const iprogToken = Deno.env.get("IPROGSMS_TOKEN");
  if (!hookSecret || !iprogToken) {
    console.error("Missing SMS_HOOK_SECRET or IPROGSMS_TOKEN function secret");
    return json(500, { error: "SMS service is not configured" });
  }

  let event: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    const payload = await request.text();
    event = new Webhook(hookSecret).verify(payload, Object.fromEntries(request.headers)) as typeof event;
  } catch {
    return json(401, { error: "Invalid hook signature or payload" });
  }

  const phone = event.user?.phone;
  const otp = event.sms?.otp;
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone) || !otp || !/^\d{4,8}$/.test(otp)) {
    return json(400, { error: "Missing or invalid phone number or OTP" });
  }

  // iProg accepts Philippines numbers in international digits format (639...).
  const phoneNumber = phone.replace(/^\+/, "");
  const endpoint = "https://www.iprogsms.com/api/v1/sms_messages";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: iprogToken,
        phone_number: phoneNumber,
        message: `Your TCC verification code is ${otp}.`,
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || (result && Number(result.status) !== 200)) {
      console.error("iProg SMS request failed", response.status, result?.message ?? "Unknown response");
      return json(502, { error: "SMS provider rejected the message" });
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("iProg SMS request error", error);
    return json(502, { error: "Could not reach SMS provider" });
  }
});
