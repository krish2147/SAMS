import { getDbPool } from "../config/db";

export type ArchiveMemberActor = {
  userId: string;
  name: string;
  role: string;
  academyId: string;
};

export type ArchivedMemberResult = {
  memberId: number;
  membershipNo: string;
  memberName: string;
  academyId: string;
  releasedBatchId: number | null;
  previousMembershipStatus: string;
  action: "MEMBER_ARCHIVED";
};

export type ArchiveMemberOptions = {
  acknowledgeActiveMembership?: boolean;
};

export class MemberDeletionError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
    this.name = "MemberDeletionError";
  }
}

export class MemberDeletionService {
  constructor(private readonly poolProvider: typeof getDbPool = getDbPool) {}

  async archiveMember(membershipNo: string, actor: ArchiveMemberActor, options: ArchiveMemberOptions = {}): Promise<ArchivedMemberResult> {
    const pool = await this.poolProvider();
    const conn = await pool.getConnection();
    const lock = " FOR UPDATE";
    try {
      await conn.beginTransaction();
      // The route middleware is the first authorization boundary. Keep this
      // check inside the transaction as a defense for non-HTTP callers too.
      if (!["admin", "super_admin"].includes(String(actor.role))) {
        throw new MemberDeletionError("You are not authorized to delete members.", 403, "FORBIDDEN");
      }
      const [memberRows]: any = await conn.query(
        `SELECT id, membershipNo, fullName, academyId, registration_status, payment_status,
          membership_status, membership_end_date, selected_batch_id, deleted_at
         FROM members WHERE membershipNo = ? AND deleted_at IS NULL${lock}`,
        [membershipNo]
      );
      const member = memberRows?.[0];
      if (!member) {
        throw new MemberDeletionError("Member not found.", 404, "MEMBER_NOT_FOUND");
      }
      if (String(member.academyId) !== String(actor.academyId)) {
        throw new MemberDeletionError("You cannot delete a member from another academy.", 403, "CROSS_ACADEMY");
      }
      const previousMembershipStatus = String(member.membership_status || "Inactive");
      const activeMembershipRemoved = previousMembershipStatus.toLowerCase() === "active";
      if (activeMembershipRemoved && options.acknowledgeActiveMembership !== true) {
        throw new MemberDeletionError(
          "Acknowledge that this member currently has an active membership before deleting them.",
          400,
          "ACTIVE_DELETE_ACKNOWLEDGEMENT_REQUIRED"
        );
      }

      const [archiveResult]: any = await conn.query(
        `UPDATE members
         SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, login_enabled = 0, selected_batch_id = NULL
         WHERE id = ? AND deleted_at IS NULL`,
        [actor.userId, member.id]
      );
      if (Number(archiveResult?.affectedRows || 0) !== 1) {
        throw new MemberDeletionError("Member not found.", 404, "MEMBER_NOT_FOUND");
      }

      await conn.query(
        "UPDATE member_batches SET removed_at = CURRENT_TIMESTAMP WHERE member_id = ? AND removed_at IS NULL",
        [member.id]
      );
      await conn.query("DELETE FROM otp_login_challenges WHERE member_id = ?", [member.id]);
      await conn.query("DELETE FROM user_sessions WHERE user_id = ?", [`usr_member_${member.id}`]);
      await conn.query(
        "INSERT INTO activities (userName, action, status, performedBy) VALUES (?, ?, ?, ?)",
        [
          member.fullName,
          `MEMBER_ARCHIVED membershipNo=${member.membershipNo} previousMembershipStatus=${previousMembershipStatus} activeMembershipAdministrativelyRemoved=${activeMembershipRemoved}`,
          "Archived",
          actor.name
        ]
      );
      await conn.commit();
      return {
        memberId: Number(member.id),
        membershipNo: String(member.membershipNo),
        memberName: String(member.fullName),
        academyId: String(member.academyId),
        releasedBatchId: member.selected_batch_id ? Number(member.selected_batch_id) : null,
        previousMembershipStatus,
        action: "MEMBER_ARCHIVED"
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
