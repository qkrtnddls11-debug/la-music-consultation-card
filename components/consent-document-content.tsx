import { ACADEMY_RULE_SECTIONS, PRIVACY_RETENTION_ITEMS, REFUND_TABLE, RULE_DOCUMENT_DATE } from "@/lib/consent-documents";
import type { ConsentConsultation } from "@/lib/types";

export function AcademyRulesContent() {
  return (
    <article className="space-y-5 text-[0.94rem] leading-7 text-[#3f3a33]">
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[#1f1c18]">학원규칙동의서</h3>
        <p className="mt-1 text-xs font-semibold text-[#8a8378]">{RULE_DOCUMENT_DATE}</p>
      </div>
      {ACADEMY_RULE_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <h4 className="text-base font-extrabold text-[#2b2723]">{section.title}</h4>
          <ul className="space-y-1.5 pl-5">
            {section.items.map((item) => <li key={item} className="list-disc">{item}</li>)}
          </ul>
          {section.title.startsWith("4.") ? (
            <div className="overflow-x-auto py-2">
              <table className="min-w-[590px] w-full border-collapse text-center text-sm">
                <thead><tr>{["반환 사유 발생일", "학원 이용 시작일", "반환 규정"].map((label) => <th key={label} className="border border-[#bdb6aa] bg-[#eee9e0] p-2 font-extrabold">{label}</th>)}</tr></thead>
                <tbody>{REFUND_TABLE.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell} className="border border-[#cfc8bd] p-2">{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : null}
          {section.notes?.map((note) => <p key={note} className="pl-2 text-sm font-semibold text-[#6b6459]">{note}</p>)}
        </section>
      ))}
      <p className="rounded-xl bg-[#f3eee5] p-4 font-extrabold text-[#2b2723]">
        이 모든 사실을 확인하였으며, 위 내용에 맞춰 수강함에 동의합니다.
      </p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[105px_1fr] gap-3 border-b border-[#e4ded4] py-2.5"><dt className="font-bold text-[#6b6459]">{label}</dt><dd className="break-words font-semibold">{value || "미입력"}</dd></div>;
}

export function PrivacyTermsContent({ consultation }: { consultation?: ConsentConsultation }) {
  return (
    <article className="space-y-6 text-[0.94rem] leading-7 text-[#3f3a33]">
      <div className="text-center"><h3 className="text-2xl font-black tracking-tight text-[#1f1c18]">개인정보 수집·활용 동의서</h3></div>
      {consultation ? (
        <dl className="rounded-xl border border-[#d8d2c8] bg-[#faf9f6] px-4">
          <InfoRow label="이름" value={consultation.name} />
          <InfoRow label="생년월일" value={consultation.birth_date || ""} />
          <InfoRow label="연락처" value={consultation.student_phone || consultation.parent_phone} />
          <InfoRow label="학교·학년" value={consultation.school} />
          <InfoRow label="성별" value={consultation.gender} />
          <InfoRow label="학부모 연락처" value={consultation.parent_phone} />
        </dl>
      ) : null}

      <section className="space-y-2">
        <h4 className="text-base font-extrabold text-[#2b2723]">1. 필수 정보 수집</h4>
        <p>다음의 개인정보 항목은 학원 등록을 위한 필수적인 항목으로 학원 수강을 위한 목적으로만 사용하며 법령의 근거 없이 제3자에 제공하지 않습니다.</p>
        <p className="font-bold">수집 항목: 이름, 생년월일, 연락처, 학교 및 학년</p>
      </section>
      <section className="space-y-2">
        <h4 className="text-base font-extrabold text-[#2b2723]">2. 고유 식별정보 수집</h4>
        <p>다음의 고유 식별정보 항목은 학원 등록을 위해 필수적인 항목으로 원생관리를 위한 목적으로만 사용하며 법령의 근거 없이 제3자에 제공되지 않습니다.</p>
        <p className="font-bold">원본 양식 항목: 주민등록번호</p>
      </section>
      <section className="space-y-2">
        <h4 className="text-base font-extrabold text-[#2b2723]">3. 선택 정보 수집</h4>
        <p>다음의 개인정보 항목은 학원생의 상담, 학습정보의 제공, 공지사항 전달 등의 목적으로 사용하며 제공에 동의하지 않을 경우 사용목적에 명시한 서비스가 제한됩니다.</p>
        <p className="font-bold">수집 항목: 휴대전화, 이메일, 주소, 성별, 학부모 연락처</p>
      </section>
      <section className="space-y-2">
        <h4 className="text-base font-extrabold text-[#2b2723]">4. 홍보 및 마케팅 용도 이용</h4>
        <p>위의 개인정보를 학원의 홍보물 및 소식지 전달 등에 사용하는 것에 대하여 동의합니다. 제공에 동의하지 않을 경우 소식지 등의 수신 등이 제한됩니다.</p>
      </section>
      <section className="space-y-2 rounded-xl bg-[#f3eee5] p-4">
        <h4 className="font-extrabold text-[#2b2723]">개인정보 보유 및 이용기간</h4>
        <ul className="space-y-1 pl-5">{PRIVACY_RETENTION_ITEMS.map((item) => <li key={item} className="list-disc">{item}</li>)}</ul>
      </section>
      <p className="text-sm font-semibold text-[#6b6459]">※ 원본 양식은 만 14세 미만 법정대리인 동의를 안내하며, 이 전자 동의 절차는 학원 요청에 따라 만 19세 미만에게 법정대리인 단계를 적용합니다.</p>
      <p className="text-sm font-semibold text-[#4a453d]">※ 개인정보 제공자가 동의한 내용 외의 다른 목적으로 활용하지 않으며, 제공된 개인정보의 이용을 거부하고자 할 때에는 개인정보 관리 책임자를 통해 열람, 정정, 삭제를 요구할 수 있습니다.</p>
      <p className="font-bold text-[#2b2723]">「개인정보보호법」 등 관련 법규에 의거하여 상기 본인은 위와 같이 개인정보 수집 및 활용에 동의합니다.</p>
    </article>
  );
}
