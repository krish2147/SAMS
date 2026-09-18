import assert from "node:assert/strict";
import test from "node:test";
import { isCalendarItemRelevant, OperationsCalendarService } from "./operations-calendar.service";

function fakePool(initialEvents:any[]=[], initialHolidays:any[]=[]) {
  const events = [...initialEvents]; const holidays = [...initialHolidays]; const calls:string[] = [];
  return { calls, events, holidays, query: async (sql:string, params:any[]=[]) => {
    calls.push(sql.replace(/\s+/g," ").trim());
    if (sql.includes("INSERT INTO events")) { events.push({ id:events.length+1,title:params[0],description:params[1],event_date:params[2],start_time:params[3],end_time:params[4],location:params[5],event_type:params[6],registration_required:params[8],applicable_to:params[9],applicable_batch_ids:params[10],applicable_plan_categories:params[11],status:params[12],created_by:params[13] }); return [{insertId:events.length},[]]; }
    if (sql.includes("INSERT INTO holidays")) { holidays.push({ id:holidays.length+1,name:params[0],holiday_date:params[1],end_date:params[2],description:params[3],applicable_to:params[4],applicable_batch_ids:params[5],applicable_plan_categories:params[6],status:params[7],announcement_message:params[8],facility_closed:params[9],created_by:params[10] }); return [{insertId:holidays.length},[]]; }
    if (sql.includes("FROM events WHERE id")) return [[events.find(row=>row.id===params[0])].filter(Boolean),[]];
    if (sql.includes("FROM holidays WHERE id")) return [[holidays.find(row=>row.id===params[0])].filter(Boolean),[]];
    if (sql.includes("FROM events") && sql.includes("CURDATE")) return [events.filter(row=>row.status==="Published"),[]];
    if (sql.includes("FROM holidays") && sql.includes("CURDATE")) return [holidays.filter(row=>row.status==="Active"),[]];
    if (sql.includes("FROM events")) return [events,[]];
    if (sql.includes("FROM holidays")) return [holidays,[]];
    return [{affectedRows:1},[]];
  }};
}

test("creates database-backed holiday with safe defaults", async () => {
  const pool=fakePool(); const service=new OperationsCalendarService(async()=>pool as any);
  const holiday=await service.createHoliday({name:"Foundation Day",holiday_date:"2026-09-01",description:"Closed"},"Admin");
  assert.equal(holiday.name,"Foundation Day"); assert.equal(holiday.status,"Active"); assert.equal(holiday.facility_closed,1);
});

test("creates published event and preserves actual schedule", async () => {
  const pool=fakePool(); const service=new OperationsCalendarService(async()=>pool as any);
  const event=await service.createEvent({title:"Swim Meet",event_date:"2026-09-10",start_time:"08:00:00",end_time:"11:00:00",location:"Main Pool"},"Admin");
  assert.equal(event.status,"Published"); assert.equal(event.start_time,"08:00:00"); assert.equal(event.location,"Main Pool");
});

test("member relevance supports global, batch and plan-category targeting", () => {
  const member={selected_batch_id:7,plan_category:"General"};
  assert.equal(isCalendarItemRelevant({applicable_to:"All Members"},member),true);
  assert.equal(isCalendarItemRelevant({applicable_to:"Selected Batches",applicable_batch_ids:"[\"7\"]"},member),true);
  assert.equal(isCalendarItemRelevant({applicable_to:"Selected Batches",applicable_batch_ids:"[\"8\"]"},member),false);
  assert.equal(isCalendarItemRelevant({applicable_to:"Selected Categories",applicable_plan_categories:"[\"General\"]"},member),true);
});

test("upcoming member queries require active status, future dates and remain bounded", async () => {
  const pool=fakePool([{id:1,status:"Published",applicable_to:"All Members"},{id:2,status:"Cancelled",applicable_to:"All Members"}], [{id:1,status:"Active",applicable_to:"All Members"},{id:2,status:"Cancelled",applicable_to:"All Members"}]);
  const service=new OperationsCalendarService(async()=>pool as any);
  assert.equal((await service.listUpcomingForMember({},"events",5)).length,1);
  assert.equal((await service.listUpcomingForMember({},"holidays",5)).length,1);
  assert.ok(pool.calls.some(sql=>sql.includes("event_date >= CURDATE() AND status = 'Published'")&&sql.includes("LIMIT 30")));
  assert.ok(pool.calls.some(sql=>sql.includes("status = 'Active'")&&sql.includes("LIMIT 30")));
});

test("invalid calendar dates fail server validation", async () => {
  const pool=fakePool(); const service=new OperationsCalendarService(async()=>pool as any);
  await assert.rejects(()=>service.createHoliday({name:"Bad",holiday_date:"tomorrow"},"Admin"),/valid YYYY-MM-DD/);
  await assert.rejects(()=>service.createEvent({title:"Bad",event_date:""},"Admin"),/valid YYYY-MM-DD/);
});

test("scoped calendar items require an explicit target", async () => {
  const pool=fakePool(); const service=new OperationsCalendarService(async()=>pool as any);
  await assert.rejects(()=>service.createHoliday({name:"Batch holiday",holiday_date:"2026-10-01",applicable_to:"Selected Batches",applicable_batch_ids:[]},"Admin"),/at least one batch/);
  await assert.rejects(()=>service.createEvent({title:"Category event",event_date:"2026-10-02",applicable_to:"Selected Categories",applicable_plan_categories:[]},"Admin"),/membership category/);
});
