import { getDbPool } from "../config/db";

export const BATCH_OCCUPANCY_SQL = `(m.deleted_at IS NULL AND (m.registration_status = 'Pending' OR (
  m.registration_status = 'Approved' AND (
    m.payment_status IN ('Pending', 'Failed') OR m.membership_status IN ('Active', 'Suspended')
  )
)))`;

export function reservesBatchSeat(member:any):boolean{
  return !member?.deleted_at&&(member?.registration_status==="Pending"||(member?.registration_status==="Approved"&&(
    ["Pending","Failed"].includes(member?.payment_status)||["Active","Suspended"].includes(member?.membership_status)
  )));
}

export class BatchAssignmentError extends Error {
  constructor(message:string,public status:number,public code:string){super(message);this.name="BatchAssignmentError";}
}

export function publicRegistrationAcademyId():string {
  return String(process.env.PUBLIC_REGISTRATION_ACADEMY_ID || "swim").trim() || "swim";
}

export class BatchAssignmentService {
  constructor(private poolProvider:typeof getDbPool=getDbPool){}

  async listRegistrationBatches(academyId=publicRegistrationAcademyId()){
    const pool=await this.poolProvider();
    const [rows]:any=await pool.query(`
      SELECT b.id, b.batch_name, b.start_time, b.end_time, b.capacity,
        SUM(CASE WHEN ${BATCH_OCCUPANCY_SQL} THEN 1 ELSE 0 END) AS reserved_count
      FROM batches b
      LEFT JOIN members m ON m.selected_batch_id = b.id
      WHERE b.academy_id = ? AND b.status = 'OPEN'
      GROUP BY b.id, b.batch_name, b.start_time, b.end_time, b.capacity
      HAVING reserved_count < b.capacity
      ORDER BY b.start_time ASC, b.id ASC
      LIMIT 100`,[academyId]);
    return rows.map((row:any)=>{
      const capacity=Math.max(0,Number(row.capacity)||0);const reservedCount=Math.max(0,Number(row.reserved_count)||0);
      return{id:Number(row.id),batchName:String(row.batch_name),startTime:String(row.start_time),endTime:String(row.end_time),capacity,reservedCount,availableSeats:Math.max(capacity-reservedCount,0)};
    });
  }

  private async occupancy(conn:any,batchId:number):Promise<number>{
    const [rows]:any=await conn.query(`SELECT COUNT(*) AS reserved_count FROM members m WHERE m.selected_batch_id = ? AND ${BATCH_OCCUPANCY_SQL}`,[batchId]);
    return Number(rows[0]?.reserved_count||0);
  }

  async registerWithReservedSeat<T>(batchId:number,academyId:string,createMember:(connection:any)=>Promise<T>):Promise<T>{
    if(!Number.isInteger(batchId)||batchId<=0)throw new BatchAssignmentError("A valid numeric batch selection is required.",400,"INVALID_BATCH_ID");
    const pool=await this.poolProvider();const conn=await pool.getConnection();const lock=" FOR UPDATE";
    try{
      await conn.beginTransaction();
      const [rows]:any=await conn.query(`SELECT id, academy_id, batch_name, capacity, status FROM batches WHERE id = ?${lock}`,[batchId]);
      const batch=rows[0];
      if(!batch||String(batch.academy_id)!==academyId)throw new BatchAssignmentError("The selected batch is not available for this academy.",409,"BATCH_UNAVAILABLE");
      if(batch.status!=="OPEN")throw new BatchAssignmentError("This batch is no longer accepting registrations. Please choose another batch.",409,"BATCH_CLOSED");
      const reserved=await this.occupancy(conn,batchId);
      if(reserved>=Number(batch.capacity))throw new BatchAssignmentError("This batch has just become full. Please choose another available batch.",409,"BATCH_FULL");
      const result=await createMember(conn);await conn.commit();return result;
    }catch(error){await conn.rollback();throw error;}finally{conn.release();}
  }

  async moveMember(membershipNo:string,targetBatchId:number,academyId:string){
    if(!Number.isInteger(targetBatchId)||targetBatchId<=0)throw new BatchAssignmentError("A valid numeric target batch is required.",400,"INVALID_BATCH_ID");
    const pool=await this.poolProvider();const conn=await pool.getConnection();const lock=" FOR UPDATE";
    try{
      await conn.beginTransaction();
      const [memberRows]:any=await conn.query(`SELECT id, membershipNo, fullName, academyId, selected_batch_id FROM members WHERE membershipNo = ? AND deleted_at IS NULL${lock}`,[membershipNo]);
      const member=memberRows[0];
      if(!member)throw new BatchAssignmentError("Member not found.",404,"MEMBER_NOT_FOUND");
      if(String(member.academyId)!==academyId)throw new BatchAssignmentError("You cannot move a member from another academy.",403,"MEMBER_ACADEMY_FORBIDDEN");
      const sourceBatchId=member.selected_batch_id?Number(member.selected_batch_id):null;
      if(sourceBatchId===targetBatchId){await conn.commit();return{memberId:Number(member.id),membershipNo,sourceBatchId,targetBatchId,noOp:true};}
      const ids=[...new Set([sourceBatchId,targetBatchId].filter(Boolean) as number[])].sort((a,b)=>a-b);
      const placeholders=ids.map(()=>"?").join(",");
      const [batchRows]:any=await conn.query(`SELECT id, academy_id, batch_name, capacity, status FROM batches WHERE id IN (${placeholders}) ORDER BY id${lock}`,ids);
      const target=batchRows.find((batch:any)=>Number(batch.id)===targetBatchId);
      if(!target||String(target.academy_id)!==academyId)throw new BatchAssignmentError("The target batch is not available for this academy.",403,"BATCH_ACADEMY_FORBIDDEN");
      if(target.status!=="OPEN")throw new BatchAssignmentError("The target batch is closed.",409,"BATCH_CLOSED");
      const reserved=await this.occupancy(conn,targetBatchId);
      if(reserved>=Number(target.capacity))throw new BatchAssignmentError("The target batch is full.",409,"BATCH_FULL");
      await conn.query("UPDATE members SET selected_batch_id = ? WHERE id = ? AND academyId = ?",[targetBatchId,member.id,academyId]);
      await conn.commit();
      return{memberId:Number(member.id),membershipNo,memberName:member.fullName,sourceBatchId,targetBatchId,targetBatchName:target.batch_name,noOp:false};
    }catch(error){await conn.rollback();throw error;}finally{conn.release();}
  }
}
