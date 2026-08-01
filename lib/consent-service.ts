import "server-only";

import { randomUUID } from "node:crypto";
import { consentChoice, isUnder19 } from "@/lib/consent-utils";
import { createAdminSupabase } from "@/lib/supabase-server";

const BUCKET = "consent-signatures";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: unknown, limit = 160) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function decodePng(value: unknown, label: string) {
  if (typeof value !== "string") return { error: `${label} 이미지가 필요합니다.` } as const;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return { error: `${label} 이미지 형식이 올바르지 않습니다.` } as const;
  const buffer = Buffer.from(match[1], "base64");
  const valid = buffer.length >= 100 && buffer.length <= 2 * 1024 * 1024
    && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return valid ? { buffer } as const : { error: `${label} 이미지를 다시 작성해 주세요.` } as const;
}

type ConsentResult = { data: Record<string, unknown>; status: 201 } | { error: string; status: number };

export async function createConsent(body: Record<string, unknown>, consultationId: string, consentRequestId?: string): Promise<ConsentResult> {
  const uploadedPaths: string[] = [];
  const supabase = createAdminSupabase();
  try {
    if (!UUID_PATTERN.test(consultationId)) return { error: "상담 연결 정보가 올바르지 않습니다.", status: 400 };
    if (body.rules_agreed !== true || body.required_info_agreed !== true) return { error: "필수 동의 항목을 확인해 주세요.", status: 400 };
    const uniqueIdentifierConsent = consentChoice(body.unique_identifier_consent);
    const optionalInfoConsent = consentChoice(body.optional_info_consent);
    const marketingConsent = consentChoice(body.marketing_consent);
    if (!uniqueIdentifierConsent || !optionalInfoConsent || !marketingConsent) return { error: "개인정보 동의 항목을 모두 선택해 주세요.", status: 400 };

    const nameTrace = decodePng(body.name_trace_image, "이름 따라쓰기");
    const signature = decodePng(body.signature_image, "서명");
    if (!("buffer" in nameTrace)) return { error: nameTrace.error, status: 400 };
    if (!("buffer" in signature)) return { error: signature.error, status: 400 };
    const nameTraceBuffer = nameTrace.buffer!;
    const signatureBuffer = signature.buffer!;

    const { data: consultation, error: consultationError } = await supabase.from("consultations").select("id,name,birth_date").eq("id", consultationId).maybeSingle();
    if (consultationError || !consultation) return { error: "연결된 상담 카드를 찾지 못했습니다.", status: 404 };
    const { data: existing, error: existingError } = await supabase.from("consents").select("id").eq("consultation_id", consultationId).maybeSingle();
    if (existingError) return { error: "기존 동의서를 확인하지 못했습니다.", status: 502 };
    if (existing) return { error: "이미 완료된 동의서가 있습니다.", status: 409 };

    const minor = isUnder19(consultation.birth_date);
    const guardianName = minor ? clean(body.guardian_name, 80) : "";
    const guardianPhone = minor ? clean(body.guardian_phone, 20) : "";
    const guardianRelationship = minor ? clean(body.guardian_relationship, 20) : "";
    if (minor && (!guardianName || !guardianRelationship || ![10, 11].includes(guardianPhone.replace(/\D/g, "").length))) {
      return { error: "법정대리인 이름, 연락처, 관계를 확인해 주세요.", status: 400 };
    }

    const tracePath = `${consultationId}/${randomUUID()}-name-trace.png`;
    const signaturePath = `${consultationId}/${randomUUID()}-signature.png`;
    for (const [path, buffer] of [[tracePath, nameTraceBuffer], [signaturePath, signatureBuffer]] as const) {
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: "image/png", cacheControl: "0", upsert: false });
      if (error) {
        if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths);
        return { error: "서명 이미지를 저장하지 못했습니다.", status: 502 };
      }
      uploadedPaths.push(path);
    }

    const { data: consent, error: insertError } = await supabase.from("consents").insert({
      consultation_id: consultationId,
      consent_request_id: consentRequestId ?? null,
      signer_name: minor ? guardianName : consultation.name,
      signer_role: minor ? "법정대리인" : "본인",
      rules_agreed: true,
      required_info_agreed: true,
      unique_identifier_consent: uniqueIdentifierConsent,
      optional_info_consent: optionalInfoConsent,
      marketing_consent: marketingConsent,
      is_minor: minor,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      guardian_relationship: guardianRelationship,
      name_trace_path: tracePath,
      signature_path: signaturePath,
    }).select("*").single();
    if (insertError || !consent) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
      return { error: insertError?.code === "23505" ? "이미 완료된 동의서가 있습니다." : "동의서를 저장하지 못했습니다.", status: insertError?.code === "23505" ? 409 : 502 };
    }

    const { error: statusError } = await supabase.from("consultations").update({ status: "등록" }).eq("id", consultationId);
    if (statusError) {
      await supabase.from("consents").delete().eq("id", consent.id);
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
      return { error: "등록 상태를 완료하지 못했습니다.", status: 502 };
    }

    const now = new Date().toISOString();
    if (consentRequestId) {
      await supabase.from("consent_requests").update({ completed_at: now }).eq("id", consentRequestId);
    }
    await supabase.from("consent_requests").update({ revoked_at: now }).eq("consultation_id", consultationId).is("completed_at", null).is("revoked_at", null);
    return { data: consent, status: 201 };
  } catch (error) {
    if (uploadedPaths.length) {
      try { await supabase.storage.from(BUCKET).remove(uploadedPaths); } catch { /* best-effort cleanup */ }
    }
    console.error("consent create service failed", error);
    return { error: "동의서를 저장하는 중 오류가 발생했습니다.", status: 500 };
  }
}
