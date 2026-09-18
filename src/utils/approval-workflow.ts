export const REJECTION_TEAR_DURATION_MS=650;
export const REJECTION_REDUCED_MOTION_DURATION_MS=220;

export function rejectionExitMotion(reducedMotion:boolean,side:"left"|"right"){
  if(reducedMotion)return{duration:REJECTION_REDUCED_MOTION_DURATION_MS/1000,animate:{opacity:0,scale:.97,y:8}};
  return{duration:REJECTION_TEAR_DURATION_MS/1000,animate:{opacity:0,x:side==="left"?-28:28,y:25,rotate:side==="left"?-6:6}};
}

export function apiErrorMessage(payload:any,fallback:string){
  return String(payload?.error?.message||payload?.error||payload?.message||fallback);
}

export function assertRejectedResponse(payload:any){
  if(!payload?.success||payload?.status!=="Rejected")throw new Error(apiErrorMessage(payload,"Rejection was not confirmed by the server."));
  return payload;
}

export function canPermanentlyDeleteApplication(status:string|undefined,role:string){
  return status==="Rejected"&&(role==="admin"||role==="super_admin");
}

export function commitRejectedApplication<T extends {membershipNo:string}>(members:T[],membershipNo:string,rejected:Partial<T>){
  return members.map(member=>member.membershipNo===membershipNo?{...member,...rejected}:member);
}

export function statusCountsFor(members:any[],academyId:string){
  const counts={Pending:0,Approved:0,Rejected:0};
  for(const member of members||[]){
    if(String(member.academyId||academyId||"swim").toLowerCase()!==String(academyId||"swim").toLowerCase())continue;
    let status=member.registration_status||member.status||"Pending";
    if(status==="Pending Approval")status="Pending";
    if(status in counts)counts[status as keyof typeof counts]++;
  }
  return counts;
}
