import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("two database plans create fixed, idempotent payment links and webhook activation", {
  skip: process.env.RUN_MYSQL_INTEGRATION !== "1"
}, async () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sams-payment-test-"));
  process.env.NODE_ENV = "test";
  process.env.UPLOAD_DIR = path.join(testRoot, "uploads");
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.INVOICE_LINK_SECRET = "test-invoice-link-secret";
  process.env.PUBLIC_BASE_URL = "https://sams-test.example.test";
  const [{ MemberRepository }, { PaymentService, POST_PAYMENT_PIPELINE_SELECT }, { getDbPool, OFFICIAL_MEMBERSHIP_PLANS }, { UserService }, { MemberService }, { buildPaymentInvoiceTemplateRequest, buildPaymentLinkTemplateRequest, buildPaymentSuccessTemplateRequest, sendPaymentInvoiceWhatsApp, sendPaymentSuccessWhatsApp }, { resolveRegistrationPlan, payableBreakdown }] = await Promise.all([
    import("../repositories/member.repository"),
    import("./payment.service"),
    import("../config/db"),
    import("./user.service"),
    import("./member.service"),
    import("./whatsapp.service"),
    import("../utils/membership-plan-catalog")
  ]);

  const repository = new MemberRepository();
  assert.doesNotMatch(POST_PAYMENT_PIPELINE_SELECT, /m\.whatsappNumber/i);
  assert.match(POST_PAYMENT_PIPELINE_SELECT, /m\.mobileNo\s+AS\s+whatsappNumber/i);
  assert.deepEqual(
    new PaymentService().calculateExpiryDates(null, 1, "2026-06-04"),
    { startDateStr: "2026-06-04", expiryDateStr: "2026-07-03" }
  );
  const pool = await getDbPool();
  const [planRows]: any = await pool.query("SELECT * FROM membership_plans");
  const [batchRows]: any = await pool.query("SELECT * FROM batches");
  const registrationBatch = batchRows.find((batch: any) => batch.academy_id === "swim" && batch.status === "OPEN");
  assert.ok(registrationBatch, "payment regression fixture requires an OPEN database batch");
  assert.equal(planRows.filter((plan: any) => plan.description === "OFFICIAL_RATE_CARD_2026").length, 27);
  assert.equal(OFFICIAL_MEMBERSHIP_PLANS.length, 27);
  for (const [code, , category, frequency, duration, , expectedFee] of OFFICIAL_MEMBERSHIP_PLANS) {
    const rows = planRows.filter((plan: any) => plan.plan_code === code && Number(plan.is_active) !== 0);
    assert.equal(rows.length, 1, `${code} must resolve to exactly one active plan`);
    assert.equal(rows[0].plan_category, category);
    assert.equal(rows[0].frequency_code, frequency);
    assert.equal(rows[0].duration_code, duration);
    assert.equal(Number(rows[0].renewal_fee), expectedFee);
    assert.equal(Number(rows[0].registration_fee), category === "Guest" || category === "Group" ? 0 : 300);
  }
  const resolve = (membershipType: any, variant: string, duration = "") => {
    const result = resolveRegistrationPlan(planRows, { membershipType, variant, duration });
    assert.equal(result.error, null);
    assert.ok(result.plan);
    return result.plan!;
  };
  const assertFees = (plan: any, base: number, registration: number, total: number) => {
    const fees = payableBreakdown(plan);
    assert.equal(fees.membershipFee, base);
    assert.equal(fees.registrationFee, registration);
    assert.equal(fees.total, total);
  };
  assertFees(resolve("Learners", "6_days", "1_month"), 3500, 300, 3800);
  assertFees(resolve("Learners", "3_days", "6_months"), 16000, 300, 16300);
  assertFees(resolve("General", "3_days", "annual"), 25500, 300, 25800);
  assertFees(resolve("Family", "Family_4", "1_month"), 10000, 300, 10300);
  assertFees(resolve("Family", "Family_3", "3_months"), 22500, 300, 22800);
  assertFees(resolve("Guest", "hourly"), 300, 0, 300);
  assertFees(resolve("Guest", "weekend_hourly"), 350, 0, 350);
  assert.match(resolveRegistrationPlan(planRows, { membershipType: "Learners", variant: "3_days", duration: "2_months" }).error || "", /No active database plan/);
  const duplicatePlans = [...planRows, { ...resolve("Learners", "6_days", "1_month"), id: 9999 }];
  assert.match(resolveRegistrationPlan(duplicatePlans, { membershipType: "Learners", variant: "6_days", duration: "1_month" }).error || "", /ambiguous/);
  const feeFor = (code: string) => Number(planRows.find((plan: any) => plan.plan_code === code)?.renewal_fee);
  assert.equal(feeFor("learners_6_days_3_months"), 9500);
  assert.equal(feeFor("general_3_days_annual"), 25500);
  assert.equal(feeFor("family_4_6_days_3_months"), 28500);
  assert.equal(feeFor("guest_hourly_weekend"), 350);
  assert.equal(feeFor("group_fixed_one_time"), 25000);
  const monthlyPlan = planRows.find((plan: any) => plan.plan_code === "learners_6_days_1_month");
  const annualPlan = planRows.find((plan: any) => plan.plan_code === "learners_6_days_annual");
  assert.ok(monthlyPlan && annualPlan);
  const memberService = new MemberService();
  const registeredThroughPublicFlow = await memberService.registerMember({
    full_name: "Exact Plan Registration", date_of_birth: "2000-01-01", gender: "Female",
    mobile_number: "+919876511111", whatsapp_number: "+919876511111", email: "exact-plan@example.test",
    address: "Test address", city: "Vadodara", state: "Gujarat", pincode: "390001",
    emergency_contact_name: "Test Contact", emergency_contact_number: "+919876522222",
    member_type: monthlyPlan.name, membership_plan_id: String(monthlyPlan.id),
    selected_batch_id: String(registrationBatch.id)
  }, "/uploads/test-registration-photo.webp");
  assert.equal(registeredThroughPublicFlow.membership_plan_id, Number(monthlyPlan.id));
  const createMember = (suffix: string, planId: number) => repository.create({
    membershipNo: `TEST-${suffix}`, applicationNo: `APP-${suffix}`, fullName: `Test Member ${suffix}`,
    email: `${suffix.toLowerCase()}@example.test`, mobileNo: `98765000${suffix}`,
    gender: "male", dateOfBirth: "2000-01-01", addressLine1: "Test address", city: "Vadodara",
    state: "Gujarat", pincode: "390001", emergencyName: "Contact", emergencyPhone: "9876500099",
    academyId: "swim", selected_batch_id: Number(registrationBatch.id), membership_plan_id: planId,
    registration_status: "Pending", payment_status: "Pending", membership_status: "Inactive", login_enabled: false
  });
  const first = await createMember("01", monthlyPlan.id);
  const second = await createMember("02", annualPlan.id);
  assert.equal(first.totalPayable, 3800);
  assert.equal(first.membership_plan_id, Number(monthlyPlan.id));
  assert.equal(first.age, 26);
  assert.equal(first.undertakerParentName, "Contact");
  assert.equal(first.undertakerParentPhone, "9876500099");
  const approvedFirst = await memberService.approveMember(first.membershipNo);
  const approvedSecond = await memberService.approveMember(second.membershipNo);
  assert.equal(approvedFirst.registration_status, "Approved");
  assert.equal(approvedFirst.payment_status, "Pending");
  assert.equal(approvedFirst.login_enabled, false);

  const gatewayCalls: any[] = [];
  const fakeRazorpay = {
    paymentLink: {
      create: async (request: any) => {
        gatewayCalls.push(request);
        const sequence = gatewayCalls.length;
        return { id: `plink_test_${sequence}`, short_url: `https://rzp.io/i/test${sequence}`, status: "created", amount: request.amount, currency: "INR" };
      }
    }
  };
  const postPaymentCalls = { invoices: 0, success: 0, invoiceMessages: 0 };
  const postPaymentRecipients: string[] = [];
  const postPaymentPayloads: any[] = [];
  let service: InstanceType<typeof PaymentService>;
  service = new PaymentService(fakeRazorpay, {
    generateInvoice: async paymentId => {
      postPaymentCalls.invoices += 1;
      return service.ensureAndGetInvoicePDF(paymentId, "Test Webhook");
    },
    sendPaymentSuccess: async payment => { postPaymentRecipients.push(payment.whatsappNumber); postPaymentPayloads.push({ kind: "success", ...payment }); return { status: "success", requestId: `success-${++postPaymentCalls.success}` }; },
    sendInvoice: async payment => { postPaymentRecipients.push(payment.whatsappNumber); postPaymentPayloads.push({ kind: "invoice", ...payment }); return { status: "success", requestId: `invoice-${++postPaymentCalls.invoiceMessages}` }; }
  });

  const linkOne = await service.createRazorpayPaymentLink({ memberId: approvedFirst.id });
  const linkTwo = await service.createRazorpayPaymentLink({ memberId: approvedSecond.id });
  const reused = await service.createRazorpayPaymentLink({ memberId: approvedFirst.id });

  assert.equal(gatewayCalls.length, 2);
  assert.equal(gatewayCalls[0].amount, 380_000);
  assert.equal(gatewayCalls[1].amount, 3_380_000);
  assert.equal(gatewayCalls[0].accept_partial, false);
  assert.equal(reused.paymentLinkId, linkOne.paymentLinkId);
  assert.equal(reused.reused, true);
  assert.match(linkTwo.paymentLinkId, /^plink_/);
  const [pendingRows]: any = await pool.query("SELECT * FROM payments WHERE member_id = ?", [approvedFirst.id]);
  assert.equal(pendingRows.length, 1);
  assert.equal(pendingRows[0].razorpay_payment_link_id, linkOne.paymentLinkId);

  const msg91Request = buildPaymentLinkTemplateRequest({ phoneNumber: "+91 98765 00001", memberName: first.fullName,
    membershipName: monthlyPlan.name, amount: linkOne.amount, paymentLink: linkOne.paymentLink, integratedNumber: "919999999999",
    templateName: "payment_link", namespace: "approved_namespace" });
  const msg91Target = msg91Request.payload.template.to_and_components[0];
  assert.deepEqual(msg91Target.to, ["919876500001"]);
  assert.equal(msg91Target.components.body_1.value, first.fullName);
  assert.equal(msg91Target.components.body_2.value, monthlyPlan.name);
  assert.equal(msg91Target.components.body_3.value, "3800");
  assert.equal(msg91Target.components.body_4.value, linkOne.paymentLink);
  assert.equal("button_1" in msg91Target.components, false);

  const userService = new UserService({ otpProvider:{ send:async()=>({success:true,requestId:"test-request"}),verify:async()=>({success:true}) } });
  const unpaidOtp = await userService.sendOtp({ phoneNumber: first.mobileNo, role: "member" });
  assert.equal(unpaidOtp.success, false);

  const webhookPayload = JSON.stringify({
    event: "payment_link.paid",
    payload: {
      payment_link: { entity: { id: linkOne.paymentLinkId } },
      payment: { entity: { id: "pay_test_1", order_id: "order_test_1", amount: 380_000, status: "captured", method: "upi", notes: { internal_payment_id: String(linkOne.paymentId) } } }
    }
  });
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(webhookPayload).digest("hex");
  const webhookResult = await service.handleWebhook(webhookPayload, signature);
  assert.equal(webhookResult.status, "Paid");
  const repeatedWebhook = await service.handleWebhook(webhookPayload, signature);
  assert.equal((repeatedWebhook as any).idempotent, true);
  const capturedPayload = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_test_1", order_id: "order_test_1", amount: 380_000,
      status: "captured", method: "upi", notes: { internal_payment_id: String(linkOne.paymentId) } } } }
  });
  const capturedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(capturedPayload).digest("hex");
  const capturedDuplicate = await service.handleWebhook(capturedPayload, capturedSignature);
  assert.equal((capturedDuplicate as any).idempotent, true);
  assert.deepEqual(postPaymentCalls, { invoices: 1, success: 1, invoiceMessages: 1 });
  assert.deepEqual(postPaymentRecipients, [first.mobileNo, first.mobileNo]);
  assert.equal(postPaymentPayloads[0].membership_start_date, postPaymentPayloads[1].membership_start_date);
  assert.equal(postPaymentPayloads[0].membership_end_date, postPaymentPayloads[1].membership_end_date);
  assert.match(postPaymentPayloads[1].invoiceUrl, /^https:\/\/sams-test\.example\.test\/api\/payments\/\d+\/invoice\/public\?token=/);

  await assert.rejects(() => service.handleWebhook(webhookPayload, "invalid-signature"), /Invalid Razorpay webhook signature/);

  const activated = await repository.getByMembershipNo(first.membershipNo);
  assert.equal(activated.payment_status, "Paid");
  assert.equal(activated.membership_status, "Active");
  assert.equal(activated.login_enabled, true);
  assert.equal(activated.registration_status, "Approved");
  assert.equal(activated.payment_status, "Paid");
  assert.equal(activated.membership_status, "Active");
  const expectedExpiry = service.calculateExpiryDates(null, 1).expiryDateStr;
  assert.equal(activated.membership_end_date, expectedExpiry);
  const paidOtp = await userService.sendOtp({ phoneNumber: first.mobileNo, role: "member" });
  assert.equal(paidOtp.success, true);

  const [paymentRows]: any = await pool.query("SELECT * FROM payments WHERE id = ?", [linkOne.paymentId]);
  assert.equal(paymentRows[0].razorpay_payment_link_id, linkOne.paymentLinkId);
  assert.equal(paymentRows[0].razorpay_payment_id, "pay_test_1");
  assert.equal(paymentRows[0].razorpay_order_id, "order_test_1");
  assert.equal(paymentRows[0].payment_status, "Paid");
  assert.equal(paymentRows[0].invoice_generation_status, "Completed");
  assert.equal(paymentRows[0].payment_success_whatsapp_status, "Sent");
  assert.equal(paymentRows[0].invoice_whatsapp_status, "Sent");
  assert.match(paymentRows[0].invoice_url, /^https:\/\/sams-test\.example\.test\/api\/payments\/\d+\/invoice\/public\?token=/);
  const invoices = fs.readdirSync(path.join(testRoot, "uploads", "invoices")).filter(name => name.endsWith(".pdf"));
  assert.equal(invoices.length, 1);

  const successTemplate = buildPaymentSuccessTemplateRequest({ phoneNumber: "+91 98765 00001", integratedNumber: "919999999999",
    namespace: "approved_namespace", templateName: "payment_success", memberName: first.fullName, amount: 3800,
    membershipNo: first.membershipNo, receiptNo: paymentRows[0].receipt_no,
    membershipStartDate: activated.membership_start_date, membershipEndDate: activated.membership_end_date });
  assert.equal(successTemplate.payload.template.to_and_components[0].components.body_1.value, first.fullName);
  assert.equal(successTemplate.payload.template.to_and_components[0].components.body_2.value, "3800");
  assert.equal(successTemplate.payload.template.to_and_components[0].components.body_3.value, first.membershipNo);
  const [activationYear, activationMonth, activationDay] = String(activated.membership_start_date).slice(0, 10).split("-");
  assert.equal(successTemplate.payload.template.to_and_components[0].components.body_5.value,
    `${activationDay}/${activationMonth}/${activationYear}`);
  const invoiceTemplate = buildPaymentInvoiceTemplateRequest({ phoneNumber: "+91 98765 00001", integratedNumber: "919999999999",
    namespace: "approved_namespace", templateName: "payment_invoice", memberName: first.fullName,
    invoiceNo: paymentRows[0].invoice_no, amount: 3800, membershipStartDate: activated.membership_start_date,
    membershipEndDate: activated.membership_end_date, invoiceUrl: paymentRows[0].invoice_url });
  assert.equal(invoiceTemplate.payload.template.to_and_components[0].components.header_1.type, "document");
  assert.match(invoiceTemplate.payload.template.to_and_components[0].components.header_1.value, /^https:\/\//);
  process.env.MSG91_AUTH_KEY = "test-auth-key-not-sent";
  process.env.MSG91_WHATSAPP_NUMBER = "919999999999";
  process.env.MSG91_WHATSAPP_NAMESPACE = "approved_namespace";
  delete process.env.MSG91_PAYMENT_SUCCESS_TEMPLATE;
  delete process.env.MSG91_INVOICE_TEMPLATE;
  await assert.rejects(() => sendPaymentSuccessWhatsApp({ phoneNumber: "9876500001", memberName: first.fullName,
    amount: 3800, membershipNo: first.membershipNo, receiptNo: paymentRows[0].receipt_no,
    membershipStartDate: activated.membership_start_date, membershipEndDate: activated.membership_end_date }), /MSG91_PAYMENT_SUCCESS_TEMPLATE/);
  await assert.rejects(() => sendPaymentInvoiceWhatsApp({ phoneNumber: "9876500001", memberName: first.fullName,
    amount: 3800, invoiceNo: paymentRows[0].invoice_no, membershipStartDate: activated.membership_start_date,
    membershipEndDate: activated.membership_end_date, invoiceUrl: paymentRows[0].invoice_url }), /MSG91_INVOICE_TEMPLATE/);

  const mismatchPayload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {
    id: "pay_test_2", amount: 1, status: "captured", notes: { internal_payment_id: String(linkTwo.paymentId) }
  } } } });
  const mismatchSignature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(mismatchPayload).digest("hex");
  await assert.rejects(() => service.handleWebhook(mismatchPayload, mismatchSignature), /Paid amount does not match/);

  const failureCalls = { success: 0, invoice: 0 };
  const failureIsolatedService = new PaymentService(fakeRazorpay, {
    generateInvoice: async () => { throw new Error("test invoice generation failure"); },
    sendPaymentSuccess: async () => { failureCalls.success += 1; throw new Error("test MSG91 failure"); },
    sendInvoice: async () => { failureCalls.invoice += 1; throw new Error("must not send without invoice"); }
  });
  const secondCapturedPayload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {
    id: "pay_test_2", amount: 3_380_000, status: "captured", method: "card", notes: { internal_payment_id: String(linkTwo.paymentId) }
  } } } });
  const secondCapturedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(secondCapturedPayload).digest("hex");
  const secondResult = await failureIsolatedService.handleWebhook(secondCapturedPayload, secondCapturedSignature);
  assert.equal(secondResult.status, "Paid");
  const secondActivated = await repository.getByMembershipNo(second.membershipNo);
  assert.equal(secondActivated.login_enabled, true);
  assert.equal(secondActivated.membership_status, "Active");
  const [secondPaymentRows]: any = await pool.query("SELECT * FROM payments WHERE id = ?", [linkTwo.paymentId]);
  assert.equal(secondPaymentRows[0].payment_status, "Paid");
  assert.equal(secondPaymentRows[0].invoice_generation_status, "Failed");
  assert.equal(secondPaymentRows[0].payment_success_whatsapp_status, "Failed");
  assert.deepEqual(failureCalls, { success: 1, invoice: 0 });

  // A payment captured after an administrative archive remains valid financial
  // history, but must never reactivate access or send member communications.
  const late = await createMember("03", monthlyPlan.id);
  await memberService.approveMember(late.membershipNo);
  const lateLink = await service.createRazorpayPaymentLink({ memberId: late.id });
  const archivedLate = await memberService.deleteMember(late.membershipNo, {
    userId: "usr_admin_payment_test", name: "Payment Test Admin", role: "admin", academyId: "swim"
  });
  assert.equal(archivedLate.action, "MEMBER_ARCHIVED");
  const communicationCountsBeforeLateCapture = { success: postPaymentCalls.success, invoice: postPaymentCalls.invoiceMessages };
  const latePayload = JSON.stringify({ event: "payment_link.paid", payload: {
    payment_link: { entity: { id: lateLink.paymentLinkId } },
    payment: { entity: { id: "pay_test_late", order_id: "order_test_late", amount: 380_000,
      status: "captured", method: "upi", notes: { internal_payment_id: String(lateLink.paymentId) } } }
  } });
  const lateSignature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(latePayload).digest("hex");
  const lateResult = await service.handleWebhook(latePayload, lateSignature);
  assert.equal(lateResult.status, "Paid");
  assert.equal(await repository.getByMembershipNo(late.membershipNo), null);
  const lateArchivedMember = await repository.getByMembershipNo(late.membershipNo, { includeArchived: true });
  assert.equal(lateArchivedMember.login_enabled, false);
  assert.notEqual(lateArchivedMember.membership_status, "Active");
  assert.ok(lateArchivedMember.deletedAt);
  const [latePaymentRows]: any = await pool.query("SELECT * FROM payments WHERE id = ?", [lateLink.paymentId]);
  assert.equal(latePaymentRows[0].payment_status, "Paid");
  assert.equal(latePaymentRows[0].razorpay_payment_id, "pay_test_late");
  assert.equal(latePaymentRows[0].razorpay_order_id, "order_test_late");
  assert.deepEqual(
    { success: postPaymentCalls.success, invoice: postPaymentCalls.invoiceMessages },
    communicationCountsBeforeLateCapture
  );
  assert.equal((await userService.sendOtp({ phoneNumber: late.mobileNo, role: "member" })).success, false);

  // Re-registration creates a distinct lifecycle. It neither revives nor merges
  // the archived member, while the old payment remains attached to the old ID.
  const reRegistered = await memberService.registerMember({
    full_name: "Re-registered Member", date_of_birth: "2000-01-01", gender: "Male",
    mobile_number: late.mobileNo, whatsapp_number: late.mobileNo, email: late.email,
    address: "New lifecycle address", city: "Vadodara", state: "Gujarat", pincode: "390001",
    emergency_contact_name: "Test Contact", emergency_contact_number: "+919876522222",
    member_type: monthlyPlan.name, membership_plan_id: String(monthlyPlan.id),
    selected_batch_id: String(registrationBatch.id)
  }, "/uploads/test-reregistration-photo.webp");
  assert.notEqual(reRegistered.id, late.id);
  assert.notEqual(reRegistered.membershipNo, late.membershipNo);
  assert.equal((await repository.getByMembershipNo(late.membershipNo, { includeArchived: true })).id, late.id);
  assert.equal((await pool.query("SELECT * FROM payments WHERE id = ?", [lateLink.paymentId]) as any)[0][0].member_id, late.id);
});
