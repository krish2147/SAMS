import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BatchController } from "../controllers/batch.controller";
import { BatchRepository } from "../repositories/batch.repository";
import { BatchService } from "./batch.service";
import { BatchOperationError, findBatchConflicts, normalizeBatchTime, validateBatchInput } from "../utils/batch-operations";

const valid = { batchName:"Morning Operations", startTime:"06:00", endTime:"07:00", capacity:30, status:"OPEN" };

test("valid creation uses authenticated academy and ignores ownership/current strength input", async () => {
  let received:any;
  const service = new BatchService({ createOperational:async(academyId:string,input:any) => {
    received={academyId,input}; return {id:20,...input,activeMemberCount:0,availableSeats:input.capacity};
  }} as any);
  const result=await service.createBatch("swim",{...valid,academyId:"cricket",academy_id:"cricket",current_strength:900});
  assert.equal(received.academyId,"swim");
  assert.equal("academyId" in received.input,false);
  assert.equal("academy_id" in received.input,false);
  assert.equal("current_strength" in received.input,false);
  assert.equal(result.id,20);
});

test("controller derives create academy from session rather than request body",async()=>{
  let academy="";
  const controller=new BatchController();
  (controller as any).batchService={createBatch:async(value:string)=>{academy=value;return{id:1};}};
  let status=0;let payload:any;
  const response={status(code:number){status=code;return this;},json(value:any){payload=value;return this;}};
  await controller.create({user:{academyId:"swim"},body:{academyId:"cricket"}} as any,response as any);
  assert.equal(academy,"swim");assert.equal(status,201);assert.equal(payload.success,true);
});

test("canonical time normalization supports legacy stored values",()=>{
  assert.equal(normalizeBatchTime("06:00 AM"),"06:00");
  assert.equal(normalizeBatchTime("6:30 PM"),"18:30");
  assert.equal(normalizeBatchTime("18:30:00"),"18:30");
  assert.throws(()=>normalizeBatchTime("6ish"),(error:any)=>error.code==="INVALID_BATCH_TIME");
});

test("invalid capacity, time range and status are rejected",()=>{
  for(const [change,code] of [[{capacity:0},"INVALID_BATCH_CAPACITY"],[{capacity:2.5},"INVALID_BATCH_CAPACITY"],[{startTime:"08:00",endTime:"07:00"},"INVALID_TIME_RANGE"],[{status:"PAUSED"},"INVALID_BATCH_STATUS"]] as const){
    assert.throws(()=>validateBatchInput({...valid,...change}),(error:any)=>error instanceof BatchOperationError&&error.code===code);
  }
});

test("exact duplicates block while overlap is separately detectable",()=>{
  const rows=[{id:1,batch_name:"Morning Operations",start_time:"06:00 AM",end_time:"07:00 AM"},{id:2,batch_name:"Parallel Training",start_time:"06:30",end_time:"07:30"}];
  const duplicate=findBatchConflicts(rows,validateBatchInput(valid));
  assert.equal(duplicate.duplicate?.id,1);
  const overlap=findBatchConflicts(rows,validateBatchInput({...valid,batchName:"New Batch",startTime:"06:45",endTime:"07:15"}));
  assert.deepEqual(overlap.overlaps.map(row=>row.id),[1,2]);
});

function repositoryHarness(options:{academy?:string;active?:number;assigned?:number}={}){
  const target={id:7,academy_id:options.academy||"swim",batch_name:"Existing",start_time:"10:00",end_time:"11:00",capacity:30,status:"OPEN"};
  const queries:string[]=[];let committed=false;let rolledBack=false;let deleted=false;
  const connection={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{},query:async(sql:string)=>{
    queries.push(sql);
    if(/SELECT \* FROM batches WHERE id/.test(sql))return[[target],null];
    if(/SELECT id, academy_id/.test(sql))return[[target],null];
    if(/AS active_count/.test(sql))return[[{active_count:options.active||0}],null];
    if(/AS assigned_count/.test(sql))return[[{assigned_count:options.assigned||0}],null];
    if(/UPDATE batches SET batch_name/.test(sql))return[{affectedRows:1},null];
    if(/DELETE FROM batches/.test(sql)){deleted=true;return[{affectedRows:1},null];}
    return[[],null];
  }};
  const repository=new BatchRepository((async()=>({getConnection:async()=>connection})) as any);
  return{repository,queries,state:()=>({committed,rolledBack,deleted})};
}

test("valid edit preserves explicit OPEN status even when batch is full",async()=>{
  const harness=repositoryHarness({active:30});
  const result=await harness.repository.updateOperational(7,"swim",validateBatchInput({...valid,batchName:"Existing",startTime:"10:00",endTime:"11:00",status:"OPEN"}));
  assert.equal(result.status,"OPEN");assert.equal(result.availableSeats,0);assert.equal(harness.state().committed,true);
});

test("legacy strength synchronization cannot overwrite operational status",()=>{
  const source=readFileSync(new URL("../repositories/batch.repository.ts",import.meta.url),"utf8");
  const helper=source.slice(source.indexOf("async updateStrengthAndStatus"),source.indexOf("async getAll"));
  assert.doesNotMatch(helper,/SET current_strength = \?, status = \?/);
  assert.match(helper,/operational status unchanged/);
});

test("capacity cannot be reduced below authoritative active count",async()=>{
  const harness=repositoryHarness({active:18});
  await assert.rejects(()=>harness.repository.updateOperational(7,"swim",validateBatchInput({...valid,batchName:"Existing",startTime:"10:00",endTime:"11:00",capacity:15})),(error:any)=>error.code==="CAPACITY_BELOW_ACTIVE_MEMBERS"&&/18 active members/.test(error.message));
  assert.equal(harness.state().rolledBack,true);
});

test("delete rejects any assigned member and succeeds with zero assignments",async()=>{
  const blocked=repositoryHarness({assigned:12});
  await assert.rejects(()=>blocked.repository.deleteOperational(7,"swim"),(error:any)=>error.code==="BATCH_HAS_ASSIGNED_MEMBERS"&&/12 members/.test(error.message));
  assert.equal(blocked.state().deleted,false);
  const empty=repositoryHarness({assigned:0});await empty.repository.deleteOperational(7,"swim");
  assert.equal(empty.state().deleted,true);assert.equal(empty.state().committed,true);
});

test("another academy cannot edit or delete a batch",async()=>{
  const edit=repositoryHarness({academy:"cricket"});
  await assert.rejects(()=>edit.repository.updateOperational(7,"swim",validateBatchInput({...valid,batchName:"Existing",startTime:"10:00",endTime:"11:00"})),(error:any)=>error.code==="BATCH_ACADEMY_FORBIDDEN");
  const remove=repositoryHarness({academy:"cricket"});
  await assert.rejects(()=>remove.repository.deleteOperational(7,"swim"),(error:any)=>error.code==="BATCH_ACADEMY_FORBIDDEN");
});

test("frontend sends only canonical editable fields and requires strong delete confirmation",()=>{
  const source=readFileSync(new URL("../components/BatchManagementTab.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/current_strength|academy_id|academyId/);
  assert.match(source,/confirmation!=="DELETE"/);
  assert.match(source,/confirmOverlap:Boolean\(overlapWarning\)/);
});
