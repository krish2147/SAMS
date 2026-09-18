import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {BatchAssignmentService,BatchAssignmentError,BATCH_OCCUPANCY_SQL,reservesBatchSeat} from "./batch-assignment.service";

test("occupancy policy reserves pending, approved-unpaid, active and suspended members",()=>{
  assert.equal(reservesBatchSeat({registration_status:"Pending",payment_status:"Pending",membership_status:"Inactive"}),true);
  assert.equal(reservesBatchSeat({registration_status:"Approved",payment_status:"Pending",membership_status:"Inactive"}),true);
  assert.equal(reservesBatchSeat({registration_status:"Approved",payment_status:"Paid",membership_status:"Active"}),true);
  assert.equal(reservesBatchSeat({registration_status:"Approved",payment_status:"Paid",membership_status:"Suspended"}),true);
  assert.equal(reservesBatchSeat({registration_status:"Rejected",payment_status:"Pending",membership_status:"Inactive"}),false);
  assert.equal(reservesBatchSeat({registration_status:"Approved",payment_status:"Paid",membership_status:"Expired"}),false);
  assert.equal(reservesBatchSeat({registration_status:"Approved",payment_status:"Paid",membership_status:"Inactive"}),false);
  assert.match(BATCH_OCCUPANCY_SQL,/registration_status = 'Pending'/);
});

function registrationPool(batch:{id:number;academy_id:string;capacity:number;status:string},occupancy=0){
  let committed=false,rolledBack=false,created=0;
  const connection={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{},query:async(sql:string)=>{
    if(/FROM batches WHERE id/.test(sql))return[[batch],null];
    if(/reserved_count FROM members/.test(sql))return[[{reserved_count:occupancy}],null];
    return[[],null];
  }};
  return{service:new BatchAssignmentService((async()=>({getConnection:async()=>connection})) as any),create:async()=>({id:++created}),state:()=>({committed,rolledBack,created})};
}

test("valid OPEN batch registration reserves and commits",async()=>{const harness=registrationPool({id:1,academy_id:"swim",capacity:2,status:"OPEN"});const result=await harness.service.registerWithReservedSeat(1,"swim",harness.create);assert.equal(result.id,1);assert.equal(harness.state().committed,true);});
test("CLOSED and FULL batch registrations return structured conflicts",async()=>{
  const closed=registrationPool({id:1,academy_id:"swim",capacity:2,status:"CLOSED"});await assert.rejects(()=>closed.service.registerWithReservedSeat(1,"swim",closed.create),(error:any)=>error.code==="BATCH_CLOSED"&&error.status===409);
  const full=registrationPool({id:1,academy_id:"swim",capacity:1,status:"OPEN"},1);await assert.rejects(()=>full.service.registerWithReservedSeat(1,"swim",full.create),(error:any)=>error.code==="BATCH_FULL"&&error.status===409);
});

test("two concurrent registrations cannot reserve one final seat under the batch-row lock",async()=>{
  let occupied=0;let locked=false;const waiters:(()=>void)[]=[];
  const acquire=async()=>{if(!locked){locked=true;return;}await new Promise<void>(resolve=>waiters.push(resolve));locked=true;};
  const release=()=>{locked=false;waiters.shift()?.();};
  const pool={getConnection:async()=>{let holds=false;return{beginTransaction:async()=>{},release:()=>{},rollback:async()=>{if(holds){holds=false;release();}},commit:async()=>{if(holds){holds=false;release();}},query:async(sql:string)=>{if(/FROM batches WHERE id/.test(sql)){await acquire();holds=true;return[[{id:1,academy_id:"swim",capacity:1,status:"OPEN"}],null];}if(/reserved_count FROM members/.test(sql))return[[{reserved_count:occupied}],null];return[[],null];}};}};
  const service=new BatchAssignmentService((async()=>pool) as any);
  const results=await Promise.allSettled([service.registerWithReservedSeat(1,"swim",async()=>{occupied++;return 1;}),service.registerWithReservedSeat(1,"swim",async()=>{occupied++;return 2;})]);
  assert.equal(results.filter(result=>result.status==="fulfilled").length,1);assert.equal(results.filter(result=>result.status==="rejected"&&(result.reason as any).code==="BATCH_FULL").length,1);assert.equal(occupied,1);
});

test("eligible batch query is bounded and excludes CLOSED and FULL batches",async()=>{
  let sql="";const pool={query:async(query:string)=>{sql=query;return[[{id:2,batch_name:"Open",start_time:"07:00",end_time:"08:00",capacity:10,reserved_count:4}],null];}};
  const rows=await new BatchAssignmentService((async()=>pool) as any).listRegistrationBatches("swim");
  assert.match(sql,/b\.status = 'OPEN'/);assert.match(sql,/HAVING reserved_count < b\.capacity/);assert.match(sql,/LIMIT 100/);assert.equal(rows[0].availableSeats,6);
  assert.deepEqual(Object.keys(rows[0]).sort(),["availableSeats","batchName","capacity","endTime","id","reservedCount","startTime"].sort());
});

function movePool(options:{memberAcademy?:string;targetAcademy?:string;targetStatus?:string;reserved?:number;capacity?:number;current?:number|null}={}){
  let updated=false,committed=false;const member={id:42,membershipNo:"BSF-42",fullName:"Move Member",academyId:options.memberAcademy||"swim",selected_batch_id:options.current===undefined?1:options.current};
  const source={id:1,academy_id:"swim",batch_name:"Source",capacity:30,status:"OPEN"};const target={id:2,academy_id:options.targetAcademy||"swim",batch_name:"Target",capacity:options.capacity||10,status:options.targetStatus||"OPEN"};
  const conn={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{},release:()=>{},query:async(sql:string)=>{if(/FROM members WHERE membershipNo/.test(sql))return[[member],null];if(/FROM batches WHERE id IN/.test(sql))return[[source,target],null];if(/reserved_count FROM members/.test(sql))return[[{reserved_count:options.reserved||0}],null];if(/UPDATE members SET selected_batch_id/.test(sql)){updated=true;member.selected_batch_id=2;return[{affectedRows:1},null];}return[[],null];}};
  return{service:new BatchAssignmentService((async()=>({getConnection:async()=>conn})) as any),state:()=>({updated,committed,member})};
}

test("admin move atomically releases source and reserves target",async()=>{const harness=movePool();const result=await harness.service.moveMember("BSF-42",2,"swim");assert.equal(result.sourceBatchId,1);assert.equal(result.targetBatchId,2);assert.equal(harness.state().updated,true);assert.equal(harness.state().committed,true);});
test("move rejects FULL and CLOSED targets",async()=>{await assert.rejects(()=>movePool({reserved:10,capacity:10}).service.moveMember("BSF-42",2,"swim"),(error:any)=>error.code==="BATCH_FULL");await assert.rejects(()=>movePool({targetStatus:"CLOSED"}).service.moveMember("BSF-42",2,"swim"),(error:any)=>error.code==="BATCH_CLOSED");});
test("cross-academy member or target is rejected and same-batch move is a no-op",async()=>{const foreign=movePool({memberAcademy:"cricket"});await assert.rejects(()=>foreign.service.moveMember("BSF-42",2,"swim"),(error:any)=>error.code==="MEMBER_ACADEMY_FORBIDDEN");assert.equal(foreign.state().updated,false);const foreignTarget=movePool({targetAcademy:"cricket"});await assert.rejects(()=>foreignTarget.service.moveMember("BSF-42",2,"swim"),(error:any)=>error.code==="BATCH_ACADEMY_FORBIDDEN");assert.equal(foreignTarget.state().updated,false);const same=movePool({current:2});const result=await same.service.moveMember("BSF-42",2,"swim");assert.equal(result.noOp,true);assert.equal(same.state().updated,false);});

test("payment activation keeps the same single reservation",()=>{const member:any={id:1,selected_batch_id:2,registration_status:"Pending",payment_status:"Pending",membership_status:"Inactive"};assert.equal([member].filter(reservesBatchSeat).length,1);Object.assign(member,{registration_status:"Approved",payment_status:"Paid",membership_status:"Active"});assert.equal([member].filter(reservesBatchSeat).length,1);});

test("registration submits numeric selected_batch_id and legacy guessing fails closed",()=>{
  const registration=readFileSync(new URL("../components/RegisterPage.tsx",import.meta.url),"utf8");const repository=readFileSync(new URL("../repositories/batch.repository.ts",import.meta.url),"utf8");
  assert.match(registration,/formData\.append\("selected_batch_id", form\.selectedBatchId\)/);assert.doesNotMatch(registration,/formData\.append\("batch"/);assert.doesNotMatch(registration,/BATCH_CATEGORIES/);
  assert.match(registration,/if \(!form\.photoFile\)/);assert.match(registration,/formData\.append\("photo", form\.photoFile\)/);assert.doesNotMatch(registration,/className="hidden space-y-3"/);
  const legacy=repository.slice(repository.indexOf("async findByNameOrTime"),repository.indexOf("async updateStrengthAndStatus"));assert.doesNotMatch(legacy,/LIKE|SELECT \* FROM batches LIMIT 1|Fallback to first/);assert.match(legacy,/rows\?\.length === 1/);
});

test("assignment UI refreshes member and batch state once with listener cleanup",()=>{const source=readFileSync(new URL("../components/MembersDirectory.tsx",import.meta.url),"utf8");const batches=readFileSync(new URL("../components/BatchManagementTab.tsx",import.meta.url),"utf8");assert.match(source,/sams_batch_assignment_changed/);assert.match(source,/setRefreshKey\(key=>key\+1\)/);assert.match(batches,/addEventListener\("sams_batch_assignment_changed",refresh\)/);assert.match(batches,/removeEventListener\("sams_batch_assignment_changed",refresh\)/);assert.match(batches,/getSessionTokenRef\.current\(\)/);assert.match(batches,/useCallback\(async\(\)=>.*?\/api\/admin\/batches\/operations.*?,\[\]\)/s);assert.doesNotMatch(batches,/fetch\("\/api\/members/);});
